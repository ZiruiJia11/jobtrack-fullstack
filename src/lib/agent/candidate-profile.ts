export type CandidateEvidence = {
  id: string;
  area: string;
  evidence: string;
  keywords: string[];
};

export const candidateEvidence: CandidateEvidence[] = [
  {
    id: "ocular-full-stack",
    area: "Professional full-stack delivery",
    evidence:
      "Full Stack Developer at Ocular (Jul 2026-present), delivering production features with Vue 3, TypeScript, Inertia, PHP, Laravel and PostgreSQL.",
    keywords: [
      "full stack",
      "frontend",
      "backend",
      "vue",
      "typescript",
      "javascript",
      "php",
      "laravel",
      "postgresql",
      "sql",
      "inertia",
      "production",
    ],
  },
  {
    id: "ocular-integrations",
    area: "Backend systems and integrations",
    evidence:
      "At Ocular, implemented authentication, search, storage, email, documentation, queues and realtime integrations; uses Docker and Laravel Sail.",
    keywords: [
      "api",
      "integration",
      "authentication",
      "auth",
      "search",
      "storage",
      "email",
      "queue",
      "realtime",
      "docker",
      "backend",
    ],
  },
  {
    id: "fitquest",
    area: "Typed web application",
    evidence:
      "Built FitQuest using React, TypeScript and C# ASP.NET Core, demonstrating typed frontend/backend development and REST API work.",
    keywords: ["react", "typescript", "c#", "asp.net", ".net", "rest", "api", "full stack"],
  },
  {
    id: "jobtrack-agent",
    area: "Agentic AI and LLM engineering",
    evidence:
      "Built JobTrack's tool-using AI Match Agent with Next.js, TypeScript, OpenAI and the Vercel AI SDK. It retrieves grounded CV evidence, assesses requirement gaps, and returns schema-validated recommendations with a visible tool trace.",
    keywords: [
      "agent",
      "agentic",
      "llm",
      "openai",
      "ai sdk",
      "tool calling",
      "structured output",
      "next.js",
      "nextjs",
      "typescript",
      "generative ai",
      "prompt",
    ],
  },
  {
    id: "jobtrack-platform",
    area: "Cloud application architecture",
    evidence:
      "Built JobTrack with Next.js and Supabase, including authenticated server APIs, PostgreSQL-backed application data and cloud deployment workflows.",
    keywords: ["next.js", "nextjs", "supabase", "postgresql", "cloud", "authentication", "api", "vercel"],
  },
  {
    id: "automation-project",
    area: "Automation and data workflows",
    evidence:
      "Built Kiwi Supplement Watch, an automated data collection and deal-monitoring workflow with deployment and scheduled data refresh concerns.",
    keywords: ["automation", "workflow", "data", "scheduled", "monitoring", "deployment"],
  },
  {
    id: "ml-projects",
    area: "Machine learning foundations",
    evidence:
      "Completed AI classification projects covering machine learning, NLP, CNNs and Vision Transformers as part of a Computer Science degree with an AI minor.",
    keywords: ["machine learning", "ml", "ai", "nlp", "cnn", "vision transformer", "computer vision", "classification", "python"],
  },
  {
    id: "testing-delivery",
    area: "Quality and delivery practices",
    evidence:
      "Uses Pest, xUnit, Vitest, React Testing Library, JUnit, fuzz testing, Git, GitHub Actions, Docker, Vercel and Render.",
    keywords: ["testing", "test", "pest", "xunit", "vitest", "junit", "ci/cd", "github actions", "git", "docker", "vercel", "render"],
  },
  {
    id: "teaching",
    area: "Communication and mentoring",
    evidence:
      "Tutor since Jan 2024, teaching Python, coding and robotics; demonstrates technical communication, patience and mentoring.",
    keywords: ["communication", "mentor", "mentoring", "teaching", "python", "robotics", "teamwork", "stakeholder"],
  },
  {
    id: "education-cloud",
    area: "Education and cloud fundamentals",
    evidence:
      "Victoria University of Wellington Computer Science graduate with an AI minor; AWS Certified Cloud Practitioner (2026).",
    keywords: ["degree", "computer science", "ai", "aws", "cloud", "certification", "graduate"],
  },
  {
    id: "additional-stack",
    area: "Additional engineering stack",
    evidence:
      "Additional experience includes Python, Java, Node.js, Express, Prisma, Entity Framework, SQLite, OData, Power BI fundamentals and PWA development.",
    keywords: ["python", "java", "node", "node.js", "express", "prisma", "entity framework", "sqlite", "odata", "power bi", "pwa"],
  },
  {
    id: "work-eligibility",
    area: "New Zealand work eligibility",
    evidence:
      "Eligible to work in New Zealand, open to relocation, and holds a full New Zealand driver licence.",
    keywords: ["new zealand", "work eligibility", "relocation", "driver licence", "driver license"],
  },
];

const aliases: Record<string, string[]> = {
  "artificial intelligence": ["ai", "machine learning", "llm", "agentic"],
  ai: ["artificial intelligence", "machine learning", "llm", "agentic"],
  backend: ["api", "server", "laravel", "asp.net", "node"],
  frontend: ["react", "vue", "typescript", "javascript"],
  database: ["sql", "postgresql", "supabase", "sqlite"],
  devops: ["docker", "github actions", "ci/cd", "cloud", "deployment"],
  collaboration: ["teamwork", "communication", "mentoring"],
};

function termsFor(query: string) {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/[^a-z0-9+#.]+/).filter((word) => word.length > 2);
  return new Set([normalized, ...words, ...(aliases[normalized] || [])]);
}

export function retrieveEvidence(queries: string[]) {
  const queryTerms = new Set(queries.flatMap((query) => [...termsFor(query)]));

  return candidateEvidence
    .map((item) => {
      const haystack = `${item.area} ${item.evidence} ${item.keywords.join(" ")}`.toLowerCase();
      const matchedTerms = [...queryTerms].filter((term) => haystack.includes(term));
      return { ...item, matchedTerms, score: matchedTerms.length };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function assessRequirements(requirements: string[]) {
  return requirements.map((requirement) => {
    const matches = retrieveEvidence([requirement]);
    const top = matches[0];
    const exactPhrase = requirement.toLowerCase().trim();
    const explicit = top?.keywords.some(
      (keyword) => exactPhrase.includes(keyword) || keyword.includes(exactPhrase),
    );

    return {
      requirement,
      status: !top ? "missing" : explicit ? "matched" : "partial",
      evidence: top?.evidence || null,
      evidenceId: top?.id || null,
    };
  });
}
