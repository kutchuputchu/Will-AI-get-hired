create extension if not exists vector;

create table if not exists parsed_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  resume_id uuid references resumes(id) on delete cascade,
  file_name text not null,
  raw_text text not null,
  parsed_payload jsonb not null default '{}'::jsonb,
  resume_embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  resume_id uuid references resumes(id) on delete cascade,
  provider text not null default 'sample',
  provider_job_id text,
  title text not null,
  company text not null,
  location text not null,
  salary_min integer,
  salary_max integer,
  apply_url text not null,
  match_percentage integer not null default 0,
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  why_match text,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists user_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  resume_id uuid references resumes(id) on delete cascade,
  job_match_id uuid references job_matches(id) on delete set null,
  status text not null default 'Applied',
  notes text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null,
  cache_type text not null,
  provider text not null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cache_key, cache_type)
);

create index if not exists idx_parsed_resumes_user_id on parsed_resumes(user_id);
create index if not exists idx_job_matches_user_id on job_matches(user_id);
create index if not exists idx_job_matches_resume_id on job_matches(resume_id);
create index if not exists idx_user_applications_user_id on user_applications(user_id);
create index if not exists idx_api_cache_expires_at on api_cache(expires_at);
