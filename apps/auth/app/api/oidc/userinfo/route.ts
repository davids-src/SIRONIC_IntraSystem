import { NextResponse } from "next/server";
import { connectAuthDb, verifyIssuedToken } from "@crm/auth-core/server";
import { issuer } from "@/lib/issuer";

export async function GET(req: Request) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  await connectAuthDb();
  const token = header.slice(7);
  // No specific audience check here — this access_token is only ever presented by whichever
  // client it was issued to, and the claims returned don't depend on which client that was.
  const verified = await verifyIssuedToken(token, { issuer: issuer() });
  if (!verified) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  return NextResponse.json({
    sub: verified.sub,
    email: verified.email,
    email_verified: verified.email_verified,
    name: verified.name,
  });
}
