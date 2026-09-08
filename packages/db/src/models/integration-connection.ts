import { Schema } from "mongoose";
import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const integrationConnectionSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    provider: {
      type: String,
      enum: ["cloudflare", "npm", "portainer", "github"],
      required: true,
    },
    label: { type: String, required: true },
    base_url: { type: String, required: true },
    // AES-256-GCM blob — same "iv:authTag:ciphertext" hex format as Secret.encrypted_value
    encrypted_credentials: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    is_active: { type: Boolean, required: true, default: true },
    last_healthcheck_at: { type: Date, default: null },
    last_healthcheck_ok: { type: Boolean, default: null },
    last_healthcheck_message: { type: String, default: null },
    created_by: { type: String, required: true },
  },
  ts,
);

integrationConnectionSchema.index(
  { tenantId: 1, provider: 1, label: 1 },
  { unique: true },
);

export const IntegrationConnectionModel = getModel(
  "IntegrationConnection",
  integrationConnectionSchema,
);
