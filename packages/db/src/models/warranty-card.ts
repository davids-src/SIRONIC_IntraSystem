import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const warrantyLineSchema = {
  price_list_item_id: { type: String, default: null },
  name: { type: String, required: true },
  serial_number: { type: String, default: null },
  warranty_years: { type: Number, required: true, min: 1 },
  warranty_start: { type: Date, required: true },
  warranty_end: { type: Date, required: true },
};

const warrantyCardSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    warranty_number: { type: String, required: true },
    contact_id: { type: String, required: true, index: true },
    invoice_number: { type: String, default: null },
    issue_date: { type: Date, required: true },
    lines: [warrantyLineSchema],
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "expired", "claimed", "void"],
      required: true,
      default: "active",
    },
    pdf_url: { type: String, default: null },
    created_by: { type: String, required: true },
    is_archived: { type: Boolean, default: false },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
  },
  ts,
);

warrantyCardSchema.index({ tenantId: 1, warranty_number: 1 }, { unique: true });

export const WarrantyCardModel = getModel("WarrantyCard", warrantyCardSchema);
