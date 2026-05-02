import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import { tavily } from "@tavily/core";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface Lead {
  name: string;
  contact: string;
  company?: string;
  interest: string;
  lastContact: string;
  reason: string;
  budget?: string;
  notes?: string;
}

export interface EnrichmentSignals {
  recentFunding: string | null;
  hiringSignals: string | null;
  intentSignals: string | null;
  competitorEngagement: string | null;
  companyGrowth: string | null;
  scoreBoost: number;
  boostReason: string;
}

export interface ProcessedLead extends Lead {
  score: number;
  scoreReason: string;
  fitScore?: number;
  revivalScore?: number;
  roiEstimate?: number;
  roiReason?: string;
  signals?: EnrichmentSignals | null;
}

async function searchWeb(tv: ReturnType<typeof tavily>, query: string): Promise<string> {
  try {
    const result = await tv.search(query, { searchDepth: "basic", maxResults: 3 });
    return result.results.slice(0, 2).map((r) => r.content?.slice(0, 300)).filter(Boolean).join(" | ");
  } catch {
    return "";
  }
}

async function enrichLead(lead: Lead, product: string): Promise<EnrichmentSignals | null> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return null;

  try {
    const tv = tavily({ apiKey: tavilyKey });
    const company = lead.company || lead.name;

    const [fundingRaw, hiringRaw, intentRaw, competitorRaw, growthRaw] = await Promise.all([
      searchWeb(tv, `"${company}" funding raised investment 2024 2025`),
      searchWeb(tv, `"${company}" hiring ${product} OR "sales operations" OR "revenue" 2025`),
      searchWeb(tv, `"${company}" evaluating OR switching OR looking for ${product}`),
      searchWeb(tv, `"${company}" G2 Capterra review ${product} OR similar`),
      searchWeb(tv, `"${company}" expansion growth new office 2024 2025`),
    ]);

    let boost = 0;
    const reasons: string[] = [];
    if (fundingRaw.length > 50) { boost += 2; reasons.push("recently raised funding"); }
    if (hiringRaw.length > 50)  { boost += 1; reasons.push("actively hiring"); }
    if (intentRaw.length > 50)  { boost += 2; reasons.push("researching similar tools"); }
    if (competitorRaw.length > 50) { boost += 1; reasons.push("competitor activity detected"); }
    if (growthRaw.length > 50)  { boost += 1; reasons.push("company growing"); }

    return {
      recentFunding:       fundingRaw || null,
      hiringSignals:       hiringRaw || null,
      intentSignals:       intentRaw || null,
      competitorEngagement: competitorRaw || null,
      companyGrowth:       growthRaw || null,
      scoreBoost:          Math.min(boost, 3),
      boostReason:         reasons.length ? reasons.join(", ") : "no strong signals found",
    };
  } catch {
    return null;
  }
}

function buildPrompt(lead: Lead, businessName: string, product: string, signals: EnrichmentSignals | null) {
  const sig = signals
    ? `\nWeb signals:\n- Funding: ${signals.recentFunding || "none"}\n- Hiring: ${signals.hiringSignals || "none"}\n- Intent: ${signals.intentSignals || "none"}\n- Competitors: ${signals.competitorEngagement || "none"}\n- Growth: ${signals.companyGrowth || "none"}`
    : "";

  return `You score dead sales leads for ${businessName || "a B2B company"} that sells: "${product || "their product"}".

Score this lead 1–10. Two things matter equally:

1. PRODUCT FIT (0–5 pts): Does this company actually need what we sell?
   - Their industry/business directly needs our product = 4–5 pts
   - Their business could benefit but it's not core = 2–3 pts
   - Poor fit, unlikely to ever need this = 0–1 pt
   Example: if we sell food delivery software → food companies score 5, banks score 1.

2. REVIVAL LIKELIHOOD (0–5 pts): How likely are they to buy now?
   - Went cold 3–6 months ago = +1 | Had specific budget = +1 | Budget/timing reason = +1 | Did demo/trial = +1 | Web signals show growth/funding = +1

Add both together for final score (1–10).

3. ROI ESTIMATE: Estimate the monthly financial value this company would get FROM using our product.
   Think about: dev cost savings, faster time-to-market, revenue from new capabilities, headcount avoided.
   - Return roiEstimate as a plain integer (monthly value in same currency units as their budget, e.g. if budget is in INR return INR amount, no symbols)
   - Return roiReason as one short sentence explaining the biggest value driver
   - If budget is "Not shared" or unclear, estimate conservatively based on company size and use case

Lead:
Name: ${lead.name}
Company: ${lead.company || "unknown"}
Interest: ${lead.interest}
Last contact: ${lead.lastContact}
Why went cold: ${lead.reason}
Budget: ${lead.budget || "not mentioned"}
Notes: ${lead.notes || "none"}${sig}

Return ONLY valid JSON:
{"score":<1-10>,"scoreReason":"<one sentence: mention fit + revival reason>","fitScore":<0-5>,"revivalScore":<0-5>,"roiEstimate":<integer>,"roiReason":"<one sentence>"}`;
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const { allowed, retryAfter } = rateLimit(`process-leads:${ip}`, 5, 15 * 60 * 1000); // 5 req / 15 min
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const { leads, businessName, product, tone } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided" }, { status: 400 });
    }

    // Enrich all leads in parallel
    const enriched = await Promise.all(
      (leads as Lead[]).map((lead) => enrichLead(lead, product || ""))
    );

    // Score all leads in parallel
    const processed = await Promise.all(
      (leads as Lead[]).map(async (lead, i) => {
        const signals = enriched[i];
        const prompt = buildPrompt(lead, businessName, product, signals);

        try {
          const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.3,
          });
          const text = completion.choices[0]?.message?.content || "";
          // Extract JSON object even if model wraps it in extra text
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("No JSON in response");
          const parsed = JSON.parse(match[0]);

          if (signals && signals.scoreBoost > 0) {
            parsed.score = Math.min(10, parsed.score + signals.scoreBoost);
          }

          return { ...lead, ...parsed, signals } as ProcessedLead;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("Scoring error for", lead.name, msg);
          return { ...lead, score: 0, scoreReason: `Error: ${msg}`, signals: null } as ProcessedLead;
        }
      })
    );

    const results = (processed as ProcessedLead[])
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ leads: results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
