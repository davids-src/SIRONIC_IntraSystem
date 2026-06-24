import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";

const secretShareSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    secret_id: { type: String, required: true, index: true }, // hivatkozás a SecretModel _id-jára
    token: { type: String, required: true, unique: true, index: true }, // crypto.randomBytes(32).toString('hex')
    expires_at: { type: Date, required: true }, // TTL index – MongoDB auto-delete
    view_count_limit: { type: Number, default: 1 }, // max. hányszor nyitható meg
    view_count: { type: Number, default: 0 }, // eddig hányszor nyitották meg
    viewed_at: { type: Date, default: null }, // első megtekintés időpontja
    ip_address_log: [{ type: String }], // IP naplózás
    created_by: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

// TTL index: MongoDB automatikusan törli a lejárt tokeneket
secretShareSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const SecretShareModel = getModel("SecretShare", secretShareSchema);
