import { defineSchema, getModel, ts } from "@crm/shared";

const oidcClientSchema = defineSchema(
  {
    client_id: { type: String, required: true, unique: true },
    /** null for a public client (PKCE, token_endpoint_auth_method "none") */
    client_secret_hash: { type: String, default: null },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["crm", "portal", "deployment", "other"],
      required: true,
      default: "other",
    },
    redirect_uris: { type: [String], required: true, default: [] },
    post_logout_redirect_uris: { type: [String], default: [] },
    token_endpoint_auth_method: {
      type: String,
      enum: ["client_secret_basic", "none"],
      required: true,
      default: "none",
    },
    /** Set when type="deployment" and this site is actually provisioned by us — null
     * covers both "other" clients and deployments we build but don't host ourselves. */
    deployment_id: { type: String, default: null },
    contact_id: { type: String, default: null },
    tenantId: { type: String, default: null },
    is_active: { type: Boolean, required: true, default: true },
  },
  ts,
);

export const OidcClientModel = getModel("OidcClient", oidcClientSchema);
