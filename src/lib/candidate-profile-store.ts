import { getSupabaseAdmin } from "@/lib/supabase-server";

const BUCKET = "candidate-profiles";
const PROFILE_FILE = "profile.json";
export const MAX_CV_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_CANDIDATE_TEXT_LENGTH = 50_000;

let bucketReady = false;

export type StoredCandidateProfile = {
  version: 1;
  fileName: string;
  fileType: string;
  fileSize: number;
  sourcePath: string;
  text: string;
  updatedAt: string;
};

function profilePath(userId: string) {
  return `${userId}/${PROFILE_FILE}`;
}

export function safeCandidateFileName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "cv";
}

export async function ensureCandidateProfileBucket() {
  if (bucketReady) return;
  const admin = getSupabaseAdmin();
  const { data, error: readError } = await admin.storage.getBucket(BUCKET);
  if (readError && !readError.message.toLowerCase().includes("not found")) throw readError;
  if (!data) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_CV_FILE_SIZE,
      allowedMimeTypes: ["application/pdf", "text/plain", "application/json"],
    });
    if (error && !error.message.toLowerCase().includes("already exists")) throw error;
  }
  bucketReady = true;
}

export async function readCandidateProfile(userId: string) {
  await ensureCandidateProfileBucket();
  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET).download(profilePath(userId));
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("not found") || message.includes("does not exist")) return null;
    throw error;
  }

  const parsed = JSON.parse(await data.text()) as Partial<StoredCandidateProfile>;
  if (
    parsed.version !== 1 ||
    typeof parsed.fileName !== "string" ||
    typeof parsed.fileType !== "string" ||
    typeof parsed.fileSize !== "number" ||
    typeof parsed.sourcePath !== "string" ||
    typeof parsed.text !== "string" ||
    typeof parsed.updatedAt !== "string"
  ) {
    throw new Error("The saved candidate profile is invalid.");
  }
  return parsed as StoredCandidateProfile;
}

async function writeProfile(userId: string, profile: StoredCandidateProfile) {
  const payload = Buffer.from(JSON.stringify(profile), "utf8");
  const { error } = await getSupabaseAdmin().storage.from(BUCKET).upload(profilePath(userId), payload, {
    contentType: "application/json; charset=utf-8",
    cacheControl: "no-cache",
    upsert: true,
  });
  if (error) throw error;
}

export async function saveUploadedCandidateProfile(args: {
  userId: string;
  fileName: string;
  fileType: string;
  bytes: Buffer;
  text: string;
}) {
  await ensureCandidateProfileBucket();
  const previous = await readCandidateProfile(args.userId);
  const sourcePath = `${args.userId}/source/${Date.now()}-${safeCandidateFileName(args.fileName)}`;
  const storage = getSupabaseAdmin().storage.from(BUCKET);
  const { error: uploadError } = await storage.upload(sourcePath, args.bytes, {
    contentType: args.fileType,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const profile: StoredCandidateProfile = {
    version: 1,
    fileName: args.fileName,
    fileType: args.fileType,
    fileSize: args.bytes.length,
    sourcePath,
    text: args.text,
    updatedAt: new Date().toISOString(),
  };

  try {
    await writeProfile(args.userId, profile);
  } catch (error) {
    await storage.remove([sourcePath]);
    throw error;
  }

  if (previous?.sourcePath && previous.sourcePath.startsWith(`${args.userId}/source/`)) {
    await storage.remove([previous.sourcePath]);
  }
  return profile;
}

export async function updateCandidateProfileText(userId: string, text: string) {
  const profile = await readCandidateProfile(userId);
  if (!profile) return null;
  const updated: StoredCandidateProfile = { ...profile, text, updatedAt: new Date().toISOString() };
  await writeProfile(userId, updated);
  return updated;
}

export function publicCandidateProfile(profile: StoredCandidateProfile | null) {
  if (!profile) return null;
  const { sourcePath: _sourcePath, ...safeProfile } = profile;
  return safeProfile;
}
