import { defineSchema } from "./schema-def";
import {
  addressSchema,
  contactPersonSchema,
  portalPermissionsSchema,
} from "./embedded-schemas";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const contactSchema = defineSchema(
  {
    contact_number: { type: String, required: true },
    partner_id: { type: String, default: null }, // VE + 6 random digits
    tenantId: { type: String, required: true, index: true },
    type: { type: String, enum: ["company", "individual", "one_time"], required: true },
    name: { type: String, required: true },
    short_name: { type: String, default: null },
    tax_number: { type: String, default: null },
    registration_number: { type: String, default: null },
    address: { type: addressSchema, required: true },
    billing_address: { type: addressSchema, default: null },
    contact_persons: [contactPersonSchema],
    phone: { type: String, default: null },
    email: { type: String, default: null },
    notes: { type: String, default: null },
    tags: [{ type: String }],
    has_portal_access: { type: Boolean, required: true },
    portal_permissions: { type: portalPermissionsSchema, required: true },
    active_services: [{ type: String }],
    /** Meglévő projekt-szintű szerződéstípus (nem változik) */
    contract_type: { type: String, default: null },

    // ─── Árképzési profil mezők (ÚJ) ──────────────────────────────────────────
    /** Partner szerepköre – ki kicsoda a kapcsolatban */
    partner_role: {
      type: String,
      enum: ["client", "subcontractor_employer", "supplier", "mixed"],
      default: null,
    },
    /** Ügyfél kategória árképzéshez */
    client_category: {
      type: String,
      enum: ["individual", "smb", "enterprise"],
      default: null,
    },
    /** Árképzési szerződéstípus (occasional/6month/1year/2year) */
    pricing_contract_type: {
      type: String,
      enum: ["occasional", "6month", "1year", "2year"],
      default: null,
    },
    contract_start_date: { type: Date, default: null },
    contract_end_date: { type: Date, default: null },
    contract_renewal_reminder_days: { type: Number, default: 30 },
    /** Alvállalkozói munkaterületek */
    subcontractor_work_types: {
      type: [
        {
          type: String,
          enum: ["it", "security_tech", "fire_protection", "electrical", "pm"],
        },
      ],
      default: [],
    },
    subcontractor_presence_type: {
      type: String,
      enum: ["daily_presence", "project_based", "both"],
      default: null,
    },
    subcontractor_billing_cycle: {
      type: String,
      enum: ["weekly", "monthly"],
      default: null,
    },
    /** Auto-számított aktív szorzó kulcs (denormalizált cache) */
    active_price_multiplier_key: { type: String, default: null },
    // ──────────────────────────────────────────────────────────────────────────
  },
  ts,
);

contactSchema.index({ tenantId: 1, contact_number: 1 }, { unique: true });

export const ContactModel = getModel("Contact", contactSchema);
