import { sampleJobs } from "@/data/sample-jobs";
import { JobListing } from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { extractJobSkills, relatedRoleTitles } from "@/lib/resume-vibe/role-graph";

const CACHE_TTL_HOURS = 24;

type JobQuery = {
  skills: string[];
  domain?: string;
  roles?: string[];
  location?: string;
  remote?: boolean;
};

export async function fetchCachedLiveJobs(query: JobQuery) {
  const cacheKey = buildCacheKey(query);
  const cached = await readJobsCache(cacheKey);

  if (cached.length) {
    return { jobs: cached, source: "supabase-cache" as const, quotaWarning: false };
  }

  const live = await fetchFromProviders(query);
  await writeJobsCache(cacheKey, live.jobs, live.source);
  return live;
}

async function fetchFromProviders(query: JobQuery) {
  try {
    if (process.env.JSEARCH_API_KEY) {
      const jobs = await fetchJSearch(query);
      if (jobs.length) {
        return { jobs: supplementJobs(jobs, query), source: "jsearch" as const, quotaWarning: true };
      }
    }

    if (process.env.MANTIKS_API_KEY) {
      const jobs = await fetchMantiks(query);
      if (jobs.length) {
        return { jobs: supplementJobs(jobs, query), source: "mantiks" as const, quotaWarning: true };
      }
    }

    if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      const jobs = await fetchAdzuna(query);
      if (jobs.length) {
        return { jobs: supplementJobs(jobs, query), source: "adzuna" as const, quotaWarning: false };
      }
    }
  } catch {
    // Fall through to sample jobs.
  }

  return {
    jobs: supplementJobs([], query),
    source: "sample" as const,
    quotaWarning: false
  };
}

