import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

/**
 * Raktármozgás napló – minden készletváltozás rögzítve.
 * type: "in" = bevét, "out" = kivét, "adjustment" = leltári korrekció
 */
const stockTransactionSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    price_list_item_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["in", "out", "adjustment", "transfer"],
      required: true,
    },
    quantity: { type: Number, required: true },
    serial_numbers: { type: [String], default: [] },
    to_warehouse_location: { type: String, default: null },
    reference_type: {
      type: String,
      enum: ["worklog", "offer", "invoice", "purchase_order", "manual"],
      required: true,
    },
    reference_id: { type: String, default: null },
    notes: { type: String, default: null },
    created_by: { type: String, required: true },
  },
  ts,
);

stockTransactionSchema.index({ tenantId: 1, price_list_item_id: 1 });
stockTransactionSchema.index({ tenantId: 1, reference_type: 1, reference_id: 1 });

export const StockTransactionModel = getModel("StockTransaction", stockTransactionSchema);
