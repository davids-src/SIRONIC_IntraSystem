import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const supplierSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    partner_id: { type: String, required: true, unique: true }, // SU + 6 digits
    name: { type: String, required: true },
    tax_number: { type: String, default: null },
    registration_number: { type: String, default: null },
    headquarters: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    bank_account: { type: String, default: null },
    notes: { type: String, default: null },
  },
  ts,
);

supplierSchema.index({ tenantId: 1, name: 1 });

export const SupplierModel = getModel("Supplier", supplierSchema);
