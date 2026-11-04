import { NextResponse } from "next/server";
import { z } from "zod";
import { CrmUserModel } from "@crm/db";
import type { RoleKey } from "@crm/types";
import { connectSecondaryAuthDb, verifyIssuedToken } from "@crm/auth-core/server";
import { withDb } from "@/lib/api-helpers";
import { signCliToken, CLI_TOKEN_TTL_SECONDS } from "@/lib/cli-token";

/**
 * Bridges an apps/auth (platform OIDC) login into a CRM-local CLI token.
 *
 * The CLI authenticates against apps/auth first — proving who the operator is — then
 * trades that proof here for something that actually works against CRM's API, since CRM
 * does not (yet) accept platform OIDC tokens directly (docs/auth-platform/04-migration.md,
 * Step C is not done). This endpoint is the entire bridge: it does not touch cookies, does
 * not change `requireCrmAuth()`'s normal session path, and grants nothing beyond whatever
 * CrmUser role the matched email already has.
 */
const bodySchema = z.object({ id_token: z.string().min(1) });

function platformIssuer(): string {
  return process.env.PLATFORM_AUTH_ISSUER || "http://localhost:3005";
}

type CrmUserLean = {
  _id: unknown;
  email: string;
  display_name: string | null;
  tenantId: string;
  roleKeys: string[];
};

export async function POST(req: Request) {
  const clientId = process.env.CLI_OIDC_CLIENT_ID;
  if (!clientId) {
    console.error("[auth/cli/exchange] CLI_OIDC_CLIENT_ID is not configured — refusing.");
    return NextResponse.json({ error: "CLI login is not configured." }, { status: 503 });
  }

  const json: unknown = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const authConnection = await connectSecondaryAuthDb();
  const verified = await verifyIssuedToken(
    parsed.data.id_token,
    { issuer: platformIssuer(), audience: clientId },
    authConnection,
  );
  if (!verified) {
    return NextResponse.json(
      { error: "Invalid or expired platform token." },
      { status: 401 },
    );
  }
  if (!verified.email_verified) {
    return NextResponse.json(
      { error: "Platform account email is not verified." },
      { status: 403 },
    );
  }

  return withDb(async () => {
    const user = (await CrmUserModel.findOne({
      email: verified.email.toLowerCase(),
    }).lean()) as CrmUserLean | null;
    if (!user) {
      return NextResponse.json(
        { error: `Nincs CRM felhasználói fiók ehhez az email címhez: ${verified.email}` },
        { status: 403 },
      );
    }
    const roleKeys = user.roleKeys.filter(
      (k): k is RoleKey => k === "crm.admin" || k === "crm.staff",
    );
    if (roleKeys.length === 0) {
      return NextResponse.json(
        { error: "A fiókhoz nincs CRM staff vagy admin szerepkör rendelve." },
        { status: 403 },
      );
    }

    const access_token = await signCliToken({
      sub: String(user._id),
      tenantId: user.tenantId,
      roleKeys,
      email: user.email,
    });

    return NextResponse.json({
      access_token,
      token_type: "Bearer",
      expires_in: CLI_TOKEN_TTL_SECONDS,
      user: {
        email: user.email,
        display_name: user.display_name,
        tenantId: user.tenantId,
        roleKeys,
      },
    });
  });
}
