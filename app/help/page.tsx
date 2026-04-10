export default function HelpPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Help</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">How to use RoleMatch AI</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["1. Upload", "Upload a PDF resume from the AI Job Matcher page."],
            ["2. Review results", "See extracted skills, score, domain, and matching jobs."],
            ["3. Improve fit", "Use missing skills and why-match signals to improve applications."]
          ].map(([title, copy]) => (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={title}>
              <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-semibold text-slate-950">Why some jobs may look cached</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            To stay within free-tier limits, job provider responses are cached in Supabase for 24 hours.
            If a provider limit is close, the app uses cached or fallback results instead of failing.
          </p>
        </div>
      </section>
    </main>
  );
}
