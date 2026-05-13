import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const domainHostingRecordSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true, index: true },
    record_type: {
      type: String,
      enum: ["domain", "hosting", "ssl"],
      required: true,
    },
    label: { type: String, required: true },
    provider: { type: String, default: null },
    expiry_date: { type: Date, default: null },
    auto_renew: { type: Boolean, default: null },
    details: { type: String, default: null },
  },
  ts,
);

domainHostingRecordSchema.index({ tenantId: 1, contact_id: 1 });

export const DomainHostingRecordModel = getModel(
  "DomainHostingRecord",
  domainHostingRecordSchema,
);
