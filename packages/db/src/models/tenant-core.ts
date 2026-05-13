import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const tenantSchema = defineSchema(
  {
    name: { type: String, required: true },
  },
  ts,
);

const crmUserSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    display_name: { type: String, default: null },
    password_hash: { type: String, required: true },
    roleKeys: [{ type: String, required: true }],
  },
  ts,
);

const settingsSchema = defineSchema(
  {
    tenantId: { type: String, required: true, unique: true },
    ticket_categories: [{ type: String }],
    worklog_categories: [{ type: String }],
    project_categories: [{ type: String }],
    contract_categories: [{ type: String }],
    price_list_categories: [{ type: String }],
    worklog_units: [{ type: String }],
    contact_tags: [{ type: String }],
  },
  ts,
);

export const TenantModel = getModel("Tenant", tenantSchema);
export const CrmUserModel = getModel("CrmUser", crmUserSchema);
export const SettingsModel = getModel("Settings", settingsSchema);
