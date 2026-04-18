"use client";

import { useState } from "react";
import type { ProcessedLead, Lead } from "@/app/api/process-leads/route";

const DEMO_CSV = `name,company,contact,interest,lastContact,reason,budget,notes
Rahul Mehta,Zomato,rahul.mehta@zomato.com,Sales CRM,7 months ago,Waiting for Q3 budget cycle,2.5L/month,Very interested - ran a 2-week trial. Said call us in Q3
Priya Sharma,Razorpay,priya.sharma@razorpay.com,Revenue Automation,5 months ago,Restructuring after funding round,4L/month,Was close to signing - legal reviewed contract. New VP Sales joined
Amit Joshi,Meesho,amit.joshi@meesho.com,Lead Scoring,9 months ago,Chose competitor LeadSquared but unhappy after 3 months,1.8L/month,Ran a bake-off with us. We won on features but lost on price
Kavya Nair,Swiggy,kavya.nair@swiggy.com,Sales Automation,4 months ago,Headcount freeze until H2,3L/month,Inbound lead - their sales head reached out directly. Very high intent
Rohan Gupta,Zepto,rohan.gupta@zepto.com,CRM Analytics,6 months ago,Price was 40% over budget,80K/month,Fast-growing team - 3x sales team in 6 months. Very engaged in demo
Sneha Patel,CRED,sneha.patel@cred.club,Sales Enablement,11 months ago,Ghosted after pricing call,6L/month,Initial call was very positive. Went silent after proposal was sent
Arjun Reddy,PhonePe,arjun.reddy@phonepe.com,Sales Analytics,8 months ago,Compliance flagged data residency,5L/month,Large deal - 200-seat license. Only blocker was India-only hosting
Divya Krishnan,Groww,divya.krishnan@groww.in,Outbound Automation,3 months ago,Too early - only 5 sales reps,60K/month,Warm conversation. Moving from founder-led to team sales. Very open`;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim());
    return headers.reduce(
      (o, h, i) => ({ ...o, [h]: vals[i] || "" }),
      {} as Record<string, string>
    );
  });
}

function ScoreCircle({ score, size = 36 }: { score: number; size?: number }) {
  const color = score >= 8 ? "#4ade80" : score >= 5 ? "#facc15" : "#f87171";
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-black flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {score}
    </span>
  );
}

function TierBadge({ score }: { score: number }) {
  if (score >= 8) return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>HOT</span>;
  if (score >= 5) return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>WARM</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>COLD</span>;
}

