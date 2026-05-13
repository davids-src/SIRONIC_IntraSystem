import { defineSchema } from "./schema-def";

export const addressSchema = defineSchema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

export const contactPersonSchema = defineSchema(
  {
    name: { type: String, required: true },
    title: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    is_primary: { type: Boolean, required: true },
  },
  { _id: false },
);

export const portalPermissionsSchema = defineSchema(
  {
    menu_tickets: { type: Boolean, required: true },
    menu_worklogs: { type: Boolean, required: true },
    menu_offers: { type: Boolean, required: true },
    menu_completion_certificates: { type: Boolean, required: true },
    menu_projects: { type: Boolean, required: true },
    menu_contracts: { type: Boolean, required: true },
    menu_invoices: { type: Boolean, required: true },
    menu_company_profile: { type: Boolean, required: true },
    menu_settings: { type: Boolean, required: true },
  },
  { _id: false },
);

export const purchaseRecordSchema = defineSchema(
  {
    _id: { type: String, required: true },
    supplier_name: { type: String, required: true },
    supplier_item_number: { type: String, default: null },
    net_purchase_price: { type: Number, required: true },
    purchased_at: { type: Date, required: true },
    notes: { type: String, default: null },
  },
  { _id: false },
);

export const attachmentSchema = defineSchema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    uploaded_at: { type: Date, required: true },
  },
  { _id: false },
);

export const ticketCommentSchema = defineSchema(
  {
    _id: { type: String, required: true },
    author_id: { type: String, required: true },
    author_role: { type: String, enum: ["crm_staff", "partner"], required: true },
    message: { type: String, required: true },
    is_internal: { type: Boolean, required: true },
    created_at: { type: Date, required: true },
  },
  { _id: false },
);

export const worklogItemSchema = defineSchema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    unit_price: { type: Number, default: null },
    price_list_item_id: { type: String, default: null },
  },
  { _id: false },
);

export const projectPhaseSchema = defineSchema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      required: true,
    },
    order: { type: Number, required: true },
    due_date: { type: Date, default: null },
    completed_at: { type: Date, default: null },
  },
  { _id: false },
);

export const stagingLinkSchema = defineSchema(
  {
    _id: { type: String, required: true },
    label: { type: String, required: true },
    url: { type: String, required: true },
    added_by: { type: String, required: true },
    added_at: { type: Date, required: true },
    approval_status: {
      type: String,
      enum: ["pending", "approved", "changes_requested"],
      required: true,
    },
    approved_by: { type: String, default: null },
    approved_at: { type: Date, default: null },
    approval_note: { type: String, default: null },
  },
  { _id: false },
);

export const checklistItemSchema = defineSchema(
  {
    _id: { type: String, required: true },
    label: { type: String, required: true },
    category: {
      type: String,
      enum: ["content", "assets", "documents", "technical", "other"],
      required: true,
    },
    required: { type: Boolean, required: true },
    completed: { type: Boolean, required: true },
    completed_at: { type: Date, default: null },
    uploaded_file_url: { type: String, default: null },
    note: { type: String, default: null },
  },
  { _id: false },
);
