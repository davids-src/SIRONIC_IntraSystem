import mongoose, { Schema } from "mongoose";

const addressSchema = new Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

const contactPersonSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    is_primary: { type: Boolean, required: true },
  },
  { _id: false },
);

const portalPermissionsSchema = new Schema(
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

const purchaseRecordSchema = new Schema(
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

const attachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    uploaded_at: { type: Date, required: true },
  },
  { _id: false },
);

const ticketCommentSchema = new Schema(
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

const worklogItemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    unit_price: { type: Number, default: null },
    price_list_item_id: { type: String, default: null },
  },
  { _id: false },
);

const projectPhaseSchema = new Schema(
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

const stagingLinkSchema = new Schema(
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

const checklistItemSchema = new Schema(
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

const ts = { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } };

const tenantSchema = new Schema(
  {
    name: { type: String, required: true },
  },
  ts,
);

const crmUserSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    display_name: { type: String, default: null },
    password_hash: { type: String, required: true },
    roleKeys: [{ type: String, required: true }],
  },
  ts,
);

const settingsSchema = new Schema(
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

const contactSchema = new Schema(
  {
    contact_number: { type: String, required: true },
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

const priceListItemSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    item_number: { type: String, required: true },
    type: {
      type: String,
      enum: ["service", "product", "labor", "package"],
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: null },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    net_price: { type: Number, required: true },
    currency: { type: String, required: true },
    tax_rate: { type: Number, required: true },
    is_active: { type: Boolean, required: true },
    notes: { type: String, default: null },
    purchase_records: [purchaseRecordSchema],
    last_purchase_price: { type: Number, default: null },
    preferred_supplier: { type: String, default: null },
  },
  ts,
);

priceListItemSchema.index({ tenantId: 1, item_number: 1 }, { unique: true });

const projectSchema = new Schema(
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
    notes: { type: String, default: null },
    contract_warning_dismissed: { type: Boolean, required: true },
  },
  ts,
);

projectSchema.index({ tenantId: 1, project_number: 1 }, { unique: true });

const ticketSchema = new Schema(
  {
    ticket_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, default: null },
    one_time_contact_name: { type: String, default: null },
    one_time_contact_phone: { type: String, default: null },
    created_by: { type: String, required: true },
    assigned_to: { type: String, default: null },
    source: {
      type: String,
      enum: ["crm", "partner_portal", "phone", "email", "walk_in"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "in_progress", "waiting", "resolved", "closed"],
      required: true,
    },
    category: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    project_id: { type: String, default: null },
    location: { type: String, default: null },
    affected_items: { type: String, default: null },
    attachments: [attachmentSchema],
    comments: [ticketCommentSchema],
    resolution_notes: { type: String, default: null },
    resolved_at: { type: Date, default: null },
  },
  ts,
);

ticketSchema.index({ tenantId: 1, ticket_number: 1 }, { unique: true });

const worklogSchema = new Schema(
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

const completionCertificateSchema = new Schema(
  {
    certificate_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, default: null },
    project_id: { type: String, default: null },
    created_by: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      required: true,
    },
    worklog_ids: [{ type: String }],
    ticket_ids: [{ type: String }],
    title: { type: String, required: true },
    work_summary: { type: String, required: true },
    work_period_start: { type: Date, default: null },
    work_period_end: { type: Date, default: null },
    total_hours: { type: Number, default: null },
    client_name: { type: String, default: null },
    client_title: { type: String, default: null },
    client_signature: { type: String, default: null },
    signed_at: { type: Date, default: null },
    pdf_url: { type: String, default: null },
  },
  ts,
);

completionCertificateSchema.index(
  { tenantId: 1, certificate_number: 1 },
  { unique: true },
);

const contractTemplateSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: null },
    body: { type: String, required: true },
    variables: [{ type: String }],
    requires_digital_signature: { type: Boolean, required: true },
    is_active: { type: Boolean, required: true },
    created_by: { type: String, required: true },
  },
  ts,
);

const contractSchema = new Schema(
  {
    contract_number: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true },
    project_id: { type: String, default: null },
    ticket_id: { type: String, default: null },
    template_id: { type: String, default: null },
    created_by: { type: String, required: true },
    type: { type: String, enum: ["generated", "uploaded"], required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "signed_digital", "signed_paper", "cancelled"],
      required: true,
    },
    body: { type: String, default: null },
    variables_filled: { type: Schema.Types.Mixed, default: null },
    pdf_url: { type: String, default: null },
    portal_visible: { type: Boolean, required: true },
    signing_type: { type: String, enum: ["digital", "paper", "none"], required: true },
    client_name: { type: String, default: null },
    client_signature: { type: String, default: null },
    signed_at: { type: Date, default: null },
    valid_from: { type: Date, default: null },
    valid_until: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  ts,
);

contractSchema.index({ tenantId: 1, contract_number: 1 }, { unique: true });

const offerSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    offer_number: { type: String, required: true },
    title: { type: String, required: true },
    contact_id: { type: String, required: true },
    total_amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      required: true,
    },
    valid_until: { type: Date, default: null },
    created_by: { type: String, required: true },
  },
  ts,
);

offerSchema.index({ tenantId: 1, offer_number: 1 }, { unique: true });

const invoiceSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    invoice_number: { type: String, required: true },
    contact_id: { type: String, required: true },
    title: { type: String, default: null },
    total_amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      required: true,
    },
    issued_at: { type: Date, default: null },
    due_at: { type: Date, default: null },
    created_by: { type: String, required: true },
  },
  ts,
);

invoiceSchema.index({ tenantId: 1, invoice_number: 1 }, { unique: true });

function getModel<T>(name: string, schema: Schema): mongoose.Model<T> {
  return (mongoose.models[name] as mongoose.Model<T>) || mongoose.model<T>(name, schema);
}

export const TenantModel = getModel("Tenant", tenantSchema);
export const CrmUserModel = getModel("CrmUser", crmUserSchema);
export const SettingsModel = getModel("Settings", settingsSchema);
export const ContactModel = getModel("Contact", contactSchema);
export const PriceListItemModel = getModel("PriceListItem", priceListItemSchema);
export const ProjectModel = getModel("Project", projectSchema);
export const TicketModel = getModel("Ticket", ticketSchema);
export const WorklogModel = getModel("Worklog", worklogSchema);
export const CompletionCertificateModel = getModel(
  "CompletionCertificate",
  completionCertificateSchema,
);
export const ContractTemplateModel = getModel("ContractTemplate", contractTemplateSchema);
export const ContractModel = getModel("Contract", contractSchema);
export const OfferModel = getModel("Offer", offerSchema);
export const InvoiceModel = getModel("Invoice", invoiceSchema);
