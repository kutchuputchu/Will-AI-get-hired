"use client";

import { useState } from "react";
import { JobListing, MatchedJob, ResumeAnalysis, ResumeUploadResponse } from "@/types";

type Status = {
  loading: boolean;
  error: string;
};

export function DashboardModern() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<ResumeUploadResponse | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [status, setStatus] = useState<Status>({ loading: false, error: "" });

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
      {/* Hero: introduces the product and pushes the primary upload CTA above the fold. */}
      <section className="surface animate-float-in relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />
        <div className="absolute -right-16 top-10 hidden h-48 w-48 rounded-full bg-blue-500/10 blur-3xl lg:block" />
        <div className="absolute -left-12 bottom-0 hidden h-40 w-40 rounded-full bg-slate-900/5 blur-3xl lg:block" />

        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="badge">
              <span className="h-2 w-2 rounded-full bg-blue-500 pulse-ring" />
              AI resume review for modern job seekers
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
              Turn a resume into a clearer hiring signal in one polished workflow.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Upload a resume, extract skills instantly, score it with AI, and surface matching roles in a format that feels like a modern SaaS product.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a className="button-primary" href="#upload">
                Analyze My Resume
              </a>
              <a className="button-secondary" href="#results">
                View Results Layout
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="stat-card">
                <p className="text-sm text-slate-500">Resume parsing</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">PDF + DOCX</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-500">Output quality</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Skills + score</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-500">Job matching</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Ranked results</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200/10 bg-slate-950 p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">Workflow preview</p>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">3-step scan</span>
            </div>

            <div className="mt-6 space-y-4">
              {[
                "Upload and extract resume text",
                "Analyze strengths and missing skills",
                "Compare against matching jobs"
              ].map((item, index) => (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4" key={item}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{item}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        Structured outputs keep the experience readable and useful on both desktop and mobile.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core workflow: upload and analysis sit side by side on desktop, stack on mobile. */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="card animate-float-in" id="upload">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">Step 1</p>
              <h2 className="section-title mt-2">Upload your resume</h2>
              <p className="section-copy">A centered, guided input flow keeps the first action obvious and low-friction.</p>
            </div>
            <div className="badge">PDF / DOCX</div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center transition duration-200 hover:border-blue-400 hover:bg-blue-50/60">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-200 group-hover:scale-105 group-hover:ring-blue-200">
                <span className="text-xl text-slate-600">+</span>
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">
                {file ? file.name : "Drop your resume here or click to browse"}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Upload a clean PDF or DOCX file to extract resume content and generate a hiring-readiness summary.
              </p>
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="field min-w-0 flex-1 flex items-center justify-between gap-3">
                <span className="truncate text-sm text-slate-500">
                  {file ? `Ready to analyze: ${file.name}` : "No file selected yet"}
                </span>
                {file ? <span className="badge border-blue-200 bg-blue-50 text-blue-700">Attached</span> : null}
              </div>

              <button className="button-primary w-full sm:w-auto sm:min-w-[220px]" disabled={status.loading} type="submit">
                {status.loading ? (
                  <>
                    <span className="spinner" />
                    Processing
                  </>
                ) : (
                  "Upload and Analyze"
                )}
              </button>
            </div>
          </form>

          {status.error ? (
            <div className="mt-5 rounded-3xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
              <p className="font-semibold">Something needs attention</p>
              <p className="mt-1 leading-6">{status.error}</p>
            </div>
          ) : null}

          {uploadData ? (
            <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50/80 p-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Upload complete</p>
              <p className="mt-1 leading-6">Stored successfully and ready for analysis.</p>
              <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm">
                {uploadData.fileName}
              </p>
            </div>
          ) : null}
        </div>

        <div className="card animate-float-in" id="results">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">Step 2</p>
              <h2 className="section-title mt-2">Resume analysis</h2>
              <p className="section-copy">Structured cards make the score, summary, and skills easier to scan at a glance.</p>
            </div>
            <div className="badge">{analysis ? "Analysis ready" : "Waiting for upload"}</div>
          </div>

          {analysis ? (
            <div className="mt-7 space-y-4 text-sm text-slate-700">
              <div className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50/90 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Summary</p>
                <p className="mt-3 text-base leading-7 text-slate-700">{analysis.summary}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Experience level</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{analysis.experienceLevel}</p>
                </div>

                <div className="rounded-[1.75rem] border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">Resume score</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{analysis.resumeScore}/100</p>
                  <div className="mt-4 h-2 rounded-full bg-white/80">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${analysis.resumeScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200/70 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Detected skills</p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {analysis.skills.map((skill) => (
                    <span className="chip" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">Missing skills</p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {analysis.missingSkills.map((skill) => (
                    <span className="chip border-amber-200 bg-white text-amber-900" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-7 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <span className="text-lg text-slate-500">AI</span>
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">Your analysis will appear here</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Upload a resume to generate a score, identify strengths, and highlight missing skills.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Results grid: each job stays self-contained so scanning and comparison feel fast. */}
      <section className="card animate-float-in mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Step 3</p>
            <h2 className="section-title mt-2">Job recommendations</h2>
            <p className="section-copy">A cleaner results view makes the ranking and skill gaps feel actionable instead of noisy.</p>
          </div>
          <div className="badge">{jobs.length} jobs loaded</div>
        </div>

        {matches.length ? (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {matches.map((job) => (
              <article
                className="group rounded-[1.9rem] border border-slate-200/80 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                key={job.adzunaId}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">{job.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {job.company} {" / "} {job.location}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                    Match {job.matchPercentage}%
                  </div>
                </div>

                <p className="mt-5 line-clamp-4 text-sm leading-7 text-slate-600">{job.description}</p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  {job.skills.map((skill) => (
                    <span className="chip bg-slate-50" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>

                {job.missingSkills.length ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                    Missing skills: {job.missingSkills.join(", ")}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
                    Strong alignment with the detected requirements.
                  </div>
                )}

                <a
                  className="button-secondary mt-5 w-full group-hover:border-blue-200 group-hover:text-blue-700 sm:w-auto"
                  href={job.applyUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View job
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
            <p className="text-base font-semibold text-slate-900">No recommendations yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Once analysis is complete, matching jobs will appear here in a structured, card-based layout.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
