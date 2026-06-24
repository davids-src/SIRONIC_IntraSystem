import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

/**
 * Raktárkészlet tétel – egy árlistaelem raktáron lévő mennyiségét követi.
 * Egy bérlőnél minden árlistaeleméhez max. egy StockItem tartozhat.
 */
const stockItemSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    price_list_item_id: { type: String, required: true, index: true },
    quantity_in_stock: { type: Number, required: true, default: 0, min: 0 },
    quantity_allocated: { type: Number, required: true, default: 0, min: 0 },
    serial_numbers: { type: [String], default: [] },
    low_stock_threshold: { type: Number, default: null },
    warehouse_location: { type: String, default: null },
    notes: { type: String, default: null },
  },
  ts,
);

stockItemSchema.index(
  { tenantId: 1, price_list_item_id: 1, warehouse_location: 1 },
  { unique: true },
);

export const StockItemModel = getModel("StockItem", stockItemSchema);
