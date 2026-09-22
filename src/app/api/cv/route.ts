import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase-server";

const BUCKET = "application-files";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

let bucketReady = false;

function safeFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "cv";
}

async function requireUser(request: Request) {
  const { user, isAdmin, error } = await getUserFromRequest(request);
  if (!user) {
    return { user: null, isAdmin: false, response: NextResponse.json({ error }, { status: 401 }) };
  }
  return { user, isAdmin: Boolean(isAdmin), response: null };
}

async function ensureBucket() {
  if (bucketReady) return;
  const admin = getSupabaseAdmin();
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
    });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw error;
    }
  }
  bucketReady = true;
}

function ownsPath(userId: string, path: string) {
  return path.startsWith(`${userId}/`);
}

function targetUserId(requestedUserId: string, signedInUserId: string, isAdmin: boolean) {
  if (!requestedUserId || requestedUserId === signedInUserId) return { userId: signedInUserId, response: null };
  if (!isAdmin) {
    return { userId: signedInUserId, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { userId: requestedUserId, response: null };
}

export async function POST(request: Request) {
  const { user, isAdmin, response } = await requireUser(request);
  if (response) return response;

  await ensureBucket();

  const form = await request.formData();
  const file = form.get("file");
  const appId = String(form.get("appId") || "");
  const previousPath = String(form.get("previousPath") || "");
  const target = targetUserId(String(form.get("userId") || ""), user.id, isAdmin);
  if (target.response) return target.response;

  if (!appId) return NextResponse.json({ error: "Missing application id" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing CV file" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "CV file must be 10 MB or smaller." }, { status: 400 });
  }

  const name = safeFileName(file.name);
  const path = `${target.userId}/${appId}/${Date.now()}-${name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (previousPath && ownsPath(target.userId, previousPath)) {
    await admin.storage.from(BUCKET).remove([previousPath]);
  }

  return NextResponse.json({
    cvFileName: file.name,
    cvFileType: file.type || "application/octet-stream",
    cvFileSize: file.size,
    cvStoragePath: path,
  });
}

export async function GET(request: Request) {
  const { user, isAdmin, response } = await requireUser(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "";
  const downloadName = safeFileName(searchParams.get("name") || "cv");
  const target = targetUserId(searchParams.get("userId") || "", user.id, isAdmin);
  if (target.response) return target.response;
  if (!path || !ownsPath(target.userId, path)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  await ensureBucket();
  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).createSignedUrl(path, 60, {
    download: downloadName,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ signedUrl: data.signedUrl });
}

export async function DELETE(request: Request) {
  const { user, isAdmin, response } = await requireUser(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") || "";
  const target = targetUserId(searchParams.get("userId") || "", user.id, isAdmin);
  if (target.response) return target.response;
  if (!path || !ownsPath(target.userId, path)) {
    return NextResponse.json({ deleted: false });
  }

  await ensureBucket();
  const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
