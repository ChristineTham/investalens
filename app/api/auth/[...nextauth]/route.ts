// Auth.js route handler — configured in R1-P1a
// export { GET, POST } from "@/lib/auth";

import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ error: "Auth not configured" }, { status: 501 });
}

export function POST() {
  return NextResponse.json({ error: "Auth not configured" }, { status: 501 });
}
