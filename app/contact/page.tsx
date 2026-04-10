export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Contact</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">Get in touch</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          Need help with resume parsing, job matching quality, or provider setup? Reach out using the details below.
        </p>
        <div className="mt-8 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">Email</p>
            <p className="mt-2 text-sm text-slate-600">support@rolematchai.example</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">Hours</p>
            <p className="mt-2 text-sm text-slate-600">Monday to Saturday, 9:00 AM to 7:00 PM IST</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">Response time</p>
            <p className="mt-2 text-sm text-slate-600">Usually within one business day</p>
          </div>
        </div>
      </section>
    </main>
  );
}
