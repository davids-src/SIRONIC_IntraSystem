import { NextResponse } from "next/server";
import { IntegrationConnectionModel } from "@crm/db";
import {
  CloudflareClient,
  GithubClient,
  IntegrationError,
  NpmClient,
  PortainerClient,
} from "@crm/integrations";
import type { IntegrationConnection } from "@crm/types";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { decryptSecret } from "@/lib/secret-crypto";

type RouteCtx = { params: Promise<{ id: string }> };

async function probe(
  connection: IntegrationConnection,
): Promise<{ ok: boolean; message: string }> {
  try {
    switch (connection.provider) {
      case "cloudflare": {
        const creds = JSON.parse(decryptSecret(connection.encrypted_credentials)) as {
          api_token: string;
        };
        const client = new CloudflareClient({
          baseUrl: connection.base_url,
          apiToken: creds.api_token,
        });
        const { ok } = await client.verifyToken();
        return { ok, message: ok ? "Token érvényes." : "Token érvénytelen." };
      }
      case "npm": {
        const creds = JSON.parse(decryptSecret(connection.encrypted_credentials)) as {
          email: string;
          password: string;
        };
        const client = new NpmClient({
          baseUrl: connection.base_url,
          email: creds.email,
          password: creds.password,
        });
        await client.login();
        const version = await client.getVersion();
        return {
          ok: Boolean(version),
          message: version
            ? `Bejelentkezve, verzió: ${version.major}.${version.minor}.${version.revision}`
            : "Bejelentkezve, verzió ismeretlen.",
        };
      }
      case "portainer": {
        const creds = JSON.parse(decryptSecret(connection.encrypted_credentials)) as {
          api_key: string;
        };
        const endpointId = Number(connection.meta?.endpoint_id ?? 1);
        const client = new PortainerClient({
          baseUrl: connection.base_url,
          apiKey: creds.api_key,
          endpointId,
        });
        const { ok } = await client.getStatus();
        return { ok, message: ok ? "Elérhető." : "Nem elérhető." };
      }
      case "github": {
        const creds = JSON.parse(decryptSecret(connection.encrypted_credentials)) as {
          token: string;
        };
        const client = new GithubClient({ token: creds.token });
        const { ok } = await client.getRateLimit();
        return { ok, message: ok ? "Elérhető." : "Nem elérhető." };
      }
      default:
        return { ok: false, message: "Ismeretlen provider." };
    }
  } catch (err) {
    if (err instanceof IntegrationError) return { ok: false, message: err.safeMessage };
    // Surface the real cause (network/TLS/DNS/parsing) — this is an internal admin tool,
    // staff need the actual error to fix their own infra (wrong port, self-signed cert, etc).
    if (err instanceof Error)
      return { ok: false, message: `Váratlan hiba: ${err.message}` };
    return { ok: false, message: "Ismeretlen hiba a healthcheck közben." };
  }
}

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "view", scope: "global" });

    return await withDb(async () => {
      const connection = await IntegrationConnectionModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const { ok, message } = await probe(connection as unknown as IntegrationConnection);
      await IntegrationConnectionModel.updateOne(
        { _id: id, tenantId: actor.tenantId },
        {
          $set: {
            last_healthcheck_at: new Date(),
            last_healthcheck_ok: ok,
            last_healthcheck_message: message,
          },
        },
      );
      return NextResponse.json({ ok, message });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
