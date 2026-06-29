# JobTrack Fullstack

Personal job application tracker with a Next.js frontend/backend and Supabase storage.

Live site: https://jobtrack-fullstack-ashy.vercel.app/

## What It Does

- Track company, role, job link, source, category, job type, status, and dates.
- Save JD text, cover letter text, and a small CV file per application.
- Upload CV files to private Supabase Storage and download them across devices.
- Edit and delete existing applications.
- Filter by status, source, category, follow-up timing, and search text.
- Estimate success probability from stage, timing, and your own history.
- Sync data through a backend API into Supabase.
- Restrict login to one email: `steven5115115@gmail.com`.

## Tech Stack

- Next.js App Router
- Supabase Auth
- Supabase Postgres
- Next.js Route Handler API

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
```

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

### Render

Use a Web Service with:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables: same as `.env.example`

## Security Notes

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose in browser code.
- `SUPABASE_SERVICE_ROLE_KEY` is private and must only live in Vercel/Render environment variables.
- The backend verifies the Supabase session token and only allows `JOBTRACK_LOGIN_EMAIL`.
- Keep Supabase Auth public signups off if this is only for one personal account.
- CV downloads use short-lived signed URLs after the backend confirms the logged-in user owns the file.
