import { NextRequest, NextResponse } from "next/server";
import type { Lead } from "@/app/api/process-leads/route";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

// ── HubSpot ──────────────────────────────────────────────────────────────────
async function fetchHubSpot(apiKey: string): Promise<Lead[]> {
  const res = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,hs_lead_status,notes_last_contacted,notes_last_updated,jobtitle,company,hs_analytics_last_visit_timestamp",
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) throw new Error("HubSpot auth failed — check your API key");
  const data = await res.json();
  return (data.results || []).map((c: Record<string, Record<string, string>>) => ({
    name: `${c.properties.firstname || ""} ${c.properties.lastname || ""}`.trim() || "Unknown",
    contact: c.properties.email || c.properties.phone || "",
    interest: c.properties.jobtitle || c.properties.company || "Not specified",
    lastContact: c.properties.notes_last_contacted
      ? new Date(c.properties.notes_last_contacted).toLocaleDateString()
      : "Unknown",
    reason: c.properties.hs_lead_status || "Went cold",
    budget: "",
    notes: "",
  }));
}

// ── Pipedrive ─────────────────────────────────────────────────────────────────
async function fetchPipedrive(apiKey: string): Promise<Lead[]> {
  const res = await fetch(
    `https://api.pipedrive.com/v1/persons?api_token=${apiKey}&limit=100`,
  );
  if (!res.ok) throw new Error("Pipedrive auth failed — check your API key");
  const data = await res.json();
  return (data.data || []).map((p: Record<string, string | Record<string, string>[]>) => {
    const emails = (p.email as Record<string, string>[]) || [];
    const phones = (p.phone as Record<string, string>[]) || [];
    return {
      name: (p.name as string) || "Unknown",
      contact: emails[0]?.value || phones[0]?.value || "",
      interest: (p.org_name as string) || "Not specified",
      lastContact: p.last_activity_date
        ? new Date(p.last_activity_date as string).toLocaleDateString()
        : "Unknown",
      reason: "Inactive in pipeline",
      budget: "",
      notes: (p.notes_count as string) || "",
    };
  });
}

// ── Zoho CRM ──────────────────────────────────────────────────────────────────
async function fetchZoho(apiKey: string): Promise<Lead[]> {
  const res = await fetch(
    "https://www.zohoapis.com/crm/v2/Leads?fields=First_Name,Last_Name,Email,Phone,Lead_Status,Last_Activity_Time,Lead_Source,Description,Annual_Revenue&per_page=100",
    { headers: { Authorization: `Zoho-oauthtoken ${apiKey}` } }
  );
  if (!res.ok) throw new Error("Zoho auth failed — check your access token");
  const data = await res.json();
  return (data.data || []).map((l: Record<string, string>) => ({
    name: `${l.First_Name || ""} ${l.Last_Name || ""}`.trim() || "Unknown",
    contact: l.Email || l.Phone || "",
    interest: l.Lead_Source || "Not specified",
    lastContact: l.Last_Activity_Time
      ? new Date(l.Last_Activity_Time).toLocaleDateString()
      : "Unknown",
    reason: l.Lead_Status || "Went cold",
    budget: l.Annual_Revenue || "",
    notes: l.Description || "",
  }));
}

// ── Salesforce ────────────────────────────────────────────────────────────────
async function fetchSalesforce(apiKey: string, instanceUrl: string): Promise<Lead[]> {
  const query = encodeURIComponent(
    "SELECT Id,Name,Email,Phone,Status,LastActivityDate,LeadSource,Description,AnnualRevenue FROM Lead WHERE IsConverted = false ORDER BY LastActivityDate ASC NULLS FIRST LIMIT 100"
  );
  const res = await fetch(
    `${instanceUrl}/services/data/v58.0/query?q=${query}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) throw new Error("Salesforce auth failed — check your access token and instance URL");
  const data = await res.json();
  return (data.records || []).map((l: Record<string, string>) => ({
    name: l.Name || "Unknown",
    contact: l.Email || l.Phone || "",
    interest: l.LeadSource || "Not specified",
    lastContact: l.LastActivityDate
      ? new Date(l.LastActivityDate).toLocaleDateString()
      : "Unknown",
    reason: l.Status || "Went cold",
    budget: l.AnnualRevenue || "",
    notes: l.Description || "",
  }));
}

// ── Teamgate ──────────────────────────────────────────────────────────────────
async function fetchTeamgate(apiKey: string): Promise<Lead[]> {
  const res = await fetch(
    "https://api.teamgate.com/v4/leads?limit=100&status=inactive",
    {
      headers: {
        "X-Auth-Token": apiKey,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error("Teamgate auth failed — check your API key");
  const data = await res.json();
  const leads = data.data?.leads || data.leads || [];
  return leads.map((l: Record<string, string>) => ({
    name: l.name || l.full_name || "Unknown",
    contact: l.email || l.phone || "",
    interest: l.description || l.source || "Not specified",
    lastContact: l.updated || l.last_activity || "Unknown",
    reason: l.status || "Inactive",
    budget: l.value || "",
    notes: l.notes || "",
  }));
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const { allowed, retryAfter } = rateLimit(`crm:${ip}`, 20, 5 * 60 * 1000); // 20 req / 5 min
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const { crm, apiKey, instanceUrl } = await req.json();

    if (!crm || !apiKey) {
      return NextResponse.json({ error: "CRM and API key are required" }, { status: 400 });
    }

    let leads: Lead[] = [];

    switch (crm) {
      case "hubspot":
        leads = await fetchHubSpot(apiKey);
        break;
      case "pipedrive":
        leads = await fetchPipedrive(apiKey);
        break;
      case "zoho":
        leads = await fetchZoho(apiKey);
        break;
      case "salesforce":
        if (!instanceUrl) {
          return NextResponse.json({ error: "Salesforce requires an instance URL" }, { status: 400 });
        }
        leads = await fetchSalesforce(apiKey, instanceUrl);
        break;
      case "teamgate":
        leads = await fetchTeamgate(apiKey);
        break;
      default:
        return NextResponse.json({ error: "Unsupported CRM" }, { status: 400 });
    }

    return NextResponse.json({ leads, total: leads.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to connect to CRM";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
