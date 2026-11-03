# JobTrack Fullstack

Multi-user job application tracker with a Next.js frontend/backend, Supabase storage and evidence-grounded AI matching.

Live site: https://jobtrack-fullstack-ashy.vercel.app/

## Interview Showcase

Click **Try the demo** on the sign-in page, or use:

- Email: `demo@jobtrack.example`
- Password: `JobTrackDemo!2026`

This is a shared ordinary account, separate from the owner's data. It contains ten fictional applications, a synthetic candidate CV, a downloadable CV attachment and cover-letter text. Visitors can try search, filters, editing and analytics. Do not upload personal information to the shared account.

Choose **View sample match** to see an explicitly labelled fixed report for the original fictional Orbit Works job and CV. The sample sends no request to an AI provider, uses no allowance, and makes no claim to be a live AI result. Live analysis remains available separately when the provider has credit.

Live AI allows **two analysis attempts per account per day** and **twenty across the site per day**, resetting at midnight in `Pacific/Auckland`. Database row locks reserve allowance before a provider call, so concurrent requests, refreshes and deployments cannot bypass the cap. Requests fail closed if the usage store is unavailable. Provider attempts count even when they fail, because an upstream failure can still incur usage. The agent makes no automatic retries, has a four-step cap, a 3,000-token output cap per step and a 45-second request deadline. These are request controls, not a guaranteed dollar spending ceiling; configure a provider billing limit too.

Apply `sql/ai-usage-limits.sql` to add the usage tables and service-only reservation function. This does not modify existing application records. AI usage is read-only for the owning user; only the server's service role can reserve attempts.

The idempotent `scripts/setup-demo.mjs` creates only the dedicated demo account, inserts missing fixture records and uploads the synthetic CV. Set `JOBTRACK_ADMIN_EMAIL` and `JOBTRACK_ADMIN_PASSWORD` locally before running it with Node. Existing records are never reset by this script. `JOBTRACK_BASE_URL` can target a local test server. Demo credentials are deliberately public and confer no administrator permissions.

Run `node scripts/verify-showcase.mjs` to verify demo sign-in, account isolation, denied admin access, quota visibility, sample labelling and real CV download. It sends **zero paid AI requests**. Set `JOBTRACK_BASE_URL` to test another deployment.

## What It Does

- Track company, role, job link, source, category, job type, status, and dates.
- Save JD text, cover letter text, and a small CV file per application.
- Import a public job URL and prefill company, role, job description, and category for review.
- Upload CV files to private Supabase Storage and download them across devices.
- Edit and delete existing applications.
- Filter by status, source, category, follow-up timing, and search text.
- Estimate success probability from stage, timing, and your own history.
- Sync data through a backend API into Supabase.
- Analyse a saved or pasted job description with a tool-using AI Match Agent.
- Ground each match report in reviewed CV evidence and show the agent's tool trace.
- Separate records by authenticated user and provide server-authorized administration.

## Tech Stack

- Next.js App Router
- Supabase Auth
- Supabase Postgres
- Next.js Route Handler API
- Vercel AI SDK `ToolLoopAgent`
- OpenAI Responses API with schema-validated output

## AI Match Agent

The match feature is an agentic workflow, not a free-form chatbot:

1. It extracts the important requirements from the job description.
2. It must call `retrieveCandidateEvidence` to find relevant excerpts from the user's latest saved candidate CV profile.
3. It must call `assessRequirementGaps` to label requirements as matched, partial, or missing using that profile.
4. It returns a Zod-validated fit report with strengths, gaps, interview questions, next actions, and a cover-letter angle.

The server enforces authentication, input limits, a four-step execution cap, and structured output. CV text is treated as untrusted evidence rather than model instructions, and the model is told not to invent claims that are absent from the retrieved excerpts.

Run the analysis directly in the add/edit application form after importing or entering the company, role, and job description. Analysis is read-only: it does not create or update an application, so the user can review the recommendation before choosing **Save**.

### Candidate CV profile

Open **Candidate CV profile** from the sidebar to upload a master CV as PDF or plain text. The server extracts the text, stores the original file and an editable profile in the private `candidate-profiles` Supabase Storage bucket, and allows later text edits or file replacement. Every new match analysis reads the latest saved profile; per-application CV attachments remain separate and are not used as the evidence source.

## Job URL Import

Paste a public job-page URL into the add/edit form and choose **Import details**. The authenticated server route reads Schema.org `JobPosting` JSON-LD first, then falls back to common job-board metadata and page sections. It classifies the role using deterministic category rules and only prefills the form; nothing is saved until the user reviews and submits it.

For safety, the importer permits only standard public HTTP(S) pages, checks DNS and every redirect for private/local addresses, limits redirects, response size and request duration, and rejects non-HTML responses. Login-protected or JavaScript-only job boards may block server-side extraction; those descriptions must be pasted manually.

### SEEK and LinkedIn browser helper

LinkedIn public job pages are supported directly. SEEK currently blocks server-side requests, so the optional extension in `browser-extension/` provides a safe fallback for SEEK and signed-in LinkedIn pages. It opens the pasted URL in an inactive browser tab, reads only the title, company and job description using the browser's existing session, returns those fields to JobTrack, and closes that temporary tab.

Load the extension as an unpacked Chrome/Edge extension using the instructions in `browser-extension/README.md`. No job-site password or cookie is stored in JobTrack.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://pexthgxqandoeesqbelb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key
JOBTRACK_ADMIN_EMAILS=steven5115115@gmail.com
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-luna
```

`OPENAI_MODEL` is optional. The default is `gpt-5.6-luna`. Keep `OPENAI_API_KEY` server-side and never prefix it with `NEXT_PUBLIC_`.

3. Run the database schema in Supabase SQL Editor:

```bash
supabase-schema.sql
```

The app will create private Supabase Storage buckets named `application-files` and `candidate-profiles` on first use if the service role key has permission. You can also create them manually in Supabase Storage as private buckets.

4. Create one Supabase Auth user:

- Email: `steven5115115@gmail.com`
- Password: your chosen password
- Auto Confirm User: enabled

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy

### Recommended: Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables from `.env.example`.
4. Deploy.

## iPhone Install

JobTrack includes basic PWA support for iOS.

1. Open the live site in Safari on iPhone.
2. Tap Share.
3. Choose Add to Home Screen.
4. Open JobTrack from the home screen like a standalone app.

For a true App Store app, wrap this web app with Capacitor or rebuild it in React Native/Expo, then publish with an Apple Developer account.

### Render

Use a Web Service with:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables: same as `.env.example`

## Security Notes

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose in browser code.
- `SUPABASE_SERVICE_ROLE_KEY` is private and must only live in Vercel/Render environment variables.
- `OPENAI_API_KEY` is private and must only live in local or deployment environment variables.
- The backend verifies Supabase session tokens. Ordinary application writes run under the caller's RLS permissions; administrative access requires an email in `JOBTRACK_ADMIN_EMAILS`.
- The AI endpoint uses the same authenticated-session check and never sends the API key to the browser.
- The URL importer rejects private-network targets and validates redirects to reduce SSRF risk.
- The optional browser helper accepts only HTTPS SEEK/LinkedIn URLs and messages from approved JobTrack hostnames.
- Keep Supabase Auth public signups off if this is only for one personal account.
- CV downloads use short-lived signed URLs after the backend confirms the logged-in user owns the file.
