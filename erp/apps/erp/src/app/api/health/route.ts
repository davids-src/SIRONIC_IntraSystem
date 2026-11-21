import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness probe for Docker / Portainer healthchecks (no DB dependency). */
export async function GET() {
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
