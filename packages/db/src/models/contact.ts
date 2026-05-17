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
    contract_type: { type: String, default: null },
  },
  ts,
);

contactSchema.index({ tenantId: 1, contact_number: 1 }, { unique: true });

export const ContactModel = getModel("Contact", contactSchema);
