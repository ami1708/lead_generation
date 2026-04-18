import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { tavily } from "@tavily/core";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    ? `\nWeb signals found:\n- Funding: ${signals.recentFunding || "none"}\n- Hiring: ${signals.hiringSignals || "none"}\n- Intent: ${signals.intentSignals || "none"}\n- Competitors: ${signals.competitorEngagement || "none"}\n- Growth: ${signals.companyGrowth || "none"}`
    : "";

  return `You score dead sales leads for ${businessName || "a B2B sales company"} selling ${product || "their product"}.

Scoring rubric (deterministic):
- Recency: went cold 3–6 months ago = 3pts | 6–12 months = 2pts | 1–2 years = 1pt | 2+ years = 0pts
- Cold reason: budget/timing constraint = 2pts | lost to competitor = 1pt | not interested/ghosted = 0pts
- Budget signal: specific amount mentioned = 2pts | unknown = 1pt
- Past engagement: multiple calls/demo done = 1pt | single touchpoint = 0pts
Web signals add bonus on top (max +3).

Lead:
Name: ${lead.name}
Company: ${lead.company || "unknown"}
Interested in: ${lead.interest}
Last contact: ${lead.lastContact}
Why went cold: ${lead.reason}
Budget: ${lead.budget || "not mentioned"}
Notes: ${lead.notes || "none"}${sig}

Return ONLY valid JSON — no markdown, no explanation:
{"score":<1-10>,"scoreReason":"<one plain-English sentence explaining the score>"}`;
}

export async function POST(req: NextRequest) {
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
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const result = await model.generateContent(prompt);
          const raw = result.response.text().replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(raw);

          if (signals && signals.scoreBoost > 0) {
            parsed.score = Math.min(10, parsed.score + signals.scoreBoost);
          }

          return { ...lead, ...parsed, signals } as ProcessedLead;
        } catch (e) {
          console.error("Scoring error for", lead.name, e);
          return null;
        }
      })
    );

    const results = (processed.filter(Boolean) as ProcessedLead[])
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ leads: results });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
