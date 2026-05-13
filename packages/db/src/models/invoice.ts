import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const invoiceSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    invoice_number: { type: String, required: true },
    contact_id: { type: String, required: true },
    title: { type: String, default: null },
    total_amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      required: true,
    },
    issued_at: { type: Date, default: null },
    due_at: { type: Date, default: null },
    created_by: { type: String, required: true },
  },
  ts,
);

invoiceSchema.index({ tenantId: 1, invoice_number: 1 }, { unique: true });

export const InvoiceModel = getModel("Invoice", invoiceSchema);
