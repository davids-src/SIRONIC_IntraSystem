import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const inventoryTakingItemSchema = {
  price_list_item_id: { type: String, required: true },
  expected_qty: { type: Number, required: true },
  physical_qty: { type: Number, required: true },
  diff_qty: { type: Number, required: true },
  notes: { type: String, default: null },
};

const inventoryTakingSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    warehouse_location: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "completed"],
      required: true,
      default: "draft",
    },
    created_by: { type: String, required: true },
    items: { type: [inventoryTakingItemSchema], default: [] },
    completed_at: { type: Date, default: null },
  },
  ts,
);

inventoryTakingSchema.index({ tenantId: 1, created_at: -1 });

export const InventoryTakingModel = getModel("InventoryTaking", inventoryTakingSchema);
