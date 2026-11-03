import { readFile } from "node:fs/promises";

const fixture = JSON.parse(await readFile(new URL("../public/demo-fixture.json", import.meta.url), "utf8"));
const base = process.env.JOBTRACK_BASE_URL || "https://jobtrack-fullstack-ashy.vercel.app";
const source = await readFile(new URL("../src/lib/supabase-server.ts", import.meta.url), "utf8");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || source.match(/eyJhbGci[^\s"]+/)?.[0];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pexthgxqandoeesqbelb.supabase.co";

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${result.error || result.msg || "See server logs"}`);
  return result;
}

async function login(email, password) {
  const result = await jsonRequest(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return result.access_token;
}

if (!process.env.JOBTRACK_ADMIN_EMAIL || !process.env.JOBTRACK_ADMIN_PASSWORD) {
  throw new Error("Set JOBTRACK_ADMIN_EMAIL and JOBTRACK_ADMIN_PASSWORD locally. Never commit private credentials.");
}
const adminToken = await login(process.env.JOBTRACK_ADMIN_EMAIL, process.env.JOBTRACK_ADMIN_PASSWORD);
const adminHeaders = { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" };
const { users } = await jsonRequest(`${base}/api/admin/users`, { headers: adminHeaders });
let demo = users.find((user) => user.email === fixture.email);
if (!demo) {
  const created = await jsonRequest(`${base}/api/admin/users`, {
    method: "POST", headers: adminHeaders, body: JSON.stringify({ email: fixture.email, password: fixture.password }),
  });
  demo = created.user;
}
const demoToken = await login(fixture.email, fixture.password);
const demoHeaders = { Authorization: `Bearer ${demoToken}`, "Content-Type": "application/json" };
const { applications: existing } = await jsonRequest(`${base}/api/applications`, { headers: demoHeaders });
const existingIds = new Set(existing.map((app) => app.id));
const dateAt = (days) => { const date = new Date(); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
const applications = fixture.jobs.filter((job) => !existingIds.has(job.id)).map((job) => ({
  ...job,
  link: `https://example.com/careers/${job.id}`,
  jobType: "Full-time",
  appliedDate: dateAt(-job.daysAgo),
  followUpDate: job.followUpIn === null ? "" : dateAt(job.followUpIn),
  screenDate: ["Screening", "Interview", "Take-home", "Final", "Offer"].includes(job.status) ? dateAt(-Math.max(1, job.daysAgo - 3)) : "",
  interviewDate: ["Interview", "Take-home", "Final", "Offer"].includes(job.status) ? dateAt(-Math.max(1, job.daysAgo - 6)) : "",
  decisionDate: ["Offer", "Rejected"].includes(job.status) ? dateAt(-1) : "",
  coverLetter: `Fictional cover letter: I am interested in the ${job.role} role at ${job.company}. My project experience includes TypeScript, React, REST APIs and PostgreSQL. I would welcome the chance to discuss my relevant work and learning areas.`,
  notes: "SHOWCASE: Fictional application for the shared demo account. Not a real vacancy or application.",
  updatedAt: new Date().toISOString(),
}));
if (applications.length) {
  await jsonRequest(`${base}/api/applications`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ userId: demo.id, applications }) });
}
const { profile } = await jsonRequest(`${base}/api/candidate-profile`, { headers: demoHeaders });
if (!profile) {
  const form = new FormData();
  form.set("file", new File([fixture.profile], "Alex-Taylor-Demo-CV.txt", { type: "text/plain" }));
  await jsonRequest(`${base}/api/candidate-profile`, { method: "POST", headers: { Authorization: `Bearer ${demoToken}` }, body: form });
}
const currentRows = await jsonRequest(`${base}/api/applications`, { headers: demoHeaders });
const firstRow = currentRows.applications.find((row) => row.id === fixture.jobs[0].id);
if (firstRow && !firstRow.payload?.cvStoragePath) {
  const form = new FormData();
  form.set("appId", firstRow.id);
  form.set("file", new File([fixture.profile], "Alex-Taylor-Demo-CV.txt", { type: "text/plain" }));
  const attachment = await jsonRequest(`${base}/api/cv`, { method: "POST", headers: { Authorization: `Bearer ${demoToken}` }, body: form });
  await jsonRequest(`${base}/api/applications`, { method: "POST", headers: demoHeaders, body: JSON.stringify({ applications: [{ ...firstRow.payload, ...attachment }] }) });
}
console.log(JSON.stringify({ demoUserId: demo.id, seededApplications: applications.length, totalApplications: existing.length + applications.length, profileReady: true }));
