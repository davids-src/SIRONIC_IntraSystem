import { defineSchema } from "./schema-def";
import { purchaseRecordSchema } from "./embedded-schemas";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const priceListItemSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    item_number: { type: String, required: true },
    type: {
      type: String,
      enum: ["service", "product", "labor", "package"],
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: null },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    net_price: { type: Number, required: true },
    currency: { type: String, required: true },
    tax_rate: { type: Number, required: true },
    is_active: { type: Boolean, required: true },
    notes: { type: String, default: null },
    purchase_records: [purchaseRecordSchema],
    last_purchase_price: { type: Number, default: null },
    preferred_supplier: { type: String, default: null },
  },
  ts,
);

priceListItemSchema.index({ tenantId: 1, item_number: 1 }, { unique: true });

export const PriceListItemModel = getModel("PriceListItem", priceListItemSchema);
