import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase-server";

const TABLE_NAME = "applications";

type ApplicationPayload = {
  id?: string;
  company?: string;
  role?: string;
  category?: string;
  status?: string;
  appliedDate?: string;
  followUpDate?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

function rowFromApplication(app: ApplicationPayload, userId: string) {
  return {
    id: app.id,
    user_id: userId,
    company: app.company || "",
    role: app.role || "",
    category: app.category || "Other",
    status: app.status || "Applied",
    applied_date: app.appliedDate || null,
    follow_up_date: app.followUpDate || null,
    payload: app,
    updated_at: app.updatedAt || new Date().toISOString(),
  };
}

async function requireUser(request: Request) {
  const { user, isAdmin, error } = await getUserFromRequest(request);
  if (!user) {
    return { user: null, isAdmin: false, response: NextResponse.json({ error }, { status: 401 }) };
  }
  return { user, isAdmin: Boolean(isAdmin), response: null };
}

function targetUserId(request: Request, signedInUserId: string, isAdmin: boolean) {
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get("userId");
  if (!requestedUserId || requestedUserId === signedInUserId) return { userId: signedInUserId, response: null };
  if (!isAdmin) {
    return { userId: signedInUserId, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { userId: requestedUserId, response: null };
}

export async function GET(request: Request) {
  const { user, isAdmin, response } = await requireUser(request);
  if (response) return response;
  const target = targetUserId(request, user.id, isAdmin);
  if (target.response) return target.response;

  const { data, error } = await getSupabaseAdmin()
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", target.userId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data || [], ownerUserId: target.userId });
}

export async function POST(request: Request) {
  const { user, isAdmin, response } = await requireUser(request);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const applications = Array.isArray(body?.applications) ? body.applications : [];
  if (applications.length === 0) return NextResponse.json({ saved: 0 });
  const requestedUserId = typeof body?.userId === "string" ? body.userId : user.id;
  if (requestedUserId !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const rows = applications.map((app: ApplicationPayload) => rowFromApplication(app, requestedUserId));
  const { error } = await getSupabaseAdmin().from(TABLE_NAME).upsert(rows, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ saved: rows.length });
}

export async function DELETE(request: Request) {
  const { user, isAdmin, response } = await requireUser(request);
  if (response) return response;
  const target = targetUserId(request, user.id, isAdmin);
  if (target.response) return target.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing application id" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from(TABLE_NAME).delete().eq("user_id", target.userId).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: id });
}
