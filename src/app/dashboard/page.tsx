"use client";

import { useState } from "react";
import type { ProcessedLead, Lead } from "@/app/api/process-leads/route";

// ── Demo data — realistic Indian B2B sales leads ─────────────────────────────
const DEMO_CSV = `name,company,contact,interest,lastContact,reason,budget,notes
Rahul Mehta,Zomato,rahul.mehta@zomato.com,Sales CRM & Pipeline Management,7 months ago,Waiting for Q3 budget cycle to open,2.5L/month,Very interested — ran a 2-week trial, loved the reporting module. Said "call us in Q3"
Priya Sharma,Razorpay,priya.sharma@razorpay.com,Revenue Operations Automation,5 months ago,Internal restructuring after funding round froze non-critical tools,4L/month,Was close to signing — had legal review the contract. New VP Sales joined
Amit Joshi,Meesho,amit.joshi@meesho.com,Lead Scoring & Enrichment,9 months ago,Chose a competitor (LeadSquared) but said they were unhappy after 3 months,1.8L/month,Ran a bake-off with us and LeadSquared. We won on features but lost on price
Kavya Nair,Swiggy,kavya.nair@swiggy.com,B2B Sales Automation,4 months ago,Team headcount freeze — no budget for new tools until H2,3L/month,Inbound lead — their sales head reached out to us. Very high intent
Rohan Gupta,Zepto,rohan.gupta@zepto.com,CRM Integration & Analytics,6 months ago,Said price was 40% over budget — asked if we could do a startup plan,80K/month,Fast-growing team, 3x'd their sales team in 6 months. Very engaged in demo
Sneha Patel,CRED,sneha.patel@cred.club,Enterprise Sales Enablement,11 months ago,Ghosted after pricing call — no response to 4 follow-ups,6L/month,Initial call was very positive. Went silent after we sent the proposal
Arjun Reddy,PhonePe,arjun.reddy@phonepe.com,Sales Analytics & Forecasting,8 months ago,Compliance review flagged data residency concerns — needed India-only hosting,5L/month,Large deal — 200-seat license. Only blocker was data residency
Divya Krishnan,Groww,divya.krishnan@groww.in,Outbound Sales Automation,3 months ago,Too early — only 5 sales reps at the time. Said check back when team hits 20,60K/month,Warm conversation. Founder-led sales moving to a team. Very open to tools`;

