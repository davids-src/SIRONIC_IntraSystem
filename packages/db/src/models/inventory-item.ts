import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const inventoryItemSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["hardware", "software", "license"],
      required: true,
    },
    serial_number: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "maintenance", "retired"],
      required: true,
    },
    assigned_to: { type: String, default: null },
    warranty_end: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  ts,
);

inventoryItemSchema.index({ tenantId: 1, contact_id: 1 });

export const InventoryItemModel = getModel("InventoryItem", inventoryItemSchema);
