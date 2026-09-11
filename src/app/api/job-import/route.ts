import { NextResponse } from "next/server";
import { z } from "zod";

import { importJobFromUrl, JobImportError } from "@/lib/job-import";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  url: z.string().trim().url().max(2_048),
});

export async function POST(request: Request) {
  const { user, error: authError } = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: authError || "Not authenticated" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid job URL, including https://." }, { status: 400 });
  }

  try {
    const job = await importJobFromUrl(parsed.data.url);
    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof JobImportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Job URL import failed", error);
    return NextResponse.json(
      { error: "The job page could not be imported. Paste the details manually and try again later." },
      { status: 502 },
    );
  }
}
