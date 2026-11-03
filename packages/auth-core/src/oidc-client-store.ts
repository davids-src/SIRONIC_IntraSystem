import { randomBytes } from "node:crypto";
import type { Model } from "mongoose";
import { OidcClientModel } from "./models/oidc-client";
import { hashPassword } from "./password";

export type OidcClientLean = {
  _id: unknown;
  client_id: string;
  client_secret_hash: string | null;
  name: string;
  type: "crm" | "portal" | "deployment" | "other";
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  token_endpoint_auth_method: "client_secret_basic" | "none";
  deployment_id: string | null;
  contact_id: string | null;
  tenantId: string | null;
  is_active: boolean;
};

/**
 * Every function here takes the model as its last, optional argument (defaulting to the
 * one bound to this package's own default connection) rather than hard-coding
 * `OidcClientModel` — CRM calls these with `oidcClientModelFor(itsOwnSecondaryConnection)`
 * instead, since it can't share a connection with apps/auth (see models/oidc-client.ts).
 */
export async function findActiveOidcClient(
  clientId: string,
  model: Model<any> = OidcClientModel,
): Promise<OidcClientLean | null> {
  return model
    .findOne({ client_id: clientId, is_active: true })
    .lean<OidcClientLean | null>();
}

export async function findOidcClientByDeployment(
  deploymentId: string,
  model: Model<any> = OidcClientModel,
): Promise<OidcClientLean | null> {
  return model.findOne({ deployment_id: deploymentId }).lean<OidcClientLean | null>();
}

/**
 * Registers a relying party. `confidential: true` (server-rendered apps that can keep a
 * secret) gets a generated client_secret returned once — never stored in plaintext.
 * `confidential: false` is a public client (PKCE is mandatory for these regardless, but
 * public clients have no secret to leak in the first place — e.g. a static/SPA frontend).
 *
 * deploymentId is optional and unrelated to where the site is actually hosted — a site we
 * build but don't operate still gets a client registered the same way.
 */
export async function createOidcClient(
  input: {
    name: string;
    type: "crm" | "portal" | "deployment" | "other";
    redirectUris: string[];
    postLogoutRedirectUris?: string[];
    confidential: boolean;
    deploymentId?: string | null;
    contactId?: string | null;
    tenantId?: string | null;
  },
  model: Model<any> = OidcClientModel,
): Promise<{ client_id: string; client_secret: string | null }> {
  const client_id = `oidc_${randomBytes(12).toString("hex")}`;
  let client_secret: string | null = null;
  let client_secret_hash: string | null = null;
  if (input.confidential) {
    client_secret = randomBytes(24).toString("base64url");
    client_secret_hash = await hashPassword(client_secret);
  }
  await model.create({
    client_id,
    client_secret_hash,
    name: input.name,
    type: input.type,
    redirect_uris: input.redirectUris,
    post_logout_redirect_uris: input.postLogoutRedirectUris ?? [],
    token_endpoint_auth_method: input.confidential ? "client_secret_basic" : "none",
    deployment_id: input.deploymentId ?? null,
    contact_id: input.contactId ?? null,
    tenantId: input.tenantId ?? null,
  });
  return { client_id, client_secret };
}

/** Corrects a previously-registered client's redirect_uris (e.g. the deployment's own
 * callback path changed, or was computed wrong at registration time) without touching the
 * secret — rotating would require re-entering a new secret into the site's own env too,
 * which this doesn't need. */
export async function updateOidcClientRedirectUris(
  clientId: string,
  redirectUris: string[],
  model: Model<any> = OidcClientModel,
): Promise<boolean> {
  const res = await model.updateOne(
    { client_id: clientId },
    { $set: { redirect_uris: redirectUris } },
  );
  return res.matchedCount > 0;
}

/** Generates and stores a fresh secret, returned once — the old secret stops working
 * immediately (no grace-period overlap, matching the provision-token rotate flow). */
export async function rotateOidcClientSecret(
  clientId: string,
  model: Model<any> = OidcClientModel,
): Promise<string | null> {
  const client = await model.findOne({ client_id: clientId });
  if (!client) return null;
  const client_secret = randomBytes(24).toString("base64url");
  client.client_secret_hash = await hashPassword(client_secret);
  await client.save();
  return client_secret;
}
