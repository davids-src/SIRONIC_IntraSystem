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
    invite_token: { type: String, default: null, index: true, sparse: true },
    invite_token_expires: { type: Date, default: null },
  },
  ts,
);

// companyDetails inline beépítve a settingsSchema-ba
const settingsSchema = defineSchema(
  {
    tenantId: { type: String, required: true, unique: true },
    ticket_categories: [{ type: String }],
    worklog_categories: [{ type: String }],
    project_categories: [{ type: String }],
    contract_categories: [{ type: String }],
    price_list_categories: [{ type: String }],
    item_categories: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          prefix: { type: String, required: true },
        },
      ],
      default: [],
    },
    worklog_units: [{ type: String }],
    contact_tags: [{ type: String }],
    company_details: {
      name: { type: String, default: null },
      headquarters: { type: String, default: null },
      tax_number: { type: String, default: null },
      registration_number: { type: String, default: null },
      email: { type: String, default: null },
      phone: { type: String, default: null },
      bank_account: { type: String, default: null },
      iban: { type: String, default: null },
      website: { type: String, default: null },
    },
  },
  ts,
);

export const TenantModel = getModel("Tenant", tenantSchema);
export const CrmUserModel = getModel("CrmUser", crmUserSchema);
export const SettingsModel = getModel("Settings", settingsSchema);
