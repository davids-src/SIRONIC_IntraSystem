import { NextResponse } from "next/server";
import { connectAuthDb, getJwks } from "@crm/auth-core/server";

export async function GET() {
  await connectAuthDb();
  const jwks = await getJwks();
  return NextResponse.json(jwks, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