async function fetchJSearch(query: JobQuery) {
  const url = new URL("https://www.jsearchapi.com/search");
  url.searchParams.set("query", buildSearchText(query));
  url.searchParams.set("page", "1");
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("country", "in");

  const response = await fetch(url.toString(), {
    headers: {
      "X-API-KEY": process.env.JSEARCH_API_KEY as string
    },
    next: { revalidate: 60 * 60 }
  });

  if (!response.ok) {
    throw new Error(`JSearch failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<{
      job_id?: string;
      job_title?: string;
      employer_name?: string;
      job_city?: string;
      job_country?: string;
      job_description?: string;
      job_apply_link?: string;
      job_is_remote?: boolean;
      job_min_salary?: number;
      job_max_salary?: number;
      job_employment_type?: string;
    }>;
  };

  return (data.data ?? []).slice(0, 12).map((job) => ({
    adzunaId: job.job_id ?? crypto.randomUUID(),
    slug: slugify(`${job.employer_name ?? "company"}-${job.job_title ?? "role"}`),
    title: job.job_title ?? "Open role",
    company: job.employer_name ?? "Unknown company",
    companyLogo: initials(job.employer_name ?? "UC"),
    location: [job.job_city, job.job_country].filter(Boolean).join(", ") || (job.job_is_remote ? "Remote" : "India"),
    description: job.job_description ?? "Live job fetched from JSearch.",
    applyUrl: job.job_apply_link ?? "#",
    salaryMin: job.job_min_salary ?? null,
    salaryMax: job.job_max_salary ?? null,
      skills: extractJobSkills(`${job.job_title ?? ""} ${job.job_description ?? ""}`, query.skills),
    domain: query.domain ?? "General",
    level: mapLevel(job.job_employment_type),
    easyApply: Boolean(job.job_apply_link)
  })) satisfies JobListing[];
}

async function fetchMantiks(query: JobQuery) {
  const url = new URL("https://api.mantiks.io/job-postings-api/india");
  url.searchParams.set("q", buildSearchText(query));
  url.searchParams.set("limit", "12");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.MANTIKS_API_KEY as string}`
    },
    next: { revalidate: 60 * 60 }
  });

  if (!response.ok) {
    throw new Error(`Mantiks failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      id?: string;
      title?: string;
      company?: string;
      location?: string;
      description?: string;
      apply_url?: string;
      salary_min?: number;
      salary_max?: number;
      remote?: boolean;
    }>;
  };

  return (data.results ?? []).slice(0, 12).map((job) => ({
    adzunaId: job.id ?? crypto.randomUUID(),
    slug: slugify(`${job.company ?? "company"}-${job.title ?? "role"}`),
    title: job.title ?? "Open role",
    company: job.company ?? "Unknown company",
    companyLogo: initials(job.company ?? "UC"),
    location: job.location ?? (job.remote ? "Remote" : "India"),
    description: job.description ?? "Live job fetched from Mantiks.",
    applyUrl: job.apply_url ?? "#",
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
      skills: extractJobSkills(`${job.title ?? ""} ${job.description ?? ""}`, query.skills),
    domain: query.domain ?? "General",
    level: "mid",
    easyApply: Boolean(job.apply_url)
  })) satisfies JobListing[];
}

async function fetchAdzuna(query: JobQuery) {
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/in/search/1`);
  url.searchParams.set("app_id", process.env.ADZUNA_APP_ID as string);
  url.searchParams.set("app_key", process.env.ADZUNA_APP_KEY as string);
  url.searchParams.set("results_per_page", "12");
  url.searchParams.set("what", buildSearchText(query));
  url.searchParams.set("where", query.location ?? "Indore");
  url.searchParams.set("content-type", "application/json");

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 }
  });

  if (!response.ok) {
    throw new Error(`Adzuna failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      id?: string;
      title?: string;
      description?: string;
      redirect_url?: string;
      salary_min?: number;
      salary_max?: number;
      company?: { display_name?: string };
      location?: { display_name?: string };
    }>;
  };

  return (data.results ?? []).slice(0, 12).map((job) => ({
    adzunaId: job.id ?? crypto.randomUUID(),
    slug: slugify(`${job.company?.display_name ?? "company"}-${job.title ?? "role"}`),
    title: job.title ?? "Open role",
    company: job.company?.display_name ?? "Unknown company",
    companyLogo: initials(job.company?.display_name ?? "UC"),
    location: job.location?.display_name ?? query.location ?? "India",
    description: job.description ?? "Live job fetched from Adzuna.",
    applyUrl: job.redirect_url ?? "#",
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
      skills: extractJobSkills(`${job.title ?? ""} ${job.description ?? ""}`, query.skills),
    domain: query.domain ?? "General",
    level: "mid",
    easyApply: Boolean(job.redirect_url)
  })) satisfies JobListing[];
}

async function readJobsCache(cacheKey: string) {
  try {
    const supabase = getSupabaseAdmin();
    const expiresBefore = new Date().toISOString();
    const { data } = await supabase
      .from("api_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .eq("cache_type", "jobs")
      .gt("expires_at", expiresBefore)
      .maybeSingle();

    return ((data?.payload as JobListing[] | undefined) ?? []).slice(0, 12);
  } catch {
    return [];
  }
}

async function writeJobsCache(cacheKey: string, jobs: JobListing[], source: string) {
  try {
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    await supabase.from("api_cache").upsert({
      cache_key: cacheKey,
      cache_type: "jobs",
      provider: source,
      payload: jobs,
      expires_at: expiresAt
    });
  } catch {
    // Cache writes are best-effort only.
  }
}

function filterSampleJobs(query: JobQuery) {
  const tokens = buildSearchText(query).toLowerCase().split(/\s+/).filter(Boolean);
  return sampleJobs
    .map((job) => ({
      job,
      score: tokens.reduce((total, token) => {
        const haystack = `${job.title} ${job.description} ${job.domain} ${job.skills.join(" ")}`.toLowerCase();
        return total + (haystack.includes(token) ? 1 : 0);
      }, 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((item) => item.job);
}

function buildSearchText(query: JobQuery) {
  return [...relatedRoleTitles(query.domain ?? "", query.skills ?? []).slice(0, 6), ...(query.roles ?? []), query.domain ?? "", ...(query.skills ?? [])]
    .filter(Boolean)
    .slice(0, 10)
    .join(" ");
}

function supplementJobs(jobs: JobListing[], query: JobQuery) {
  const seen = new Set(jobs.map((job) => job.adzunaId));
  const supplemented = [...jobs];

  for (const sample of filterSampleJobs(query)) {
    if (seen.has(sample.adzunaId)) {
      continue;
    }

    supplemented.push(sample);
    seen.add(sample.adzunaId);

    if (supplemented.length >= 12) {
      break;
    }
  }

  return supplemented.slice(0, 12);
}

function buildCacheKey(query: JobQuery) {
  return JSON.stringify({
    skills: query.skills.slice(0, 8).sort(),
    domain: query.domain ?? "",
    roles: (query.roles ?? []).slice(0, 5).sort(),
    location: query.location ?? "",
    remote: Boolean(query.remote)
  });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function mapLevel(value?: string): "entry" | "mid" | "senior" {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("senior") || lower.includes("lead")) return "senior";
  if (lower.includes("intern") || lower.includes("junior") || lower.includes("entry")) return "entry";
  return "mid";
}
