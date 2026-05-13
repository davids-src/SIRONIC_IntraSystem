import { defineSchema } from "./schema-def";
import { worklogItemSchema } from "./embedded-schemas";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const worklogSchema = defineSchema(
  {
    worklog_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, default: null },
    one_time_contact_name: { type: String, default: null },
    one_time_contact_phone: { type: String, default: null },
    project_id: { type: String, default: null },
    ticket_id: { type: String, default: null },
    created_by: { type: String, required: true },
    status: { type: String, enum: ["draft", "finalized"], required: true },
    work_date: { type: Date, required: true },
    work_start: { type: String, default: null },
    work_end: { type: String, default: null },
    technician_name: { type: String, required: true },
    technician_signature: { type: String, default: null },
    client_name: { type: String, default: null },
    client_signature: { type: String, default: null },
    site_address: { type: String, default: null },
    work_category: { type: String, required: true },
    work_description: { type: String, required: true },
    items: [worklogItemSchema],
    travel_km: { type: Number, default: null },
    notes: { type: String, default: null },
    pdf_url: { type: String, default: null },
  },
  ts,
);

worklogSchema.index({ tenantId: 1, worklog_number: 1 }, { unique: true });

export const WorklogModel = getModel("Worklog", worklogSchema);
