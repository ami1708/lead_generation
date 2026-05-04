"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function LandingPage() {
  const { data: session } = useSession();
  const [email,   setEmail]   = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit() {
    if (!email || !company) return;
    setLoading(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
    } finally { setSubmitted(true); setLoading(false); }
  }

  return (
    <main className="bg-[#080808] text-white min-h-screen overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: "rgba(8,8,8,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="font-serif text-xl font-bold tracking-tight">
          Sales<span style={{ color: "var(--teal)" }}>Dhan</span>
        </span>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-zinc-400 text-xs hidden sm:block">{session.user?.email}</span>
              <a href="/dashboard" className="btn-teal text-xs px-5 py-2.5">Dashboard →</a>
              <button onClick={() => signOut()} className="btn-ghost text-xs px-4 py-2.5">Sign out</button>
            </>
          ) : (
            <>
              <a href="#early-access" className="btn-ghost text-xs px-5 py-2.5">Get early access</a>
              <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="btn-teal text-xs px-5 py-2.5">Sign in →</button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[95vh] flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 dot-grid overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(0,229,160,0.09) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="anim-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold"
            style={{ background: "rgba(0,229,160,0.1)", border: "1px solid rgba(0,229,160,0.25)", color: "var(--teal)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--teal)", animation: "pulse-ring 2s infinite" }} />
            AI-Powered Lead Revival Engine
          </div>

          <h1 className="anim-fade-up delay-100 font-serif text-[clamp(3.2rem,7.5vw,6rem)] font-black leading-[0.95] tracking-tight mb-6">
            Your dead leads are<br />
            <span className="shimmer-text">revenue waiting</span><br />
            to be unlocked.
          </h1>

          <p className="anim-fade-up delay-200 text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Upload your cold leads. SalesDhan searches the web for funding rounds, hiring signals,
            and intent data — then scores every lead with AI so your team calls the right people first.
          </p>

          <div className="anim-fade-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/dashboard" className="btn-teal inline-flex items-center gap-2 px-9 py-4 text-sm teal-glow" style={{ fontSize: "0.95rem" }}>
              Try the live demo — no signup
              <span>→</span>
            </a>
            <a href="#early-access" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4">
              Request early access
            </a>
          </div>
        </div>

        {/* Floating demo card */}
        <div className="anim-fade-up delay-400 relative z-10 mt-16 float">
          <div className="card px-6 py-4 inline-flex items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              {[{ s: 9, n: "Rahul S." }, { s: 7, n: "Priya P." }, { s: 3, n: "Amit S." }].map((l) => (
                <div key={l.n} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: l.s >= 8 ? "rgba(74,222,128,0.15)" : l.s >= 5 ? "rgba(250,204,21,0.15)" : "rgba(248,113,113,0.15)",
                      color: l.s >= 8 ? "#4ade80" : l.s >= 5 ? "#facc15" : "#f87171",
                      border: `1px solid ${l.s >= 8 ? "rgba(74,222,128,0.3)" : l.s >= 5 ? "rgba(250,204,21,0.3)" : "rgba(248,113,113,0.3)"}`,
                    }}>
                    {l.s}
                  </span>
                  <span className="text-zinc-300 text-xs">{l.n}</span>
                </div>
              ))}
            </div>
            <div className="border-l border-white/10 pl-5">
              <p className="text-zinc-500 text-xs">AI scored</p>
              <p className="text-white font-semibold text-sm">1,247 leads</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        className="py-12 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {[
            { n: "3–5×",   d: "Higher conversion on warm vs cold leads" },
            { n: "1,000+", d: "Dead leads in the average sales database" },
            { n: "₹0",     d: "Extra spend to recover them" },
          ].map((s) => (
            <div key={s.n} className="px-10 first:pl-0 last:pr-0 text-center sm:text-left">
              <p className="font-serif text-4xl font-black mb-1" style={{ color: "var(--teal)" }}>{s.n}</p>
              <p className="text-zinc-400 text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section className="py-28 px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="label mb-4">The problem</p>
          <h2 className="font-serif text-5xl font-black leading-tight mb-5">Every sales team has a graveyard.</h2>
          <p className="text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Leads who said &ldquo;follow up in 3 months.&rdquo; Your team forgot.
            They bought from a competitor. That&apos;s money you already spent acquiring — left on the table.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Before */}
          <div className="card p-7" style={{ borderColor: "rgba(248,113,113,0.15)", background: "rgba(248,113,113,0.04)" }}>
            <p className="label mb-5" style={{ color: "#f87171" }}>Without SalesDhan</p>
            <ul className="space-y-4">
              {[
                "1,000 leads dumped with zero priority or context",
                "Agents call cold — no brief, no talking points",
                "Generic 'just checking in' emails nobody opens",
                "Hot leads buried at the bottom of the list",
                "Revenue leaking every month from ignored leads",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="mt-0.5 text-xs flex-shrink-0" style={{ color: "#f87171" }}>✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="card p-7" style={{ borderColor: "rgba(0,229,160,0.2)", background: "rgba(0,229,160,0.04)" }}>
            <p className="label mb-5" style={{ color: "var(--teal)" }}>With SalesDhan</p>
            <ul className="space-y-4">
              {[
                "Every lead scored — hottest ones surface instantly",
                "AI sends warm personalized messages before you call",
                "Agents get a full brief — budget, objections, history",
                "Interested leads auto-pushed back into your CRM",
                "Recovered revenue from leads you already paid for",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-200">
                  <span className="mt-0.5 text-xs flex-shrink-0" style={{ color: "var(--teal)" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="py-28 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="label mb-4">How it works</p>
            <h2 className="font-serif text-5xl font-black leading-tight">Connect once. AI handles the rest.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", title: "Connect your CRM", body: "HubSpot, Salesforce, Zoho, Pipedrive, Teamgate. Your dead leads pull in automatically." },
              { n: "02", title: "AI scores every lead", body: "Live web search finds funding rounds, hiring activity, and intent signals. Precise revival scores." },
              { n: "03", title: "Auto warm-up", body: "Personalized WhatsApp & email before any call. By the time you ring, they already know why." },
              { n: "04", title: "Your team closes", body: "Agent gets a call brief. Interested leads push back to your CRM with full history." },
            ].map((s, i) => (
              <div key={s.n} className="card p-6 group" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="font-serif text-4xl font-black mb-4 block" style={{ color: "var(--teal)", opacity: 0.7 }}>{s.n}</span>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI SIGNALS ── */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="py-28 px-8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="label mb-5">Intelligence layer</p>
            <h2 className="font-serif text-5xl font-black leading-tight mb-5">
              Scores from<br />the entire internet.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Before scoring each lead, SalesDhan searches the web for real buying signals.
              A company that raised funding last month scores dramatically higher — and your
              agent&apos;s message reflects that.
            </p>
            <a href="/dashboard" className="btn-teal inline-flex items-center gap-2 px-7 py-3.5 text-sm teal-glow">
              Try the live demo →
            </a>
          </div>
          <div className="space-y-3">
            {[
              { icon: "💰", label: "Funding detection",    detail: "Raised money recently → +2 score",     highlight: true },
              { icon: "🎯", label: "Active intent",        detail: "Evaluating similar tools → +2 score",   highlight: true },
              { icon: "👥", label: "Hiring signals",       detail: "Building a team that needs you → +1",   highlight: false },
              { icon: "📈", label: "Company growth",       detail: "Expanding = more budget → +1 score",    highlight: false },
              { icon: "🔍", label: "Competitor activity",  detail: "Reviewed G2/Capterra recently → +1",    highlight: false },
            ].map((f) => (
              <div key={f.label} className="card flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm font-medium text-zinc-200">{f.label}</span>
                </div>
                <span className={`text-xs font-medium ${f.highlight ? "" : "text-zinc-500"}`}
                  style={f.highlight ? { color: "var(--teal)" } : {}}>
                  {f.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CRM LOGOS ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="py-10 px-8">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">
          <span className="label mr-4">Connects with</span>
          {["Teamgate", "HubSpot", "Salesforce", "Zoho CRM", "Pipedrive", "Freshsales"].map((c) => (
            <span key={c} className="px-4 py-2 text-xs text-zinc-400 rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ── EARLY ACCESS ── */}
      <section id="early-access" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="py-28 px-8">
        <div className="max-w-md mx-auto text-center">
          {submitted ? (
            <div className="space-y-5 anim-fade-up">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl teal-glow"
                style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,0.3)" }}>🎉</div>
              <h2 className="font-serif text-4xl font-black">You&apos;re in.</h2>
              <p className="text-zinc-400 leading-relaxed">We&apos;ll reach out personally within 24 hours. You&apos;re one of the first 50.</p>
              <a href="/dashboard" className="btn-teal inline-flex items-center gap-2 px-7 py-3.5 text-sm teal-glow">
                Try the product now →
              </a>
            </div>
          ) : (
            <>
              <p className="label mb-5">Early access</p>
              <h2 className="font-serif text-5xl font-black mb-4 leading-tight">First 50 teams.<br />Free.</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-10">
                We onboard every early customer personally. No credit card. No automated onboarding email.
              </p>
              <div className="space-y-3 text-left">
                <input type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} className="inp" />
                <input type="text" placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} className="inp" />
                <button onClick={handleSubmit} disabled={loading || !email || !company}
                  className="btn-teal w-full h-12 text-sm teal-glow">
                  {loading ? "Submitting…" : "Request early access"}
                </button>
              </div>
              <p className="text-zinc-600 text-xs mt-4">No spam. No credit card.</p>
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        className="py-7 px-8 flex items-center justify-between max-w-5xl mx-auto text-zinc-600 text-xs">
        <span className="font-serif font-bold text-zinc-400">SalesDhan</span>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
