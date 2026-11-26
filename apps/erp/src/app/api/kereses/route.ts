import { NextResponse } from "next/server";
import { getCurrentUser } from "@erp/auth";
import { KERESES_MIN_HOSSZ, globalisKereses } from "@/lib/kereses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live global search for the header box (no page reload). Same fan-out as the `/kereses` page:
 * every module facade checks the viewer's read permissions itself.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ csoportok: [] }, { status: 401 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < KERESES_MIN_HOSSZ) return NextResponse.json({ csoportok: [] });
  const csoportok = await globalisKereses(q, {
    userId: user.id,
    permissions: user.permissions,
    name: user.name || undefined,
  });
  return NextResponse.json({ csoportok }, { headers: { "cache-control": "no-store" } });
}
