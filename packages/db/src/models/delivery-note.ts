import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const deliveryNoteLineSchema = {
  price_list_item_id: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unit: { type: String, required: true },
};

const deliveryNoteSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    delivery_number: { type: String, required: true },
    contact_id: { type: String, required: true, index: true },
    project_id: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ["draft", "issued", "cancelled"],
      required: true,
      default: "draft",
    },
    issue_date: { type: Date, required: true },
    lines: [deliveryNoteLineSchema],
    notes: { type: String, default: null },
    created_by: { type: String, required: true },
    is_archived: { type: Boolean, default: false },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
  },
  ts,
);

deliveryNoteSchema.index({ tenantId: 1, delivery_number: 1 }, { unique: true });

export const DeliveryNoteModel = getModel("DeliveryNote", deliveryNoteSchema);
