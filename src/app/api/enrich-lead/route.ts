import { NextRequest, NextResponse } from "next/server";
import { tavily } from "@tavily/core";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";
import type { Lead } from "@/app/api/process-leads/route";

export interface EnrichmentSignals {
  recentFunding: string | null;
  hiringSignals: string | null;
  intentSignals: string | null;
  competitorEngagement: string | null;
  companyGrowth: string | null;
  scoreBoost: number;
  boostReason: string;
}

async function searchWeb(client: ReturnType<typeof tavily>, query: string): Promise<string> {
  try {
    const result = await client.search(query, { searchDepth: "basic", maxResults: 3 });
    return result.results
      .slice(0, 2)
      .map((r) => r.content?.slice(0, 300))
      .filter(Boolean)
      .join(" | ");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const { allowed, retryAfter } = rateLimit(`enrich-lead:${ip}`, 10, 5 * 60 * 1000); // 10 req / 5 min
  if (!allowed) return rateLimitResponse(retryAfter);

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    return NextResponse.json({ signals: null });
  }

  try {
    const { lead, product }: { lead: Lead; product: string } = await req.json();
    const companyHint = lead.notes || lead.interest || lead.name;
    const tv = tavily({ apiKey: tavilyKey });

    const [fundingRaw, hiringRaw, intentRaw, competitorRaw, growthRaw] = await Promise.all([
      searchWeb(tv, `"${companyHint}" funding raised investment 2024 2025`),
      searchWeb(tv, `"${companyHint}" hiring job ${product} OR "sales operations" OR "revenue operations" 2025`),
      searchWeb(tv, `"${companyHint}" looking for ${product} OR evaluating OR switching OR replacing tool`),
      searchWeb(tv, `"${companyHint}" review G2 Capterra ${product} OR similar software`),
      searchWeb(tv, `"${companyHint}" expansion growth new office team 2024 2025`),
    ]);

    let boost = 0;
    const boostReasons: string[] = [];

    if (fundingRaw && fundingRaw.length > 50) { boost += 2; boostReasons.push("recently raised funding"); }
    if (hiringRaw && hiringRaw.length > 50) { boost += 1; boostReasons.push("hiring for roles that suggest product need"); }
    if (intentRaw && intentRaw.length > 50) { boost += 2; boostReasons.push("actively researching similar products"); }
    if (competitorRaw && competitorRaw.length > 50) { boost += 1; boostReasons.push("engaged with competitor tools"); }
    if (growthRaw && growthRaw.length > 50) { boost += 1; boostReasons.push("company is actively growing"); }

    const signals: EnrichmentSignals = {
      recentFunding: fundingRaw || null,
      hiringSignals: hiringRaw || null,
      intentSignals: intentRaw || null,
      competitorEngagement: competitorRaw || null,
      companyGrowth: growthRaw || null,
      scoreBoost: Math.min(boost, 3),
      boostReason: boostReasons.length > 0 ? boostReasons.join(", ") : "no strong intent signals found",
    };

    return NextResponse.json({ signals });
  } catch (err) {
    console.error("Enrichment error:", err);
    return NextResponse.json({ signals: null });
  }
}
