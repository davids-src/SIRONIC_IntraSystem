import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const secretSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    project_id: { type: String, default: null, index: true },
    contact_id: { type: String, default: null, index: true }, // can also link to contact/partner!
    key: { type: String, required: true },
    encrypted_value: { type: String, required: true }, // ciphertext:iv:tag in base64/hex
    visibility: {
      type: String,
      enum: ["shared", "private"],
      required: true,
      default: "shared",
    },
    created_by: { type: String, required: true },
  },
  ts,
);

export const SecretModel = getModel("Secret", secretSchema);
