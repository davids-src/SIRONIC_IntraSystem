import { randomBytes } from "node:crypto";
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

export async function findActiveOidcClient(
  clientId: string,
): Promise<OidcClientLean | null> {
  return OidcClientModel.findOne({
    client_id: clientId,
    is_active: true,
  }).lean<OidcClientLean | null>();
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
export async function createOidcClient(input: {
  name: string;
  type: "crm" | "portal" | "deployment" | "other";
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  confidential: boolean;
  deploymentId?: string | null;
  contactId?: string | null;
  tenantId?: string | null;
}): Promise<{ client_id: string; client_secret: string | null }> {
  const client_id = `oidc_${randomBytes(12).toString("hex")}`;
  let client_secret: string | null = null;
  let client_secret_hash: string | null = null;
  if (input.confidential) {
    client_secret = randomBytes(24).toString("base64url");
    client_secret_hash = await hashPassword(client_secret);
  }
  await OidcClientModel.create({
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
