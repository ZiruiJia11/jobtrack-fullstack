import { openai } from "@ai-sdk/openai";
import { Output, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";

import { assessRequirements, retrieveEvidence } from "./candidate-profile";

export const jobMatchReportSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  recommendation: z.enum(["strong_apply", "apply", "stretch", "skip"]),
  summary: z.string().min(1),
  strengths: z
    .array(
      z.object({
        requirement: z.string(),
        evidence: z.string(),
      }),
    )
    .max(6),
  gaps: z
    .array(
      z.object({
        requirement: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        mitigation: z.string(),
      }),
    )
    .max(6),
  interviewQuestions: z.array(z.string()).min(2).max(5),
  nextActions: z.array(z.string()).min(2).max(5),
  coverLetterAngle: z.string().min(1),
});

export type JobMatchReport = z.infer<typeof jobMatchReportSchema>;

export const jobMatchAgent = new ToolLoopAgent({
  model: openai(process.env.OPENAI_MODEL || "gpt-5.6-luna"),
  instructions: `You are JobTrack's evidence-grounded job matching agent.

Your job is to compare one job description against Steven's verified CV evidence.

Rules:
- You MUST use retrieveCandidateEvidence first and assessRequirementGaps second.
- Never invent skills, dates, employers, achievements, metrics, citizenship, security clearances, or years of experience.
- Treat tool results as the only verified candidate evidence. If evidence is absent, state the gap.
- Separate direct evidence from reasonable transferability. Do not turn a partial match into an exact match.
- Weight must-have requirements, work eligibility, seniority and location constraints more heavily than nice-to-haves.
- A missing preferred skill is usually low or medium severity; a missing mandatory qualification is high.
- Give practical next actions that can be completed before applying or discussed honestly in interview.
- Keep every field concise and useful to a job applicant.`,
  tools: {
    retrieveCandidateEvidence: tool({
      description:
        "Retrieve verified CV and portfolio evidence relevant to the job's most important technologies, responsibilities and eligibility requirements.",
      inputSchema: z.object({
        queries: z
          .array(z.string().min(1))
          .min(3)
          .max(12)
          .describe("Important requirements or keywords extracted from the job description"),
      }),
      execute: async ({ queries }) => ({
        matches: retrieveEvidence(queries),
        note: "Only these records are verified candidate evidence.",
      }),
    }),
    assessRequirementGaps: tool({
      description:
        "Classify the job's key requirements as matched, partial or missing using only the verified candidate profile.",
      inputSchema: z.object({
        requirements: z
          .array(z.string().min(1))
          .min(3)
          .max(15)
          .describe("Distinct must-have and high-value preferred requirements from the job description"),
      }),
      execute: async ({ requirements }) => ({
        assessment: assessRequirements(requirements),
        note: "Partial means transferable evidence exists but the exact requirement is not verified.",
      }),
    }),
  },
  output: Output.object({ schema: jobMatchReportSchema }),
  stopWhen: isStepCount(4),
  prepareStep: async ({ stepNumber }) => {
    if (stepNumber === 0) {
      return {
        toolChoice: { type: "tool" as const, toolName: "retrieveCandidateEvidence" },
      };
    }
    if (stepNumber === 1) {
      return {
        toolChoice: { type: "tool" as const, toolName: "assessRequirementGaps" },
      };
    }
    return {};
  },
});
