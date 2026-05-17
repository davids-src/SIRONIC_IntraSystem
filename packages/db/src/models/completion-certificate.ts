import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const completionCertificateSchema = defineSchema(
  {
    certificate_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, default: null },
    project_id: { type: String, default: null },
    offer_id: { type: String, default: null },
    created_by: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      required: true,
    },
    worklog_ids: [{ type: String }],
    ticket_ids: [{ type: String }],
    title: { type: String, required: true },
    work_summary: { type: String, required: true },
    work_period_start: { type: Date, default: null },
    work_period_end: { type: Date, default: null },
    total_hours: { type: Number, default: null },
    client_name: { type: String, default: null },
    client_title: { type: String, default: null },
    client_signature: { type: String, default: null },
    signed_at: { type: Date, default: null },
    pdf_url: { type: String, default: null },
  },
  ts,
);

completionCertificateSchema.index(
  { tenantId: 1, certificate_number: 1 },
  { unique: true },
);

export const CompletionCertificateModel = getModel(
  "CompletionCertificate",
  completionCertificateSchema,
);
