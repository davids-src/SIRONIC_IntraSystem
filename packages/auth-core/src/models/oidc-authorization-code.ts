import { Schema } from "mongoose";
import { getModel } from "@crm/shared";

/**
 * Deliberately no `ts()` timestamps / update tracking — a code is single-use and short-lived
 * (consumed via findOneAndDelete, see oidc-code-store.ts), so there's nothing to update.
 * The TTL index lets Mongo garbage-collect anything a client never redeemed.
 */
const oidcAuthorizationCodeSchema = new Schema({
  code_hash: { type: String, required: true, unique: true },
  client_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true },
  redirect_uri: { type: String, required: true },
  scope: { type: String, required: true },
  code_challenge: { type: String, required: true },
  code_challenge_method: { type: String, enum: ["S256"], required: true },
  expires_at: { type: Date, required: true, expires: 0 },
});

export const OidcAuthorizationCodeModel = getModel(
  "OidcAuthorizationCode",
  oidcAuthorizationCodeSchema,
);
