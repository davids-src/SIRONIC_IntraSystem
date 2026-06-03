import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const offerSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    offer_number: { type: String, required: true },
    public_token: { type: String, default: null, index: true },
    title: { type: String, required: true },
    contact_id: { type: String, required: true },
    total_amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      required: true,
    },
    valid_until: { type: Date, default: null },
    created_by: { type: String, required: true },
    is_archived: { type: Boolean, default: false },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
  },
  ts,
);

offerSchema.index({ tenantId: 1, offer_number: 1 }, { unique: true });

const offerLineSchema = defineSchema(
  {
    price_list_item_id: { type: String, default: null },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    net_unit_price: { type: Number, required: true },
    tax_rate: { type: Number, required: true },
    /** Tételenkénti kedvezmény százalékban (0-100), default: 0 */
    discount_percent: { type: Number, default: 0 },
  },
  { _id: false },
);

offerSchema.add({
  lines: { type: [offerLineSchema], default: [] },
  notes: { type: String, default: null },
});

export const OfferModel = getModel("Offer", offerSchema);
