import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const maintenancePlanSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    contact_id: { type: String, required: true, index: true }, // partner
    project_id: { type: String, default: null },
    frequency_months: { type: Number, required: true }, // pl. 1 (havi), 3 (negyedév), 12 (évi)
    next_due_date: { type: Date, required: true, index: true }, // mikor esedékes a következő
    last_generated_at: { type: Date, default: null }, // mikor generált legutóbb ticket-et
    is_active: { type: Boolean, default: true },
    // Sablon ticket adatok – ezek alapján generálja az automatikus hibajegyet
    template_title: { type: String, required: true },
    template_description: { type: String },
    template_category: { type: String, default: "Preventív karbantartás" },
    template_priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    template_assigned_to: { type: String, default: null }, // alapértelmezett felelős
    // Értesítési ablak (napokban a lejárat előtt hány nappal generálja a ticket-et)
    advance_days: { type: Number, default: 14 },
    created_by: { type: String, required: true },
  },
  ts,
);

export const MaintenancePlanModel = getModel("MaintenancePlan", maintenancePlanSchema);
