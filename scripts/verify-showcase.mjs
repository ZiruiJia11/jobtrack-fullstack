import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.JOBTRACK_BASE_URL || "https://jobtrack-fullstack-ashy.vercel.app";
const fixture = JSON.parse(await readFile(new URL("../public/demo-fixture.json", import.meta.url), "utf8"));
const source = await readFile(new URL("../src/lib/supabase-server.ts", import.meta.url), "utf8");
const anonKey = source.match(/eyJhbGci[^\s"]+/)[0];
const supabase = "https://pexthgxqandoeesqbelb.supabase.co";
const authResponse = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
  method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email: fixture.email, password: fixture.password }),
});
assert.equal(authResponse.status, 200, "Demo sign-in");
const session = await authResponse.json();
const headers = { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
const request = (path, options = {}) => fetch(`${base}${path}`, { headers, ...options });
const apps = await (await request("/api/applications")).json();
assert(apps.applications.length >= 10, "Demo applications are seeded");
assert(apps.applications.every((row) => row.user_id === session.user.id), "All demo rows belong to the demo account");
assert.equal((await request("/api/admin/users")).status, 403, "Demo cannot access administration");
assert.equal((await request("/api/applications?userId=00000000-0000-4000-8000-000000000001")).status, 403, "Demo cannot request another user's records");
assert.equal((await fetch(`${base}/api/job-match`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401, "AI requires authentication");
const sample = { ...fixture.jobs[0], mode: "sample" };
const beforeResponse = await request("/api/job-match");
assert.equal(beforeResponse.status, 200, "AI usage store is ready");
const before = await beforeResponse.json();
const matchResponse = await request("/api/job-match", { method: "POST", body: JSON.stringify(sample) });
assert.equal(matchResponse.status, 200, "Sample report is available");
const match = await matchResponse.json();
assert.equal(match.sample, true, "Sample is explicitly labelled");
assert.deepEqual(match.report, fixture.sampleReport, "Sample is the documented fixed report");
assert.deepEqual(match.trace, [], "Sample does not pretend tools were run");
const after = await (await request("/api/job-match")).json();
assert.equal(after.usage.used, before.usage.used, "Sample uses no live allowance");
assert.equal(after.usage.limit, 2, "Daily account limit is two");
assert.equal((await request("/api/job-match", { method: "POST", body: JSON.stringify({ ...sample, role: "Changed role" }) })).status, 400, "Fixed report cannot be used for a different job");
const profileResponse = await request("/api/candidate-profile");
assert.equal(profileResponse.status, 200, "Candidate profile can be read");
const { profile } = await profileResponse.json();
assert.match(profile.text, /Fictional Demo Candidate/);
const attachment = apps.applications.find((row) => row.id === fixture.jobs[0].id).payload;
assert(attachment.cvStoragePath, "Demo CV attachment exists");
const downloadResponse = await request(`/api/cv?path=${encodeURIComponent(attachment.cvStoragePath)}&name=Alex-Taylor-Demo-CV.txt`);
assert.equal(downloadResponse.status, 200);
const { signedUrl } = await downloadResponse.json();
const downloaded = await fetch(signedUrl);
assert.equal(downloaded.status, 200, "Stored CV can be downloaded");
assert.equal(await downloaded.text(), fixture.profile, "Downloaded file contains the original CV bytes");
console.log(JSON.stringify({ demoLogin: "pass", accountIsolation: "pass", adminDenied: "pass", usageLimit: 2, sampleAnalysis: "pass", noAllowanceUsed: "pass", mismatchedSampleDenied: "pass", candidateCv: "pass", attachmentDownload: "pass", paidAiRequests: 0 }));
