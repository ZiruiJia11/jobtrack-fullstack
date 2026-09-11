# JobTrack Fullstack

Personal job application tracker with a Next.js frontend/backend and Supabase storage.

Live site: https://jobtrack-fullstack-ashy.vercel.app/

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
- Restrict login to one email: `steven5115115@gmail.com`.

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
2. It must call `retrieveCandidateEvidence` to find reviewed CV and portfolio proof.
3. It must call `assessRequirementGaps` to label requirements as matched, partial, or missing.
4. It returns a Zod-validated fit report with strengths, gaps, interview questions, next actions, and a cover-letter angle.

The server enforces authentication, input limits, a four-step execution cap, and structured output. Candidate evidence lives in `src/lib/agent/candidate-profile.ts`, so the model cannot silently add unverified claims.

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
JOBTRACK_LOGIN_EMAIL=steven5115115@gmail.com
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-luna
```

`OPENAI_MODEL` is optional. The default is `gpt-5.6-luna`. Keep `OPENAI_API_KEY` server-side and never prefix it with `NEXT_PUBLIC_`.

3. Run the database schema in Supabase SQL Editor:

```bash
supabase-schema.sql
```

The app will create a private Supabase Storage bucket named `application-files` on first CV upload if the service role key has permission. You can also create it manually in Supabase Storage as a private bucket.

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
- The backend verifies the Supabase session token and only allows `JOBTRACK_LOGIN_EMAIL`.
- The AI endpoint uses the same authenticated-session check and never sends the API key to the browser.
- The URL importer rejects private-network targets and validates redirects to reduce SSRF risk.
- The optional browser helper accepts only HTTPS SEEK/LinkedIn URLs and messages from approved JobTrack hostnames.
- Keep Supabase Auth public signups off if this is only for one personal account.
- CV downloads use short-lived signed URLs after the backend confirms the logged-in user owns the file.
