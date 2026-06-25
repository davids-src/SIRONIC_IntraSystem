import { defineSchema } from "./schema-def";
import {
  checklistItemSchema,
  projectPhaseSchema,
  stagingLinkSchema,
} from "./embedded-schemas";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const projectSchema = defineSchema(
  {
    project_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, default: null },
    created_by: { type: String, required: true },
    assigned_to: { type: String, default: null },
    contract_type: { type: String, default: null },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: null },
    status: { type: String, enum: ["open", "on_hold", "closed"], required: true },
    start_date: { type: Date, default: null },
    deadline: { type: Date, default: null },
    closed_at: { type: Date, default: null },
    budget_hours: { type: Number, default: null },
    portal_visible: { type: Boolean, required: true },
    phases: [projectPhaseSchema],
    staging_links: [stagingLinkSchema],
    checklist: [checklistItemSchema],
    required_items: [
      {
        price_list_item_id: { type: String, required: true },
        name: { type: String, required: true },
        unit: { type: String, required: true },
        required_quantity: { type: Number, required: true, default: 0 },
        reserved_quantity: { type: Number, required: true, default: 0 },
      },
    ],
    notes: { type: String, default: null },
    contract_warning_dismissed: { type: Boolean, required: true },
    is_archived: { type: Boolean, default: false },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
  },
  ts,
);

projectSchema.index({ tenantId: 1, project_number: 1 }, { unique: true });

export const ProjectModel = getModel("Project", projectSchema);
