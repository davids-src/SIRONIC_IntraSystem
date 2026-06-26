import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const unitBasedTierSchema = defineSchema(
  {
    label: { type: String, required: true },
    min_units: { type: Number, required: true },
    max_units: { type: Number, default: null },
    base_price: { type: Number, required: true },
  },
  { _id: false },
);

const servicePriceListItemSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },

    // Hierarchia
    category_id: { type: String, required: true, index: true },
    subcategory_id: { type: String, default: null, index: true },

    // Azonosítás
    sku: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    unit: { type: String, required: true },

    // Árképzés típusa
    pricing_type: {
      type: String,
      enum: ["fixed", "hourly", "custom", "unit_based"],
      required: true,
    },

    // Belső kalkulált ár (floor – soha nem jelenik meg ügyfeleknek)
    internal_base_price: { type: Number, default: null },
    hourly_rate_category: { type: String, default: null },

    // Rendszeregység alapú árazás
    unit_based_tiers: { type: [unitBasedTierSchema], default: [] },

    // Megjegyzések
    notes: { type: String, default: null }, // belső megjegyzés
    client_note: { type: String, default: null }, // ügyfél felé megjelenő

    // Állapot és archiválás (globális soft-delete mechanizmus)
    is_active: { type: Boolean, required: true, default: true },
    is_archived: { type: Boolean, required: true, default: false },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },

    sort_order: { type: Number, required: true, default: 0 },
  },
  ts,
);

// SKU egyedi per tenant
servicePriceListItemSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
// Keresési segédindex
servicePriceListItemSchema.index({ tenantId: 1, category_id: 1, is_archived: 1 });

export const ServicePriceListItemModel = getModel(
  "ServicePriceListItem",
  servicePriceListItemSchema,
);
