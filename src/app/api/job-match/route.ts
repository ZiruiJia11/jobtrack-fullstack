import { NextResponse } from "next/server";
import { APICallError, NoOutputGeneratedError, RetryError } from "ai";
import { z } from "zod";

import { createJobMatchAgent } from "@/lib/agent/job-match-agent";
import { readCandidateProfile } from "@/lib/candidate-profile-store";
import { getUserFromRequest } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  company: z.string().trim().max(120).default("Unknown company"),
  role: z.string().trim().max(160).default("Unknown role"),
  jobDescription: z.string().trim().min(80).max(20_000),
});

function getPublicMatchError(error: unknown) {
  if (RetryError.isInstance(error)) {
    return getPublicMatchError(error.lastError);
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401) {
      return { status: 503, message: "The saved OpenAI API key is invalid or no longer active." };
    }
    if (error.statusCode === 403 || error.statusCode === 404) {
      return { status: 503, message: "This OpenAI project cannot access the configured AI model." };
    }
    if (error.statusCode === 429) {
      const response = error.responseBody?.toLowerCase() || "";
      const isQuotaError = response.includes("quota") || response.includes("billing");
      return {
        status: 429,
        message: isQuotaError
          ? "The OpenAI API account has no available credit or has reached its spending limit."
          : "OpenAI is rate-limiting requests. Wait a moment and try again.",
      };
    }
    if (error.statusCode && error.statusCode >= 500) {
      return { status: 502, message: "OpenAI is temporarily unavailable. Please try again shortly." };
    }
  }

  if (NoOutputGeneratedError.isInstance(error)) {
    return { status: 502, message: "The AI response was incomplete. Please run the analysis again." };
  }

  return {
    status: 502,
    message: "The AI match agent could not complete this analysis. Check the server log for details.",
  };
}

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
    const candidateProfile = await readCandidateProfile(user.id);
    if (!candidateProfile?.text.trim()) {
      return NextResponse.json(
        { error: "Upload and save your candidate CV profile before running AI match analysis." },
        { status: 409 },
      );
    }
    const jobMatchAgent = createJobMatchAgent(candidateProfile.text);
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
      candidateProfile: {
        fileName: candidateProfile.fileName,
        updatedAt: candidateProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error("Job match agent failed", error);
    const publicError = getPublicMatchError(error);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status });
  }
}
