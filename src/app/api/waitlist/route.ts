import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const { allowed, retryAfter } = rateLimit(`waitlist:${ip}`, 3, 60 * 60 * 1000); // 3 req / hour
  if (!allowed) return rateLimitResponse(retryAfter);

  try {
    const { email, company } = await req.json();

    if (!email || !company) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Save to Google Sheets via webhook (configured via env var)
    const sheetWebhookUrl = process.env.SHEET_WEBHOOK_URL;
    if (sheetWebhookUrl) {
      await fetch(sheetWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company,
          signedUpAt: new Date().toISOString(),
        }),
      });
    }

    // Send notification email via Resend (configured via env var)
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (resendKey && notifyEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SalesDhan <onboarding@resend.dev>",
          to: [notifyEmail],
          subject: `New SalesDhan signup: ${company}`,
          text: `New early access signup!\n\nEmail: ${email}\nCompany: ${company}\nTime: ${new Date().toLocaleString()}`,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
