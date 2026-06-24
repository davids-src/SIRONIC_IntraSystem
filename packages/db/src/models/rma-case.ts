import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const rmaCaseSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    rma_number: { type: String, required: true }, // e.g. RMA-2026-000001
    price_list_item_id: { type: String, required: true, index: true },
    serial_number: { type: String, default: null },
    quantity: { type: Number, required: true, default: 1 },
    contact_id: { type: String, required: true, index: true },
    supplier_name: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "received",
        "sent_to_supplier",
        "replaced",
        "repaired",
        "scrapped",
        "returned_to_client",
      ],
      required: true,
      default: "received",
    },
    notes: { type: String, default: null },
  },
  ts,
);

rmaCaseSchema.index({ tenantId: 1, rma_number: 1 }, { unique: true });

export const RmaCaseModel = getModel("RmaCase", rmaCaseSchema);
