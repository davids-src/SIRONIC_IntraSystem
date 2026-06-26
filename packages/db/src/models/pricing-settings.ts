import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const hourlyRatesSchema = defineSchema(
  {
    it_operations: { type: Number, required: true, default: 5500 },
    it_development: { type: Number, required: true, default: 7500 },
    security_tech_installer: { type: Number, required: true, default: 5000 },
    security_tech_planner: { type: Number, required: true, default: 6500 },
    fire_protection_installer: { type: Number, required: true, default: 5000 },
    fire_protection_planner: { type: Number, required: true, default: 6500 },
    electrical_general: { type: Number, required: true, default: 5500 },
    electrical_industrial: { type: Number, required: true, default: 6500 },
    project_management: { type: Number, required: true, default: 7000 },
    consulting: { type: Number, required: true, default: 8000 },
  },
  { _id: false },
);

const clientMultipliersSchema = defineSchema(
  {
    individual: { type: Number, required: true, default: 1.3 },
    smb_occasional: { type: Number, required: true, default: 1.2 },
    smb_6month: { type: Number, required: true, default: 1.08 },
    smb_1year: { type: Number, required: true, default: 1.0 },
    smb_2year: { type: Number, required: true, default: 0.92 },
    enterprise: { type: Number, required: true, default: 0.88 },
    subcontractor_presence: { type: Number, required: true, default: 0.75 },
    subcontractor_project: { type: Number, required: true, default: 0.8 },
    pm_external: { type: Number, required: true, default: 0.9 },
  },
  { _id: false },
);

const materialSurchargesSchema = defineSchema(
  {
    occasional: { type: Number, required: true, default: 0.12 },
    contracted: { type: Number, required: true, default: 0.08 },
    enterprise: { type: Number, required: true, default: 0.06 },
    subcontractor: { type: Number, required: true, default: 0.05 },
  },
  { _id: false },
);

const urgencyMultipliersSchema = defineSchema(
  {
    same_day: { type: Number, required: true, default: 1.3 },
    after_hours: { type: Number, required: true, default: 1.5 },
    weekend: { type: Number, required: true, default: 1.75 },
    night: { type: Number, required: true, default: 2.0 },
  },
  { _id: false },
);

const pricingSettingsSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },

    // Overhead és Rezsi
    overhead_multiplier: { type: Number, required: true, default: 1.45 },
    monthly_fixed_cost: { type: Number, required: true, default: 500000 },
    monthly_productive_hours: { type: Number, required: true, default: 160 },

    // Belső óradíjak
    hourly_rates: { type: hourlyRatesSchema, required: true, default: () => ({}) },

    // Ügyfél kategória szorzók
    client_multipliers: {
      type: clientMultipliersSchema,
      required: true,
      default: () => ({}),
    },

    // Anyagköltség pótlékok
    material_surcharges: {
      type: materialSurchargesSchema,
      required: true,
      default: () => ({}),
    },

    // Sürgősségi szorzók
    urgency_multipliers: {
      type: urgencyMultipliersSchema,
      required: true,
      default: () => ({}),
    },

    // ÁFA és egyéb
    vat_rate: { type: Number, required: true, default: 0.27 },
    min_callout_fee: { type: Number, required: true, default: 15000 },
    min_project_fee: { type: Number, required: true, default: 50000 },

    updated_by: { type: String, default: null },
  },
  ts,
);

// Egy tenant-hoz csak egy rekord tartozhat
pricingSettingsSchema.index({ tenantId: 1 }, { unique: true });

export const PricingSettingsModel = getModel("PricingSettings", pricingSettingsSchema);
