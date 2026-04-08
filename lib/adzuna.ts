import { JobListing } from "@/types";

type AdzunaJob = {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  location?: { display_name?: string };
  company?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
};

type AdzunaResponse = {
  results?: AdzunaJob[];
};

export async function fetchJobsBySkills(skills: string[]) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY ?? "gb";

  if (!appId || !appKey) {
    return fetchTheMuseJobs(skills);
  }

  return fetchAdzunaJobs(skills, { appId, appKey, country });
}

async function fetchAdzunaJobs(
  skills: string[],
  credentials: { appId: string; appKey: string; country: string }
) {
  const query = encodeURIComponent(skills.slice(0, 5).join(" "));
  const url = `https://api.adzuna.com/v1/api/jobs/${credentials.country}/search/1?app_id=${credentials.appId}&app_key=${credentials.appKey}&results_per_page=10&what=${query}&content-type=application/json`;

  const response = await fetch(url, {
    method: "GET",
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Adzuna request failed: ${errorText}`);
  }

  const data = (await response.json()) as AdzunaResponse;

  return (data.results ?? []).map(normalizeJob);
}

async function fetchTheMuseJobs(skills: string[]) {
  try {
    const apiKey = process.env.THE_MUSE_API_KEY;
    const baseUrl = new URL("https://www.themuse.com/api/public/jobs");
    baseUrl.searchParams.set("page", "0");

    if (apiKey) {
      baseUrl.searchParams.set("api_key", apiKey);
    }

    const response = await fetch(baseUrl.toString(), {
      method: "GET",
      next: { revalidate: 1800 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`The Muse request failed: ${errorText}`);
    }

    const data = (await response.json()) as {
      results?: Array<{
        id: number;
        name: string;
        contents?: string;
        refs?: { landing_page?: string };
        company?: { name?: string };
        locations?: Array<{ name?: string }>;
        categories?: Array<{ name?: string }>;
        levels?: Array<{ name?: string }>;
      }>;
    };

    const normalizedSkills = skills.map((skill) => skill.toLowerCase());
    const jobs = (data.results ?? []).map((job) => {
      const description = stripHtml(job.contents ?? "");
      const categorySkills = (job.categories ?? []).map((category) => category.name?.toLowerCase() ?? "");
      const extractedSkills = extractSkillsFromJobText(
        `${job.name} ${description} ${categorySkills.join(" ")} ${(job.levels ?? []).map((level) => level.name).join(" ")}`
      );

      return {
        adzunaId: `themuse-${job.id}`,
        title: job.name,
        company: job.company?.name ?? "Unknown company",
        location: job.locations?.map((location) => location.name).filter(Boolean).join(", ") || "Remote / Flexible",
        description,
        applyUrl: job.refs?.landing_page ?? "https://www.themuse.com",
        salaryMin: null,
        salaryMax: null,
        skills: extractedSkills.length ? extractedSkills : categorySkills.filter(Boolean)
      } satisfies JobListing;
    });

    const rankedJobs = jobs
      .map((job) => ({
        job,
        score: scoreJobAgainstSkills(job, normalizedSkills)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.job);

    return rankedJobs.length ? rankedJobs : buildMockJobs(skills);
  } catch {
    return buildMockJobs(skills);
  }
}

function buildMockJobs(skills: string[]): JobListing[] {
  const normalizedSkills = skills.length ? skills : ["communication", "javascript"];

  return [
    {
      adzunaId: "demo-frontend-1",
      title: "Frontend Developer",
      company: "DemoTech Labs",
      location: "Remote",
      description:
        "Build responsive web interfaces with React, TypeScript, Tailwind CSS, and REST APIs. Collaborate closely with product and design.",
      applyUrl: "https://example.com/jobs/frontend-developer",
      salaryMin: 45000,
      salaryMax: 65000,
      skills: uniqueSkills(["react", "typescript", "tailwind", "rest api", ...normalizedSkills.slice(0, 2)])
    },
    {
      adzunaId: "demo-fullstack-1",
      title: "Full Stack Developer",
      company: "LaunchLayer",
      location: "Bangalore / Hybrid",
      description:
        "Work across Next.js, Node.js, PostgreSQL, Supabase, and API integrations to ship product features end to end.",
      applyUrl: "https://example.com/jobs/full-stack-developer",
      salaryMin: 60000,
      salaryMax: 85000,
      skills: uniqueSkills(["next.js", "node.js", "sql", "postgresql", "supabase", ...normalizedSkills.slice(0, 3)])
    },
    {
      adzunaId: "demo-product-1",
      title: "Junior Software Engineer",
      company: "BrightPath Systems",
      location: "Remote",
      description:
        "Support engineering teams by building features, fixing bugs, and learning modern web development with JavaScript, Git, and cloud tooling.",
      applyUrl: "https://example.com/jobs/junior-software-engineer",
      salaryMin: 30000,
      salaryMax: 45000,
      skills: uniqueSkills(["javascript", "git", "html", "css", "aws", ...normalizedSkills.slice(0, 2)])
    }
  ];
}

function uniqueSkills(skills: string[]) {
  return Array.from(new Set(skills.map((skill) => skill.toLowerCase())));
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function scoreJobAgainstSkills(job: JobListing, skills: string[]) {
  const haystack = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
  return skills.reduce((score, skill) => score + (haystack.includes(skill) ? 1 : 0), 0);
}

function normalizeJob(job: AdzunaJob): JobListing {
  const extractedSkills = extractSkillsFromJobText(`${job.title} ${job.description}`);

  return {
    adzunaId: job.id,
    title: job.title,
    company: job.company?.display_name ?? "Unknown company",
    location: job.location?.display_name ?? "Remote / Flexible",
    description: job.description,
    applyUrl: job.redirect_url,
    salaryMin: job.salary_min ?? null,
    salaryMax: job.salary_max ?? null,
    skills: extractedSkills
  };
}

function extractSkillsFromJobText(text: string) {
  const skillDictionary = [
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "python",
    "sql",
    "postgresql",
    "aws",
    "docker",
    "tailwind",
    "supabase",
    "rest api",
    "graphql",
    "git"
  ];

  const lower = text.toLowerCase();
  return skillDictionary.filter((skill) => lower.includes(skill));
}
