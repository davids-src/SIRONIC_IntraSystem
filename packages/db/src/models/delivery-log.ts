import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";

const deliveryLogSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    channel: { type: String, enum: ["email", "in_app"], required: true },
    recipient: { type: String, required: true },
    event: { type: String, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "sent",
      required: true,
      index: true,
    },
    sent_at: { type: Date, default: Date.now, index: true },
    error: { type: String, default: null },
    retry_count: { type: Number, default: 0 },
    entity_type: { type: String, default: null },
    entity_id: { type: String, default: null },
  },
  { timestamps: false },
);

export const DeliveryLogModel = getModel("DeliveryLog", deliveryLogSchema);
