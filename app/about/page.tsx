export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">About</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">RoleMatch AI</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          RoleMatch AI is a focused resume-to-job matcher built to help candidates understand their skills,
          identify the right domain, and get practical job recommendations from real provider-backed data.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["What it does", "Parses resumes, detects domain, expands likely roles, and scores job matches."],
            ["Who it helps", "Technology, pharma, finance, operations, support, healthcare, and general professional roles."],
            ["How it stays practical", "Uses structured parsing, dynamic role expansion, and live or cached job sources."]
          ].map(([title, copy]) => (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={title}>
              <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
