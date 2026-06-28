import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const portalUserSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    display_name: { type: String, default: null },
    roleKeys: [{ type: String, required: true }],
    invite_token: { type: String, default: null, index: true, sparse: true },
    invite_token_expires: { type: Date, default: null },
    magic_token_hash: { type: String, default: null, index: true, sparse: true },
    magic_token_expires: { type: Date, default: null },
  },
  ts,
);

export const PortalUserModel = getModel("PortalUser", portalUserSchema);
