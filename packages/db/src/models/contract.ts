import { Schema } from "mongoose";
import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const contractTemplateSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: null },
    body: { type: String, required: true },
    variables: [{ type: String }],
    requires_digital_signature: { type: Boolean, required: true },
    is_active: { type: Boolean, required: true },
    created_by: { type: String, required: true },
  },
  ts,
);

const contractSchema = defineSchema(
  {
    contract_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true },
    project_id: { type: String, default: null },
    ticket_id: { type: String, default: null },
    template_id: { type: String, default: null },
    created_by: { type: String, required: true },
    type: { type: String, enum: ["generated", "uploaded"], required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "signed_digital", "signed_paper", "cancelled"],
      required: true,
    },
    body: { type: String, default: null },
    variables_filled: { type: Schema.Types.Mixed, default: null },
    pdf_url: { type: String, default: null },
    portal_visible: { type: Boolean, required: true },
    signing_type: { type: String, enum: ["digital", "paper", "none"], required: true },
    client_name: { type: String, default: null },
    client_signature: { type: String, default: null },
    signed_at: { type: Date, default: null },
    valid_from: { type: Date, default: null },
    valid_until: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  ts,
);

contractSchema.index({ tenantId: 1, contract_number: 1 }, { unique: true });

export const ContractTemplateModel = getModel("ContractTemplate", contractTemplateSchema);
export const ContractModel = getModel("Contract", contractSchema);
