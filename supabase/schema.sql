create extension if not exists vector;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text,
  email text unique,
  headline text,
  location text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  visible_to_recruiters boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  raw_text text not null,
  extracted_skills text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  domain text not null,
  domain_confidence integer not null default 0,
  summary text not null,
  skills jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  missing_skills text[] not null default '{}',
  resume_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  slug text unique not null,
  title text not null,
  company text not null,
  company_logo text,
  location text not null,
  domain text not null,
  description text not null,
  salary_min integer,
  salary_max integer,
  level text,
  easy_apply boolean not null default false,
  skills text[] not null default '{}',
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists job_matches (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  match_percentage integer not null,
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  strengths text[] not null default '{}',
  gaps text[] not null default '{}',
  explanation text,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  status text not null default 'Applied',
  notes text,
  applied_at timestamptz not null default now()
);

create table if not exists recruiter_visibility (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  is_public boolean not null default false,
  public_slug text unique,
  updated_at timestamptz not null default now()
);
