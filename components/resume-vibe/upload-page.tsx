"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, ChefHat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResumeAnalysis, ResumeUploadResponse } from "@/types";

export function ResumeMatcherUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!file) {
      setError("Choose a PDF resume first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const uploadRes = await fetch("/api/resumes/upload", { method: "POST", body: formData });
      const uploadData = (await uploadRes.json()) as ResumeUploadResponse | { error: string };
      if (!uploadRes.ok || "error" in uploadData) {
        throw new Error("error" in uploadData ? uploadData.error : "Upload failed.");
      }

      const analysisRes = await fetch("/api/resumes/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeId: uploadData.resumeId, text: uploadData.text })
      });
      const analysisData = (await analysisRes.json()) as ResumeAnalysis | { error: string };
      if (!analysisRes.ok || "error" in analysisData) {
        throw new Error("error" in analysisData ? analysisData.error : "Analysis failed.");
      }

      const jobsRes = await fetch(
        `/api/jobs?skills=${encodeURIComponent(analysisData.skills.join(","))}&domain=${encodeURIComponent(
          analysisData.domain
        )}&roles=${encodeURIComponent(analysisData.suggestedRoles.map((role) => role.role).join(","))}&location=${encodeURIComponent(
          "Indore"
        )}&remote=true`
      );
      const jobsPayload = (await jobsRes.json()) as { jobs?: unknown[]; error?: string };
      if (!jobsRes.ok) {
        throw new Error(jobsPayload.error ?? "Job fetch failed.");
      }

      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resumeId: uploadData.resumeId,
          resumeText: uploadData.text,
          resumeSkills: analysisData.skills,
          suggestedRoles: analysisData.suggestedRoles.map((role) => role.role),
          domain: analysisData.domain,
          jobs: jobsPayload.jobs ?? []
        })
      });
      const matchPayload = await matchRes.json();
      if (!matchRes.ok) {
        throw new Error(matchPayload.error ?? "Matching failed.");
      }

      router.push(`/resume-vibe/results/${uploadData.resumeId}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          <Sparkles className="h-3.5 w-3.5" />
          RoleMatch AI
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">
          Upload one resume. Get the best matching jobs.
        </h1>
        <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">
          A focused AI resume-to-job matcher for India-first roles. Live recommendations are sourced through integrated free-tier providers like JSearch, Mantiks, and Adzuna.
        </p>
      </div>

      <Card className="mt-10 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center transition hover:border-cyan-400 hover:bg-cyan-50/60">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-cyan-700 shadow-sm ring-1 ring-slate-200">
              <FileUp className="h-8 w-8" />
            </div>
            <p className="mt-5 text-xl font-semibold text-slate-950">
              {file ? file.name : "Drop your PDF resume here or tap to upload"}
            </p>
            <p className="mt-3 max-w-lg text-sm leading-7 text-slate-500">
              We extract skills, infer the actual domain, expand to relevant job families, and recommend real jobs.
            </p>
            <input
              className="sr-only"
              accept=".pdf,application/pdf"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">What happens next</p>
            <div className="mt-5 space-y-3">
              {[
                "Parse the resume into real skills and experience signals",
                "Detect the right domain instead of assuming technology",
                "Expand into 10 to 20 matching job roles",
                "Score live job matches with missing skills"
              ].map((item, index) => (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3" key={item}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-sm font-semibold text-cyan-700">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-slate-700">{item}</span>
                </div>
              ))}
            </div>

            <Button className="mt-6 w-full" disabled={loading} onClick={handleAnalyze}>
              {loading ? "Cooking..." : "Analyze Resume"}
            </Button>
            {loading ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                <ChefHat className="h-4 w-4" />
                Cooking your results page...
              </div>
            ) : null}
            {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
