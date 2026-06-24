import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const checklistTemplateSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String }, // pl. "Kamera telepítés", "Villanyszerelés", "IT audit"
    items: [
      {
        item_id: { type: String, required: true }, // nanoid / uuid
        text: { type: String, required: true },
        is_required: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
      },
    ],
    is_active: { type: Boolean, default: true },
    created_by: { type: String, required: true },
  },
  ts,
);

export const ChecklistTemplateModel = getModel(
  "ChecklistTemplate",
  checklistTemplateSchema,
);
