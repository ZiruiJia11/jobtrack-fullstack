import fixture from "../../public/demo-fixture.json";

export const DEMO_EMAIL = fixture.email;
export const DEMO_PASSWORD = fixture.password;

export function isDemoUser(email?: string | null) {
  return email?.toLowerCase() === DEMO_EMAIL;
}

export function sampleMatch(company: string, role: string, jobDescription: string) {
  const job = fixture.jobs[0];
  if (company !== job.company || role !== job.role || jobDescription.trim() !== job.jobDescription) return null;
  return {
    report: fixture.sampleReport,
    trace: [],
    model: "Fixed showcase example - no live AI request",
    sample: true,
    candidateProfile: { fileName: "Alex-Taylor-Demo-CV.txt" },
  };
}
