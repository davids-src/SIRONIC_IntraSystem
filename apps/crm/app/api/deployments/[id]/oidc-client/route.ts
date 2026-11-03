import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentModel, serializeForJson } from "@crm/db";
import type { Deployment } from "@crm/types";
import {
  connectSecondaryAuthDb,
  oidcClientModelFor,
  createOidcClient,
  rotateOidcClientSecret,
  updateOidcClientRedirectUris,
  findActiveOidcClient,
} from "@crm/auth-core/server";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

// Every site's admin login is its own separate Auth.js instance, mounted at
// ADMIN_AUTH_BASE_PATH ("/api/admin-auth") — sironic-platform packages/auth/admin.ts —
// never the framework-default "/api/auth" a generic NextAuth setup would use.
function redirectUriFor(domain: string): string {
  return `https://${domain}/api/admin-auth/callback/sironic`;
}

// Deliberately NOT process.env.AUTH_URL — that name is already taken by CRM's own NextAuth
// config (its own callback URL, i.e. this app's own address). The central identity app's
// address needs a distinct name; PLATFORM_AUTH_ISSUER matches what gets injected into a
// relying party's own env per docs/auth-platform/03-oidc-and-linking.md §6.
function issuer(): string {
  return process.env.PLATFORM_AUTH_ISSUER || "http://localhost:3005";
}

/** Status only — never returns the secret (it's never stored in a form we could return). */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "view", scope: "global" });

    return await withDb(async () => {
      const existing = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const deployment = existing as unknown as Deployment;

      const clientId = deployment.external_ids?.oidc_client_id ?? null;
      // "pending" is the brief in-flight sentinel a concurrent generate request claims
      // before the real client_id is written — treat it the same as "not registered yet".
      if (!clientId || clientId === "pending") {
        return NextResponse.json({ registered: false });
      }

      const authConnection = await connectSecondaryAuthDb();
      const model = oidcClientModelFor(authConnection);
      const client = await findActiveOidcClient(clientId, model);
      return NextResponse.json({
        registered: !!client,
        client_id: clientId,
        redirect_uris: client?.redirect_uris ?? [],
        issuer: issuer(),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const bodySchema = z.object({ action: z.enum(["generate", "rotate", "resync"]) });

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });
    const json: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return await withDb(async () => {
      const existing = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const deployment = existing as unknown as Deployment;

      const authConnection = await connectSecondaryAuthDb();
      const model = oidcClientModelFor(authConnection);
      const existingClientId = deployment.external_ids?.oidc_client_id ?? null;

      if (parsed.data.action === "resync") {
        if (!existingClientId) {
          return NextResponse.json(
            { error: "Nincs még regisztrált OIDC kliens — előbb generálj egyet." },
            { status: 409 },
          );
        }
        const ok = await updateOidcClientRedirectUris(
          existingClientId,
          [redirectUriFor(deployment.domain)],
          model,
        );
        if (!ok) {
          return NextResponse.json({ error: "A kliens nem található." }, { status: 404 });
        }
        return NextResponse.json({
          client_id: existingClientId,
          redirect_uris: [redirectUriFor(deployment.domain)],
          issuer: issuer(),
        });
      }

      if (parsed.data.action === "rotate") {
        if (!existingClientId) {
          return NextResponse.json(
            { error: "Nincs még regisztrált OIDC kliens — előbb generálj egyet." },
            { status: 409 },
          );
        }
        const client_secret = await rotateOidcClientSecret(existingClientId, model);
        if (!client_secret) {
          return NextResponse.json({ error: "A kliens nem található." }, { status: 404 });
        }
        return NextResponse.json({
          client_id: existingClientId,
          client_secret,
          issuer: issuer(),
        });
      }

      // Atomic claim before creating anything: a filter requiring oidc_client_id to still
      // be null means only one of two concurrent "generate" requests can ever win this
      // write — the loser gets null back and a clean 409, instead of both passing a
      // check-then-act read and each creating their own, now-orphaned OidcClient.
      const claimed = await DeploymentModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId, "external_ids.oidc_client_id": null },
        { $set: { "external_ids.oidc_client_id": "pending" } },
        { new: true },
      ).lean();
      if (!claimed) {
        return NextResponse.json(
          { error: "Már van regisztrált OIDC kliens — használd a rotálást." },
          { status: 409 },
        );
      }

      try {
        const { client_id, client_secret } = await createOidcClient(
          {
            name: deployment.name,
            type: "deployment",
            redirectUris: [redirectUriFor(deployment.domain)],
            confidential: true,
            deploymentId: id,
            contactId: deployment.contact_id ?? null,
            tenantId: actor.tenantId,
          },
          model,
        );

        await DeploymentModel.updateOne(
          { _id: id, tenantId: actor.tenantId },
          { $set: { "external_ids.oidc_client_id": client_id } },
        );

        const doc = await DeploymentModel.findOne({
          _id: id,
          tenantId: actor.tenantId,
        }).lean();
        return NextResponse.json({
          client_id,
          client_secret,
          issuer: issuer(),
          deployment: serializeForJson(doc),
        });
      } catch (e) {
        // Release the claim so a retry isn't permanently blocked by the "pending" sentinel.
        await DeploymentModel.updateOne(
          { _id: id, tenantId: actor.tenantId, "external_ids.oidc_client_id": "pending" },
          { $set: { "external_ids.oidc_client_id": null } },
        );
        throw e;
      }
    });
  } catch (e) {
    return handleApiError(e);
  }
}