const CRM_OPTIONS = [
  { id: "hubspot",    name: "HubSpot",    keyLabel: "Private App Token",  keyHelp: "Settings → Integrations → Private Apps" },
  { id: "pipedrive",  name: "Pipedrive",  keyLabel: "API Token",          keyHelp: "Settings → Personal Preferences → API" },
  { id: "zoho",       name: "Zoho CRM",   keyLabel: "OAuth Access Token", keyHelp: "Zoho API Console → Self Client" },
  { id: "salesforce", name: "Salesforce", keyLabel: "Access Token",       keyHelp: "Setup → My Personal Information → Security Token" },
  { id: "teamgate",   name: "Teamgate",   keyLabel: "API Key",            keyHelp: "Settings → API → copy your API key" },
];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const vals: string[] = [];
    let cur = "", inQuote = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuote = !inQuote; }
      else if (line[i] === "," && !inQuote) { vals.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    vals.push(cur.trim());
    return headers.reduce((o, h, i) => ({ ...o, [h]: vals[i] || "" }), {} as Record<string, string>);
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

type Step = "setup" | "upload" | "processing" | "results";
type ImportMode = "csv" | "crm";

export default function Dashboard() {
  const [step, setStep]       = useState<Step>("setup");
  const [importMode, setImportMode] = useState<ImportMode>("csv");
  const [bizName, setBizName] = useState("");
  const [product, setProduct] = useState("");
  const [csv, setCsv]         = useState(DEMO_CSV);
  const [crm, setCrm]         = useState(CRM_OPTIONS[0]);
  const [apiKey, setApiKey]   = useState("");
  const [crmLeads, setCrmLeads] = useState<Lead[]>([]);
  const [crmBusy, setCrmBusy] = useState(false);
  const [crmErr, setCrmErr]   = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedLead[]>([]);
  const [sel, setSel]         = useState<ProcessedLead | null>(null);
  const [err, setErr]         = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "hot" | "warm" | "cold">("all");

  async function connectCrm() {
    setCrmBusy(true); setCrmErr(""); setCrmLeads([]);
    try {
      const r = await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ crm: crm.id, apiKey }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to connect");
      setCrmLeads(d.leads);
    } catch (e) { setCrmErr(e instanceof Error ? e.message : "Connection failed"); }
    finally { setCrmBusy(false); }
  }

  async function run() {
    setStep("processing"); setErr(""); setProgress(10);

    let leads: Lead[] = [];
    if (importMode === "csv") {
      const rows = parseCSV(csv);
      if (!rows.length) { setErr("Could not parse CSV — check the format."); setStep("upload"); return; }
      leads = rows.map((r) => ({
        name: r.name || "",
        company: r.company || "",
        contact: r.contact || r.email || r.phone || "",
        interest: r.interest || "",
        lastContact: r.lastContact || "",
        reason: r.reason || "",
        budget: r.budget || "",
        notes: r.notes || "",
      }));
    } else {
      if (!crmLeads.length) { setErr("No leads loaded from CRM."); setStep("upload"); return; }
      leads = crmLeads;
    }

    // Animate progress while processing
    const ticker = setInterval(() => setProgress((p) => Math.min(p + 4, 88)), 1200);

    try {
      const r = await fetch("/api/process-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads, businessName: bizName, product }),
      });
      clearInterval(ticker);
      setProgress(95);
      if (!r.ok) throw new Error("Processing failed");
      const d = await r.json();
      setProgress(100);
      setResults(d.leads);
      setSel(d.leads[0] || null);
      setTimeout(() => setStep("results"), 400);
    } catch (e) {
      clearInterval(ticker);
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setStep("upload");
    }
  }

  function exportCSV() {
    const rows = results.map((l) => [
      l.score,
      l.name,
      l.company || "",
      l.contact,
      l.interest,
      `"${(l.scoreReason || "").replace(/"/g, "'")}"`,
      l.lastContact,
      l.budget || "",
    ]);
    const text = [["Score", "Name", "Company", "Contact", "Interest", "Score Reason", "Last Contact", "Budget"], ...rows]
      .map((r) => r.join(","))
      .join("\n");
    Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([text], { type: "text/csv" })),
      download: "revived_leads.csv",
    }).click();
  }

  const border = "1px solid rgba(255,255,255,0.09)";

  const filteredResults = results.filter((l) => {
    if (activeFilter === "hot")  return l.score >= 8;
    if (activeFilter === "warm") return l.score >= 5 && l.score < 8;
    if (activeFilter === "cold") return l.score < 5;
    return true;
  });

  // ── LOADING / PROCESSING ────────────────────────────────────────────────────
  if (step === "processing") {
    const steps = [
      { label: "Pulling lead data", done: progress > 15 },
      { label: "Searching web for funding, hiring & intent signals", done: progress > 45 },
      { label: "Scoring each lead with Claude AI", done: progress > 75 },
      { label: "Ranking by revival likelihood", done: progress > 90 },
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
            <h2 className="font-serif text-3xl font-black mb-2">Analysing leads…</h2>
            <p className="text-zinc-500 text-sm mb-8">Running live web search + AI scoring in parallel.</p>
            <div className="space-y-3 mb-8">
              {steps.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
                    style={{
                      background: s.done ? "rgba(0,229,160,0.15)" : "rgba(255,255,255,0.05)",
                      border: s.done ? "1px solid rgba(0,229,160,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      color: s.done ? "var(--teal)" : "transparent",
                    }}>✓</span>
                  <span className={`text-sm ${s.done ? "text-zinc-300" : "text-zinc-600"}`}>{s.label}</span>
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

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (step === "results" && results.length > 0) {
    const hot  = results.filter(l => l.score >= 8).length;
    const warm = results.filter(l => l.score >= 5 && l.score < 8).length;
    const cold = results.filter(l => l.score < 5).length;

    return (
      <div className="min-h-screen bg-[#080808] text-white flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4"
          style={{ background: "rgba(8,8,8,0.92)", backdropFilter: "blur(12px)", borderBottom: border }}>
          <a href="/" className="font-serif font-bold text-lg">Revive<span style={{ color: "var(--teal)" }}>IQ</span></a>
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 text-xs">{results.length} leads scored</span>
            <button onClick={exportCSV} className="btn-ghost text-xs px-4 py-2">Export CSV</button>
            <button onClick={() => { setStep("setup"); setResults([]); setSel(null); setCsv(DEMO_CSV); setActiveFilter("all"); }}
              className="btn-teal text-xs px-4 py-2">New batch</button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-6">
          {/* Metric row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total leads",  sub: "processed",   n: results.length, color: "rgba(255,255,255,0.8)", filter: "all"  as const },
              { label: "Hot",          sub: "call this week", n: hot,          color: "#4ade80",               filter: "hot"  as const },
              { label: "Warm",         sub: "call this month",n: warm,         color: "#facc15",               filter: "warm" as const },
              { label: "Cold",         sub: "low priority",   n: cold,         color: "#f87171",               filter: "cold" as const },
            ].map((s) => (
              <button key={s.label} onClick={() => setActiveFilter(s.filter)}
                className="card p-5 text-left transition-all"
                style={{ borderColor: activeFilter === s.filter ? s.color + "40" : undefined, background: activeFilter === s.filter ? s.color + "08" : undefined }}>
                <p className="font-serif text-4xl font-black mb-1" style={{ color: s.color }}>{s.n}</p>
                <p className="text-zinc-200 text-sm font-semibold">{s.label}</p>
                <p className="text-zinc-600 text-xs">{s.sub}</p>
              </button>
            ))}
          </div>

          {/* Main split: list + detail */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Lead list */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <p className="label">Ranked by revival score</p>
                {activeFilter !== "all" && (
                  <button onClick={() => setActiveFilter("all")} className="text-zinc-600 text-xs hover:text-zinc-400">Clear filter</button>
                )}
              </div>
              <div className="space-y-1">
                {filteredResults.map((lead, i) => (
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
                {filteredResults.length === 0 && (
                  <p className="text-zinc-600 text-sm px-4 py-6">No leads in this tier.</p>
                )}
              </div>
            </div>

            {/* Detail panel */}
            {sel && (
              <div className="lg:col-span-3 space-y-4">
                {/* Score header */}
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

                {/* Web signals */}
                {sel.signals && sel.signals.scoreBoost > 0 && (
                  <div className="card overflow-hidden" style={{ borderColor: "rgba(168,85,247,0.25)" }}>
                    <div className="px-5 py-3 flex items-center justify-between"
                      style={{ borderBottom: "1px solid rgba(168,85,247,0.12)", background: "rgba(168,85,247,0.06)" }}>
                      <div>
                        <p className="label" style={{ color: "#c084fc" }}>Live web intelligence</p>
                        <p className="text-zinc-600 text-xs mt-0.5">Signals found by Tavily search</p>
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
                          <p className="label mb-1 flex items-center gap-1.5">
                            <span>{s.icon}</span>{s.label}
                          </p>
                          <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">{s.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lead details grid */}
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

                {/* Notes */}
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

  // ── SETUP + UPLOAD ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-4" style={{ borderBottom: border }}>
        <a href="/" className="font-serif font-bold text-lg">Revive<span style={{ color: "var(--teal)" }}>IQ</span></a>
        <span className="text-zinc-600 text-xs">AI Lead Revival Engine</span>
      </header>

      <div className="flex-1 flex items-start justify-center px-8 py-12">
        <div className="w-full max-w-xl space-y-8">

          {/* Business context */}
          <div>
            <p className="label mb-3">Your business</p>
            <div className="space-y-2.5">
              <input
                className="inp"
                placeholder="Company name (e.g. Instahyre)"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
              />
              <input
                className="inp"
                placeholder="What you sell (e.g. AI hiring automation for sales teams)"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>
          </div>

          {/* Import mode toggle */}
          <div>
            <p className="label mb-3">Import leads</p>
            <div className="inline-flex p-1 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.04)", border }}>
              {(["csv", "crm"] as ImportMode[]).map((m) => (
                <button key={m} onClick={() => setImportMode(m)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: importMode === m ? "var(--teal)" : "transparent",
                    color: importMode === m ? "#000" : "rgba(255,255,255,0.4)",
                  }}>
                  {m === "csv" ? "CSV Upload" : "Connect CRM"}
                </button>
              ))}
            </div>

            {importMode === "csv" && (
              <div className="space-y-3">
                <div className="px-4 py-3 rounded-xl text-xs" style={{ background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.15)" }}>
                  <p className="label mb-2" style={{ color: "var(--teal)" }}>Demo data loaded</p>
                  <p className="text-zinc-500">8 real-world B2B leads pre-filled below. Edit or paste your own CSV.</p>
                  <p className="text-zinc-700 mt-1.5">Columns: name, company, contact, interest, lastContact, reason, budget, notes</p>
                </div>
                <textarea
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  className="w-full rounded-xl p-4 font-mono text-xs text-zinc-300 placeholder:text-zinc-700 resize-none outline-none"
                  style={{ background: "rgba(255,255,255,0.03)", border, minHeight: "240px" }}
                />
              </div>
            )}

            {importMode === "crm" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {CRM_OPTIONS.map((c) => (
                    <button key={c.id} onClick={() => { setCrm(c); setApiKey(""); setCrmLeads([]); setCrmErr(""); }}
                      className="py-2.5 px-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        border: crm.id === c.id ? "1px solid var(--teal)" : border,
                        background: crm.id === c.id ? "rgba(0,229,160,0.08)" : "rgba(255,255,255,0.03)",
                        color: crm.id === c.id ? "var(--teal)" : "rgba(255,255,255,0.55)",
                      }}>
                      {c.name}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="label mb-2">{crm.keyLabel}</p>
                  <input type="password" placeholder="Paste API key" value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)} className="inp" />
                  <p className="text-zinc-700 text-xs mt-1.5">→ {crm.keyHelp}</p>
                </div>
                {crmErr && <p className="text-red-400 text-sm">{crmErr}</p>}
                {crmLeads.length > 0 && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(0,229,160,0.05)", border: "1px solid rgba(0,229,160,0.2)" }}>
                    <p className="font-semibold" style={{ color: "var(--teal)" }}>✓ {crmLeads.length} leads from {crm.name}</p>
                  </div>
                )}
                <button onClick={connectCrm} disabled={!apiKey || crmBusy}
                  className="btn-ghost w-full h-11 text-sm">
                  {crmBusy ? "Connecting…" : `Connect ${crm.name}`}
                </button>
              </div>
            )}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <button
            onClick={run}
            disabled={importMode === "csv" ? !csv.trim() : !crmLeads.length}
            className="btn-teal w-full h-13 text-sm font-semibold teal-glow"
            style={{ height: "52px" }}
          >
            Score leads with AI →
          </button>

          <p className="text-zinc-700 text-xs text-center">
            Tavily searches the web per lead · Claude AI scores by revival likelihood · Results ranked instantly
          </p>
        </div>
      </div>
    </div>
  );
}
