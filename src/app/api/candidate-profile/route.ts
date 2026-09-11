import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { z } from "zod";

import {
  MAX_CANDIDATE_TEXT_LENGTH,
  MAX_CV_FILE_SIZE,
  publicCandidateProfile,
  readCandidateProfile,
  saveUploadedCandidateProfile,
  updateCandidateProfileText,
} from "@/lib/candidate-profile-store";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const acceptedTypes = new Set(["application/pdf", "text/plain"]);
const updateSchema = z.object({
  text: z.string().trim().min(80).max(MAX_CANDIDATE_TEXT_LENGTH),
});

async function requireUser(request: Request) {
  const { user, error } = await getUserFromRequest(request);
  if (!user) return { user: null, response: NextResponse.json({ error }, { status: 401 }) };
  return { user, response: null };
}

function normalizeCvText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CANDIDATE_TEXT_LENGTH);
}

async function extractCvText(file: File, bytes: Buffer) {
  if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
    return normalizeCvText(bytes.toString("utf8"));
  }
  const result = await extractText(new Uint8Array(bytes), { mergePages: true });
  return normalizeCvText(result.text);
}

export async function GET(request: Request) {
  const { user, response } = await requireUser(request);
  if (response) return response;
  try {
    return NextResponse.json({ profile: publicCandidateProfile(await readCandidateProfile(user.id)) });
  } catch (error) {
    console.error("Candidate profile read failed", error);
    return NextResponse.json({ error: "The saved candidate CV could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (response) return response;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CV file first." }, { status: 400 });
  if (file.size > MAX_CV_FILE_SIZE) {
    return NextResponse.json({ error: "CV file must be 10 MB or smaller." }, { status: 400 });
  }
  const lowerName = file.name.toLowerCase();
  const fileType = file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : lowerName.endsWith(".txt") ? "text/plain" : "");
  if (!acceptedTypes.has(fileType)) {
    return NextResponse.json({ error: "Upload a PDF or plain-text CV." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const text = await extractCvText(file, bytes);
    if (text.length < 80) {
      return NextResponse.json(
        { error: "Very little text could be extracted. Use a text-based PDF or paste the CV text manually." },
        { status: 400 },
      );
    }
    const profile = await saveUploadedCandidateProfile({
      userId: user.id,
      fileName: file.name,
      fileType,
      bytes,
      text,
    });
    return NextResponse.json({ profile: publicCandidateProfile(profile) });
  } catch (error) {
    console.error("Candidate CV upload failed", error);
    return NextResponse.json({ error: "The CV could not be extracted or saved." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, response } = await requireUser(request);
  if (response) return response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Candidate profile text must be between 80 and 50,000 characters." }, { status: 400 });
  }
  try {
    const profile = await updateCandidateProfileText(user.id, parsed.data.text);
    if (!profile) return NextResponse.json({ error: "Upload a CV before editing the profile." }, { status: 404 });
    return NextResponse.json({ profile: publicCandidateProfile(profile) });
  } catch (error) {
    console.error("Candidate profile update failed", error);
    return NextResponse.json({ error: "The candidate profile could not be updated." }, { status: 500 });
  }
}
