import { NextResponse } from "next/server";

// Placeholder — DB persistence is Phase 2. Dashboard uses in-memory results for now.
export async function GET() {
  return NextResponse.json({ leads: [] });
}
