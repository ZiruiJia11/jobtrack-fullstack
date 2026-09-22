import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase-server";

type UserSummary = {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  applicationCount: number;
};

async function requireAdmin(request: Request) {
  const { user, isAdmin, error } = await getUserFromRequest(request);
  if (!user) return { response: NextResponse.json({ error }, { status: 401 }) };
  if (!isAdmin) return { response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  return { response: null };
}

export async function GET(request: Request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  const { data: rows, error: applicationError } = await admin.from("applications").select("user_id");
  if (applicationError) return NextResponse.json({ error: applicationError.message }, { status: 500 });

  const counts = new Map<string, number>();
  (rows || []).forEach((row) => {
    counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
  });

  const users: UserSummary[] = (userData.users || []).map((user) => ({
    id: user.id,
    email: user.email || "No email",
    createdAt: user.created_at || null,
    lastSignInAt: user.last_sign_in_at || null,
    applicationCount: counts.get(user.id) || 0,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email || email,
      createdAt: data.user.created_at || null,
      lastSignInAt: data.user.last_sign_in_at || null,
      applicationCount: 0,
    },
  });
}
