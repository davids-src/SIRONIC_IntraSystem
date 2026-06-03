import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const purchaseOrderLineSchema = defineSchema(
  {
    price_list_item_id: { type: String, default: null },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    net_unit_price: { type: Number, required: true },
    tax_rate: { type: Number, required: true },
  },
  { _id: false },
);

const purchaseOrderSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    order_number: { type: String, required: true },
    supplier_id: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "sent", "fulfilled", "cancelled"],
      default: "draft",
    },
    expected_delivery_date: { type: Date, default: null },
    total_amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "HUF" },
    lines: [purchaseOrderLineSchema],
    notes: { type: String, default: null },
    is_archived: { type: Boolean, default: false },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
  },
  ts,
);

purchaseOrderSchema.index({ tenantId: 1, order_number: 1 }, { unique: true });

export const PurchaseOrderModel = getModel("PurchaseOrder", purchaseOrderSchema);
