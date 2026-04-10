"use client";

import { useMemo, useState } from "react";
import {
  JobListing,
  MatchedJob,
  ResumeAnalysis,
  ResumeUploadResponse,
  SuggestedRole
} from "@/types";

type Status = {
  loading: boolean;
  error: string;
};

const workflowSteps = [
  "Upload and parse the resume",
  "Detect the domain and top-fit roles",
  "Explain role fit and next improvements"
];

export function DashboardSaaS() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<ResumeUploadResponse | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [status, setStatus] = useState<Status>({ loading: false, error: "" });

  const domainConfidence = useMemo(() => {
    if (!analysis) {
      return 0;
    }

    return analysis.domainConfidence ?? analysis.suggestedRoles[0]?.score ?? 72;
  }, [analysis]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus({ loading: false, error: "Please choose a PDF or DOCX file." });
      return;
    }

    setStatus({ loading: true, error: "" });
    setUploadData(null);
    setAnalysis(null);
    setJobs([]);
    setMatches([]);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const uploadResponse = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error ?? "Upload failed.");
      }

      const uploaded: ResumeUploadResponse = await uploadResponse.json();
      setUploadData(uploaded);

      const analysisResponse = await fetch("/api/resumes/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resumeId: uploaded.resumeId,
          text: uploaded.text
        })
      });

      if (!analysisResponse.ok) {
        const error = await analysisResponse.json();
        throw new Error(error.error ?? "Resume analysis failed.");
      }

      const analyzed: ResumeAnalysis = await analysisResponse.json();
      setAnalysis(analyzed);

      const jobsResponse = await fetch(
        `/api/jobs?skills=${encodeURIComponent(analyzed.skills.join(","))}&domain=${encodeURIComponent(
          analyzed.domain
        )}&roles=${encodeURIComponent(analyzed.suggestedRoles.map((role) => role.role).join(","))}`
      );

      if (!jobsResponse.ok) {
        const error = await jobsResponse.json();
        throw new Error(error.error ?? "Job fetching failed.");
      }

      const fetchedJobs: JobListing[] = await jobsResponse.json();
      setJobs(fetchedJobs);

      const matchResponse = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resumeId: uploaded.resumeId,
          resumeText: uploaded.text,
          resumeSkills: analyzed.skills,
          suggestedRoles: analyzed.suggestedRoles.map((role) => role.role),
          domain: analyzed.domain,
          jobs: fetchedJobs
        })
      });

      if (!matchResponse.ok) {
        const error = await matchResponse.json();
        throw new Error(error.error ?? "Matching failed.");
      }

      const matched: MatchedJob[] = await matchResponse.json();
      setMatches(matched);
      setStatus({ loading: false, error: "" });
    } catch (error) {
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : "Something went wrong."
      });
    }
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="surface animate-float-in relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />
        <div className="absolute -right-16 top-10 hidden h-48 w-48 rounded-full bg-blue-500/10 blur-3xl lg:block" />
        <div className="absolute -left-12 bottom-0 hidden h-40 w-40 rounded-full bg-slate-900/5 blur-3xl lg:block" />

        <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div>
            <div className="badge">
              <span className="h-2 w-2 rounded-full bg-blue-500 pulse-ring" />
              Career intelligence dashboard
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
              Analyze resumes with the clarity and trust of a real SaaS product.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Surface the score, detected domain, best-fit roles, and practical improvements in a structured dashboard that feels production-ready.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a className="button-primary" href="#upload">
                Analyze resume
              </a>
              <a className="button-secondary" href="#dashboard">
                View dashboard
              </a>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Candidate" value={analysis ? analysis.candidate.fullName || "Not clearly found" : "Detected"} />
              <MetricCard label="Resume score" value={analysis ? `${analysis.resumeScore}/100` : "Ready"} />
              <MetricCard label="AI skills found" value={analysis ? `${analysis.skills.length}` : "0"} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/10 bg-slate-950 p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">Why this feels trustworthy</p>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">Structured output</span>
            </div>
            <div className="mt-6 space-y-4">
              {workflowSteps.map((item, index) => (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4" key={item}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{item}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Clear sections, confidence scores, and role reasoning reduce ambiguity.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <UploadCard
          file={file}
          uploadData={uploadData}
          loading={status.loading}
          error={status.error}
          onFileChange={setFile}
          onSubmit={handleSubmit}
        />
      </section>

      <section className="card animate-float-in mt-6" id="dashboard">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Dashboard</p>
            <h2 className="section-title mt-2">Analysis overview</h2>
            <p className="section-copy">Stronger hierarchy helps users trust the score, domain, and role recommendations.</p>
          </div>
          <div className="badge">
            {status.loading ? "Analyzing resume..." : analysis ? "Analysis ready" : "Awaiting upload"}
          </div>
        </div>

        {status.loading ? (
          <LoadingCard />
        ) : analysis ? (
          <div className="mt-7 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.92fr_1.04fr_1.04fr]">
              <CandidateInsight candidate={analysis.candidate} />
              <ScoreHero score={analysis.resumeScore} experienceLevel={analysis.experienceLevel} />
              <DomainInsight domain={analysis.domain} confidence={domainConfidence} summary={analysis.summary} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <InsightSection icon="R" title="Suggested roles" subtitle="Only roles within the detected domain are shown.">
                <div className="space-y-3">
                  {analysis.suggestedRoles.map((role) => (
                    <RoleCard key={role.role} role={role} />
                  ))}
                </div>
              </InsightSection>

              <InsightSection icon="S" title="Detected skills" subtitle="Domain-specific and transferable signals found in the resume.">
                <ChipGroup values={analysis.skills} />
              </InsightSection>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <InsightSection icon="+" title="Strengths" subtitle="The strongest fit indicators for the top role.">
                <BulletList values={analysis.suggestedRoles[0]?.strengths ?? []} tone="positive" />
              </InsightSection>

              <InsightSection icon="!" title="Weaknesses" subtitle="The biggest gaps blocking stronger role fit right now.">
                <BulletList values={analysis.suggestedRoles[0]?.weaknesses ?? []} tone="warning" />
              </InsightSection>
            </div>

            <InsightSection icon="I" title="Improvements" subtitle="Fast, practical actions to make the resume stronger.">
              <BulletList values={analysis.suggestedRoles.flatMap((role) => role.improvements).slice(0, 6)} tone="neutral" />
            </InsightSection>
          </div>
        ) : (
          <EmptyCard />
        )}
      </section>

      <section className="card animate-float-in mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Recommendations</p>
            <h2 className="section-title mt-2">Job matches</h2>
            <p className="section-copy">Each card explains the fit, highlights gaps, and keeps the reasoning visible.</p>
          </div>
          <div className="badge">{matches.length || jobs.length} jobs reviewed</div>
        </div>

        {status.loading ? (
          <LoadingCard />
        ) : matches.length ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {matches.map((job) => (
              <JobRecommendationCard key={job.adzunaId} job={job} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
            <p className="text-base font-semibold text-slate-900">No recommendations yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Upload a resume to unlock job fit analysis, role reasoning, and structured improvements.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function UploadCard({
  file,
  uploadData,
  loading,
  error,
  onFileChange,
  onSubmit
}: {
  file: File | null;
  uploadData: ResumeUploadResponse | null;
  loading: boolean;
  error: string;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="card animate-float-in" id="upload">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">Upload</p>
          <h2 className="section-title mt-2">Start with the resume</h2>
          <p className="section-copy">A polished upload flow improves clarity from the first interaction.</p>
        </div>
        <div className="badge">PDF / DOCX</div>
      </div>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center transition duration-200 hover:border-blue-400 hover:bg-blue-50/60">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-200 group-hover:scale-105 group-hover:ring-blue-200">
            <span className="text-xl text-slate-600">+</span>
          </div>
          <p className="mt-4 text-base font-semibold text-slate-900">
            {file ? file.name : "Drop your resume here or click to browse"}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Upload a clean resume to detect the domain, evaluate role fit, and show targeted improvements.
          </p>
          <input
            className="sr-only"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="field min-w-0 flex-1 flex items-center justify-between gap-3">
            <span className="truncate text-sm text-slate-500">
              {file ? `Ready to analyze: ${file.name}` : "No file selected yet"}
            </span>
            {file ? <span className="badge border-blue-200 bg-blue-50 text-blue-700">Attached</span> : null}
          </div>

          <button className="button-primary w-full sm:w-auto sm:min-w-[220px]" disabled={loading} type="submit">
            {loading ? (
              <>
                <span className="spinner" />
                Analyzing resume...
              </>
            ) : (
              "Upload and Analyze"
            )}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-5 rounded-3xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
          <p className="font-semibold">Upload failed or file is invalid</p>
          <p className="mt-1 leading-6">{error}</p>
        </div>
      ) : null}

      {uploadData ? (
        <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50/80 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Resume uploaded successfully</p>
          <p className="mt-1 leading-6">The file is stored and ready for structured analysis.</p>
          <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm">
            {uploadData.fileName}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function ScoreHero({ score, experienceLevel }: { score: number; experienceLevel: string }) {
  return (
    <div className="min-w-0 rounded-[1.9rem] border border-blue-200 bg-gradient-to-br from-blue-600 to-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(37,99,235,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-100">Resume score</p>
          <p className="mt-3 text-5xl font-semibold tracking-tight">{score}</p>
          <p className="mt-2 text-sm text-blue-100">A high-level trust signal for resume strength.</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-blue-50">{experienceLevel}</div>
      </div>
      <ProgressBar className="mt-6 bg-white/20" fillClassName="bg-white" value={score} />
    </div>
  );
}

function CandidateInsight({
  candidate
}: {
  candidate: ResumeAnalysis["candidate"];
}) {
  const details = [
    { label: "Headline", value: candidate.headline },
    { label: "Email", value: candidate.email },
    { label: "Phone", value: candidate.phone },
    { label: "Location", value: candidate.location }
  ].filter((detail) => detail.value);

  return (
    <div className="min-w-0 rounded-[1.9rem] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Candidate profile</p>
          <h3 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950">{candidate.fullName || "Name not clearly found"}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">Basic identity details detected from the uploaded resume.</p>
        </div>
        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Resume owner</div>
      </div>
      <div className="mt-5 space-y-2">
        {details.length ? (
          details.map((detail) => (
            <div className="break-words rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600" key={detail.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{detail.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{detail.value}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Basic details were limited in the uploaded resume.
          </div>
        )}
      </div>
    </div>
  );
}

function DomainInsight({
  domain,
  confidence,
  summary
}: {
  domain: string;
  confidence: number;
  summary: string;
}) {
  return (
    <div className="min-w-0 rounded-[1.9rem] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Detected domain</p>
          <h3 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950">{domain}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{summary}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{confidence}% confidence</div>
      </div>
      <ProgressBar className="mt-6 bg-slate-100" fillClassName="bg-blue-600" value={confidence} />
    </div>
  );
}

function RoleCard({ role }: { role: SuggestedRole }) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 transition duration-200 hover:border-blue-200 hover:bg-blue-50/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="break-words font-semibold text-slate-950">{role.role}</p>
          <p className="mt-1 text-sm text-slate-500">Scored against the expectations of the detected domain.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm">{role.score}%</span>
      </div>
      <ProgressBar className="mt-4 bg-white" fillClassName="bg-blue-600" value={role.score} />
    </div>
  );
}

function InsightSection({
  icon,
  title,
  subtitle,
  children
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-lg font-semibold text-blue-700">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function JobRecommendationCard({ job }: { job: MatchedJob }) {
  return (
    <article className="group rounded-[1.9rem] border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">{job.title}</h3>
          <p className="mt-2 text-sm text-slate-500">
            {job.company} {" / "} {job.location}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Match {job.matchPercentage}%</div>
      </div>

      <ProgressBar className="mt-5 bg-slate-100" fillClassName="bg-blue-600" value={job.matchPercentage} />
      <p className="mt-5 line-clamp-4 text-sm leading-7 text-slate-600">{job.description}</p>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-950">Why this role?</p>
        <p className="mt-1 leading-6">{job.explanation || "Relevant role based on current skills and detected domain."}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <MiniPanel title="Strengths" values={job.strengths} tone="positive" />
        <MiniPanel title="Weaknesses" values={job.gaps.length ? job.gaps : job.missingSkills} tone="warning" />
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Improvements</p>
        <BulletList values={job.improvements ?? []} tone="neutral" />
      </div>

      <a
        className="button-secondary mt-5 w-full group-hover:border-blue-200 group-hover:text-blue-700 sm:w-auto"
        href={job.applyUrl}
        rel="noreferrer"
        target="_blank"
      >
        View job
      </a>
    </article>
  );
}

function MiniPanel({
  title,
  values,
  tone
}: {
  title: string;
  values: string[];
  tone: "positive" | "warning";
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "positive" ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"}`}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <BulletList values={values} tone={tone} />
    </div>
  );
}

function ChipGroup({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2.5 overflow-hidden">
      {values.map((value) => (
        <span className="chip break-words" key={value}>
          {value}
        </span>
      ))}
    </div>
  );
}

function BulletList({
  values,
  tone
}: {
  values: string[];
  tone: "positive" | "warning" | "neutral";
}) {
  if (!values.length) {
    return <p className="mt-3 text-sm text-slate-500">No items available yet.</p>;
  }

  const toneClass =
    tone === "positive"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : "bg-blue-500";

  return (
    <div className="mt-3 space-y-2">
      {values.map((value) => (
        <div className="flex items-start gap-3 text-sm text-slate-700" key={value}>
          <span className={`mt-2 h-2 w-2 rounded-full ${toneClass}`} />
          <span className="leading-6">{value}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({
  value,
  className,
  fillClassName
}: {
  value: number;
  className: string;
  fillClassName: string;
}) {
  return (
    <div className={`h-2.5 overflow-hidden rounded-full ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${fillClassName}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="mt-7 rounded-[1.75rem] border border-dashed border-blue-200 bg-blue-50/60 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
        <span className="spinner" />
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">Analyzing resume...</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        We are detecting the domain, evaluating role fit, and preparing a more trustworthy dashboard.
      </p>
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="mt-7 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <span className="text-lg text-slate-500">AI</span>
      </div>
      <p className="mt-4 text-base font-semibold text-slate-900">Structured results will appear here</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        The dashboard will show score, domain confidence, suggested roles, strengths, weaknesses, and improvements.
      </p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
