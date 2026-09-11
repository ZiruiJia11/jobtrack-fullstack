export type CandidateEvidence = {
  id: string;
  area: string;
  evidence: string;
  matchedTerms: string[];
  score: number;
};

const aliases: Record<string, string[]> = {
  "artificial intelligence": ["ai", "machine learning", "llm", "agentic"],
  ai: ["artificial intelligence", "machine learning", "llm", "agentic"],
  backend: ["api", "server", "database", "node", "laravel", "asp.net"],
  frontend: ["react", "vue", "typescript", "javascript", "css", "html"],
  database: ["sql", "postgresql", "supabase", "sqlite"],
  devops: ["docker", "github actions", "ci/cd", "cloud", "deployment"],
  collaboration: ["teamwork", "communication", "mentoring", "stakeholder"],
};

function termsFor(query: string) {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/[^a-z0-9+#.]+/).filter((word) => word.length > 2);
  return new Set([normalized, ...words, ...(aliases[normalized] || [])]);
}

function candidateSections(profileText: string) {
  const paragraphs = profileText
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean);

  const sections: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= 1_200) {
      sections.push(paragraph);
      continue;
    }
    for (let start = 0; start < paragraph.length; start += 1_000) {
      sections.push(paragraph.slice(start, start + 1_200));
    }
  }
  return sections.slice(0, 80);
}

export function retrieveEvidence(profileText: string, queries: string[]) {
  const queryTerms = new Set(queries.flatMap((query) => [...termsFor(query)]));

  return candidateSections(profileText)
    .map((evidence, index) => {
      const haystack = evidence.toLowerCase();
      const matchedTerms = [...queryTerms].filter((term) => haystack.includes(term));
      const firstLine = evidence.split("\n")[0].slice(0, 100);
      return {
        id: `cv-section-${index + 1}`,
        area: firstLine || `CV section ${index + 1}`,
        evidence,
        matchedTerms,
        score: matchedTerms.length,
      } satisfies CandidateEvidence;
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function assessRequirements(profileText: string, requirements: string[]) {
  return requirements.map((requirement) => {
    const matches = retrieveEvidence(profileText, [requirement]);
    const top = matches[0];
    const requirementTerms = [...termsFor(requirement)].filter((term) => term.length > 2);
    const matchedTermCount = top?.matchedTerms.length || 0;
    const coverage = requirementTerms.length ? matchedTermCount / requirementTerms.length : 0;

    return {
      requirement,
      status: !top ? "missing" : coverage >= 0.6 ? "matched" : "partial",
      evidence: top?.evidence || null,
      evidenceId: top?.id || null,
    };
  });
}
