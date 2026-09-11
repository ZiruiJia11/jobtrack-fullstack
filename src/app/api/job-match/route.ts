import { NextResponse } from "next/server";
import { z } from "zod";

import { jobMatchAgent } from "@/lib/agent/job-match-agent";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  company: z.string().trim().max(120).default("Unknown company"),
  role: z.string().trim().max(160).default("Unknown role"),
  jobDescription: z.string().trim().min(80).max(20_000),
});

export async function POST(request: Request) {
  const { user, error: authError } = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: authError || "Not authenticated" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI matching is not configured. Add OPENAI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a job description of at least 80 characters.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { company, role, jobDescription } = parsed.data;

  try {
    const result = await jobMatchAgent.generate({
      prompt: `Company: ${company || "Unknown company"}\nRole: ${role || "Unknown role"}\n\nJob description:\n${jobDescription}`,
    });

    const trace = result.steps.flatMap((step, stepIndex) =>
      step.toolCalls.map((call) => ({
        step: stepIndex + 1,
        tool: call.toolName,
        status: "completed",
      })),
    );

    return NextResponse.json({
      report: result.output,
      trace,
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    });
  } catch (error) {
    console.error("Job match agent failed", error);
    return NextResponse.json(
      { error: "The AI match agent could not complete this analysis. Please try again." },
      { status: 502 },
    );
  }
}