export default function Dashboard() {
  const [csv, setCsv]         = useState(DEMO_CSV);
  const [bizName, setBizName] = useState("");
  const [product, setProduct] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [results, setResults]       = useState<ProcessedLead[]>([]);
  const [sel, setSel]               = useState<ProcessedLead | null>(null);
  const [err, setErr]               = useState("");
  const [activeFilter, setActiveFilter] = useState<"all"|"hot"|"warm"|"cold">("all");

  const border = "1px solid rgba(255,255,255,0.09)";

  async function run() {
    const rows = parseCSV(csv);
    if (!rows.length) { setErr("Could not parse CSV — check the format."); return; }

    setErr("");
    setProcessing(true);
    setProgress(10);

    const leads: Lead[] = rows.map((r) => ({
      name:        r.name || "",
      company:     r.company || "",
      contact:     r.contact || r.email || r.phone || "",
      interest:    r.interest || "",
      lastContact: r.lastContact || "",
      reason:      r.reason || "",
      budget:      r.budget || "",
      notes:       r.notes || "",
    }));

    const ticker = setInterval(() => setProgress((p) => Math.min(p + 3, 88)), 1000);

    try {
      const r = await fetch("/api/process-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads, businessName: bizName || "our company", product: product || "our product" }),
      });
      clearInterval(ticker);
      setProgress(98);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Processing failed");
      setResults(d.leads);
      setSel(d.leads[0] || null);
      setProgress(100);
    } catch (e) {
      clearInterval(ticker);
      setErr(e instanceof Error ? e.message : "Something went wrong. Check your API keys.");
    } finally {
      setProcessing(false);
    }
  }

  function exportCSV() {
    const rows = results.map((l) => [
      l.score, l.name, l.company || "", l.contact, l.interest,
      `"${(l.scoreReason || "").replace(/"/g, "'")}"`,
      l.lastContact, l.budget || "",
    ]);
    const text = [["Score","Name","Company","Contact","Interest","Score Reason","Last Contact","Budget"], ...rows]
      .map((r) => r.join(",")).join("\n");
    Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([text], { type: "text/csv" })),
      download: "revived_leads.csv",
    }).click();
  }

  // ── PROCESSING OVERLAY ─────────────────────────────────────────────────────
  if (processing) {
    const steps = [
      { label: "Parsing lead data",                               done: progress > 15 },
      { label: "Searching web for funding & intent signals",      done: progress > 45 },
      { label: "Scoring each lead with Claude AI",                done: progress > 75 },
      { label: "Ranking by revival likelihood",                   done: progress > 90 },
    ];
    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col">
        <header className="flex items-center px-8 py-4" style={{ borderBottom: border }}>
          <span className="font-serif font-bold text-lg">Revive<span style={{ color: "var(--teal)" }}>IQ</span></span>
        </header>
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-sm w-full">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-8"
              style={{ background: "rgba(0,229,160,0.1)", border: "1px solid rgba(0,229,160,0.25)" }}>🤖</div>
            <h2 className="font-serif text-3xl font-black mb-2">Scoring leads…</h2>
            <p className="text-zinc-500 text-sm mb-8">Live web search + AI scoring running in parallel.</p>
            <div className="space-y-3 mb-8">
              {steps.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs transition-all"
                    style={{
                      background: s.done ? "rgba(0,229,160,0.15)" : "rgba(255,255,255,0.05)",
                      border: s.done ? "1px solid rgba(0,229,160,0.4)" : border,
                      color: s.done ? "var(--teal)" : "transparent",
                    }}>✓</span>
                  <span className={`text-sm transition-colors ${s.done ? "text-zinc-300" : "text-zinc-600"}`}>{s.label}</span>
                </div>
              ))}
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "var(--teal)" }} />
            </div>
            <p className="text-zinc-600 text-xs mt-2 font-mono">{progress}%</p>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (results.length > 0) {
    const hot  = results.filter(l => l.score >= 8).length;
    const warm = results.filter(l => l.score >= 5 && l.score < 8).length;
    const cold = results.filter(l => l.score < 5).length;
    const filtered = results.filter(l =>
      activeFilter === "hot" ? l.score >= 8 :
      activeFilter === "warm" ? l.score >= 5 && l.score < 8 :
      activeFilter === "cold" ? l.score < 5 : true
    );

    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4"
          style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(12px)", borderBottom: border }}>
          <a href="/" className="font-serif font-bold text-lg">Revive<span style={{ color: "var(--teal)" }}>IQ</span></a>
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 text-xs">{results.length} leads scored</span>
            <button onClick={exportCSV} className="btn-ghost text-xs px-4 py-2">Export CSV</button>
            <button onClick={() => { setResults([]); setSel(null); setActiveFilter("all"); setCsv(DEMO_CSV); }}
              className="btn-teal text-xs px-4 py-2">New batch</button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-6">
          {/* Metric row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total",  sub: "leads processed",  n: results.length, color: "rgba(255,255,255,0.8)", filter: "all"  as const },
              { label: "Hot",    sub: "call this week",    n: hot,            color: "#4ade80",               filter: "hot"  as const },
              { label: "Warm",   sub: "call this month",   n: warm,           color: "#facc15",               filter: "warm" as const },
              { label: "Cold",   sub: "low priority",      n: cold,           color: "#f87171",               filter: "cold" as const },
            ].map((s) => (
              <button key={s.label} onClick={() => setActiveFilter(s.filter)}
                className="card p-5 text-left transition-all"
                style={{ borderColor: activeFilter === s.filter ? s.color + "50" : undefined, background: activeFilter === s.filter ? s.color + "08" : undefined }}>
                <p className="font-serif text-4xl font-black mb-1" style={{ color: s.color }}>{s.n}</p>
                <p className="text-zinc-200 text-sm font-semibold">{s.label}</p>
                <p className="text-zinc-600 text-xs">{s.sub}</p>
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Ranked list */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <p className="label">Ranked by AI score</p>
                {activeFilter !== "all" && (
                  <button onClick={() => setActiveFilter("all")} className="text-zinc-600 text-xs hover:text-zinc-400">Show all</button>
                )}
              </div>
              <div className="space-y-1">
                {filtered.map((lead, i) => (
                  <button key={i} onClick={() => setSel(lead)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: sel?.contact === lead.contact ? "rgba(255,255,255,0.07)" : "transparent",
                      border: sel?.contact === lead.contact ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent",
                    }}>
                    <ScoreCircle score={lead.score} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{lead.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{lead.company || lead.interest}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lead.signals && lead.signals.scoreBoost > 0 && (
                        <span className="text-xs font-mono font-bold" style={{ color: "var(--teal)" }}>+{lead.signals.scoreBoost}</span>
                      )}
                      <TierBadge score={lead.score} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            {sel && (
              <div className="lg:col-span-3 space-y-4">
                <div className="card p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <ScoreCircle score={sel.score} size={56} />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="font-serif text-2xl font-black">{sel.name}</h2>
                        <TierBadge score={sel.score} />
                      </div>
                      <p className="text-zinc-400 text-sm">{sel.company && `${sel.company} · `}{sel.contact}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border }}>
                    <p className="label mb-1.5">AI score reason</p>
                    <p className="text-zinc-200 text-sm leading-relaxed italic">&ldquo;{sel.scoreReason}&rdquo;</p>
                  </div>
                </div>

                {sel.signals && sel.signals.scoreBoost > 0 && (
                  <div className="card overflow-hidden" style={{ borderColor: "rgba(168,85,247,0.25)" }}>
                    <div className="px-5 py-3 flex items-center justify-between"
                      style={{ borderBottom: "1px solid rgba(168,85,247,0.12)", background: "rgba(168,85,247,0.06)" }}>
                      <div>
                        <p className="label" style={{ color: "#c084fc" }}>Live web signals</p>
                        <p className="text-zinc-600 text-xs mt-0.5">Found by Tavily search</p>
                      </div>
                      <span className="text-sm font-black px-3 py-1 rounded-full" style={{ background: "rgba(168,85,247,0.12)", color: "#c084fc" }}>
                        +{sel.signals.scoreBoost} boost
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {[
                        { icon: "💰", label: "Funding",       v: sel.signals.recentFunding },
                        { icon: "👥", label: "Hiring",         v: sel.signals.hiringSignals },
                        { icon: "🎯", label: "Intent signals", v: sel.signals.intentSignals },
                        { icon: "🔍", label: "Competitors",    v: sel.signals.competitorEngagement },
                        { icon: "📈", label: "Growth",         v: sel.signals.companyGrowth },
                      ].filter((s) => s.v && s.v.length > 20).map((s) => (
                        <div key={s.label} className="px-5 py-3">
                          <p className="label mb-1 flex items-center gap-1.5"><span>{s.icon}</span>{s.label}</p>
                          <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">{s.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: "Last contact",  v: sel.lastContact },
                    { l: "Budget signal", v: sel.budget || "Not mentioned" },
                    { l: "Why went cold", v: sel.reason },
                    { l: "Interest",      v: sel.interest },
                  ].map((m) => (
                    <div key={m.l} className="card px-4 py-3">
                      <p className="label mb-1">{m.l}</p>
                      <p className="text-zinc-200 text-sm leading-snug">{m.v}</p>
                    </div>
                  ))}
                </div>

                {sel.notes && (
                  <div className="card px-5 py-4">
                    <p className="label mb-2">Notes</p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{sel.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── IMPORT FORM ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-4" style={{ borderBottom: border }}>
        <a href="/" className="font-serif font-bold text-lg">Revive<span style={{ color: "var(--teal)" }}>IQ</span></a>
        <span className="text-zinc-600 text-xs">AI Lead Revival Engine</span>
      </header>

      <div className="flex-1 flex items-start justify-center px-8 py-12">
        <div className="w-full max-w-xl space-y-6">

          <div>
            <h1 className="font-serif text-3xl font-black mb-1">Score your dead leads</h1>
            <p className="text-zinc-500 text-sm">Demo data is pre-loaded. Hit the button to see it work.</p>
          </div>

          {/* Optional context */}
          <div className="grid grid-cols-2 gap-2.5">
            <input className="inp" placeholder="Company name (optional)" value={bizName} onChange={(e) => setBizName(e.target.value)} />
            <input className="inp" placeholder="What you sell (optional)" value={product}  onChange={(e) => setProduct(e.target.value)} />
          </div>

          {/* CSV */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label">Lead data — CSV</p>
              <button onClick={() => setCsv(DEMO_CSV)} className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors">Reset demo data</button>
            </div>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              className="w-full rounded-xl p-4 font-mono text-xs text-zinc-300 placeholder:text-zinc-700 resize-none outline-none"
              style={{ background: "rgba(255,255,255,0.03)", border, minHeight: "260px" }}
            />
            <p className="text-zinc-700 text-xs mt-1.5">Columns: name, company, contact, interest, lastContact, reason, budget, notes</p>
          </div>

          {err && (
            <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {err}
            </div>
          )}

          <button
            onClick={run}
            disabled={!csv.trim()}
            className="btn-teal w-full text-sm font-semibold teal-glow"
            style={{ height: "52px" }}
          >
            Score leads with AI →
          </button>

          <p className="text-zinc-700 text-xs text-center">
            Tavily searches the web per lead · Claude AI scores 1–10 · Results ranked by revival likelihood
          </p>
        </div>
      </div>
    </div>
  );
}
