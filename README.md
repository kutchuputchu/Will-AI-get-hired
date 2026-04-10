# ResumeVibe

ResumeVibe is a 2026-style "Upload Resume -> Get Hired" platform built with Next.js 15, TypeScript, Tailwind CSS, Supabase, Groq/OpenAI-ready prompts, and a deployable Docker setup.

## Stack

- Frontend: Next.js 15 App Router + TypeScript + Tailwind CSS
- State: Zustand
- UI: custom shadcn-style components with Radix Progress
- Backend: Next.js API routes
- Auth/Data/Storage: Supabase
- AI prompt layer: Groq/OpenAI-ready prompt templates in `lib/prompts/resume.ts`
- Sample data: `data/sample-jobs.ts`

## Project Structure

```text
app/
  api/
    apply/route.ts
    interview/route.ts
    jobs/route.ts
    match/route.ts
    portfolio/route.ts
    resumes/
      analyze/route.ts
      process/route.ts
      upload/route.ts
    tracker/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  resume/resume-vibe-app.tsx
  ui/
    button.tsx
    card.tsx
    progress.tsx
data/
  sample-jobs.ts
lib/
  ai.ts
  jobs.ts
  match.ts
  prompts/resume.ts
  resume-parser.ts
  supabase/
store/
  app-store.ts
supabase/
  migrations/
    20260408_resume_vibe.sql
  schema.sql
  seed.sql
Dockerfile
docker-compose.yml
```

## ResumeVibe Integration

### New feature routes

- `/resume-vibe`
- `/resume-vibe/upload`

### New feature folders

```text
app/
  resume-vibe/
    page.tsx
    upload/page.tsx
components/
  resume-vibe/
    index.ts
  site-footer.tsx
  site-navbar.tsx
lib/
  resume-vibe/
    jobs-live.ts
supabase/
  migrations/
    20260408_resume_vibe.sql
```

### Integration steps

1. Add the new environment variables from `.env.example`
2. Run the Supabase migration in `supabase/migrations/20260408_resume_vibe.sql`
3. Make sure the `resumes` storage bucket exists
4. Restart the app with `npm run dev`
5. Open `/resume-vibe`

### Free-tier provider setup

- `JSEARCH_API_KEY`
  Primary live jobs provider with aggressive caching in `api_cache`
- `MANTIKS_API_KEY`
  India-specific fallback when JSearch is unavailable or cached data is cold
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`
  Salary/location enrichment and tertiary fallback
- `GROQ_API_KEY`
  Main AI analysis path
- `OPENAI_API_KEY` or `HUGGINGFACE_API_KEY`
  Optional future enhancement path for embeddings/parsing upgrades
- `CVPARSERPRO_API_KEY` or `APYHUB_API_KEY`
  Optional parser fallback keys

### What was integrated

- Native navbar button: `Get Hired`
- New `/resume-vibe` route inside the same app shell
- Cached live-jobs route using JSearch -> Mantiks -> Adzuna -> sample fallback
- Supabase-backed cache table: `api_cache`
- New feature tables:
  - `parsed_resumes`
  - `job_matches`
  - `user_applications`

### Deployment note

Because the jobs route caches provider responses in Supabase for 24 hours, repeated traffic should stay much safer within free-tier limits than calling external APIs on every request.

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Copy the environment file

```bash
cp .env.example .env.local
```

3. Fill in the required values in `.env.local`

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`
- `GROQ_API_KEY` or `OPENAI_API_KEY`
- optional job API keys such as `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`

4. Create the Supabase bucket

- Create a storage bucket named `resumes`

5. Run the database schema and seed

- Execute `supabase/schema.sql`
- Execute `supabase/seed.sql`

6. Start the app

```bash
npm run dev
```

## Docker

```bash
docker compose up --build
```

## Deploy

### Vercel

- push the repo to GitHub
- import into Vercel
- add all variables from `.env.example`
- set the Supabase bucket and keys

### Render or Railway

- connect the repo
- use the `Dockerfile`
- add the same environment variables

## Notes

- The current codebase includes a rich ResumeVibe UI, sample jobs across AI/backend/pharma, mock tracker/interview flows, and Supabase-ready schema.
- Groq/OpenAI integrations are prompt-ready, while fallback logic still keeps the demo usable without paid APIs.
- For a fully production-grade launch, the next step is to wire Supabase Auth UI and replace sample tracker/interview data with persisted user-specific records.
