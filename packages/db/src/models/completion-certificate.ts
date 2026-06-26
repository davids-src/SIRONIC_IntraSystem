import { defineSchema } from "./schema-def";
import { priceSnapshotSchema } from "./embedded-schemas";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const completionCertificateLineSchema = defineSchema(
  {
    price_list_item_id: { type: String, default: null },
    /** Szolgáltatás Árlistából – null ha fizikai termék */
    service_price_list_item_id: { type: String, default: null },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    net_unit_price: { type: Number, default: 0 },
    /** Árképzési snapshot – csak service tételeknél, lefagyasztott */
    price_snapshot: { type: priceSnapshotSchema, default: null },
  },
  { _id: false },
);

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
    recipient_name: { type: String, default: null },
    recipient_email: { type: String, default: null },
    pdf_url: { type: String, default: null },
    is_archived: { type: Boolean, default: false },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
    rejection_reason: { type: String, default: null },
    lines: { type: [completionCertificateLineSchema], default: [] },
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
