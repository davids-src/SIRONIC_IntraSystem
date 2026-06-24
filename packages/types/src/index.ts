export type RoleKey = "crm.admin" | "crm.staff" | "partner.admin" | "partner.viewer";

export type PermissionAction =
  | "view"
  | "write"
  | "admin"
  | "internal_comment"
  | "finalize"
  | "generate_pdf"
  | "send"
  | "sign"
  | "manage"
  | "manage_phases"
  | "manage_checklist"
  | "add_staging_link"
  | "close";

export type PermissionModule =
  | "dashboard"
  | "contact"
  | "price_list"
  | "offer"
  | "invoice"
  | "ticket"
  | "worklog"
  | "completion_certificate"
  | "portal_permissions"
  | "project"
  | "contract"
  | "supplier"
  | "purchase_order"
  | "delivery_note"
  | "secret"
  | "warranty"
  | "settings"
  | "weekly_plan"
  | "tools"
  | "checklist"
  | "project_expense"
  | "maintenance_plan"
  | "floorplan";

/** CRM app login roles only (subset of RoleKey). */
export type CrmRoleKey = "crm.admin" | "crm.staff";

export interface Tenant {
  _id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

/** CRM internal user (no password in API responses). */
export interface CrmUser {
  _id: string;
  tenantId: string;
  email: string;
  display_name: string | null;
  roleKeys: CrmRoleKey[];
  created_at: Date;
  updated_at: Date;
}

/** Portal user (no password in API responses). */
export interface PortalUser {
  _id: string;
  tenantId: string;
  contact_id: string;
  email: string;
  display_name: string | null;
  roleKeys: RoleKey[];
  created_at: Date;
  updated_at: Date;
}

export type OfferStatus = "draft" | "sent" | "accepted" | "rejected";

export interface OfferLine {
  price_list_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  tax_rate: number;
  /** Tételenkénti kedvezmény %-ban, default: 0 */
  discount_percent?: number;
}

export interface Offer {
  _id: string;
  tenantId: string;
  offer_number: string;
  public_token?: string | null;
  title: string;
  contact_id: string;
  total_amount: number;
  currency: string;
  status: OfferStatus;
  valid_until: Date | null;
  created_by: string;
  lines: OfferLine[];
  notes: string | null;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  _id: string;
  tenantId: string;
  invoice_number: string;
  contact_id: string;
  title: string | null;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: Date | null;
  due_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type InventoryCategory = "hardware" | "software" | "license";
export type InventoryStatus = "active" | "maintenance" | "retired";

export interface InventoryItem {
  _id: string;
  tenantId: string;
  contact_id: string;
  name: string;
  category: InventoryCategory;
  serial_number: string | null;
  status: InventoryStatus;
  assigned_to: string | null;
  warranty_end: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type DomainHostingRecordType = "domain" | "hosting" | "ssl";

export interface DomainHostingRecord {
  _id: string;
  tenantId: string;
  contact_id: string;
  record_type: DomainHostingRecordType;
  label: string;
  provider: string | null;
  expiry_date: Date | null;
  auto_renew: boolean | null;
  details: string | null;
  created_at: Date;
  updated_at: Date;
}

export type PermissionScope = "global" | "contact" | "resource";

export interface Permission {
  module: PermissionModule;
  action: PermissionAction;
  scope: PermissionScope;
}

export interface ActorContext {
  actorId: string;
  tenantId: string;
  roleKeys: RoleKey[];
}

export interface PermissionCheck extends Permission {
  resourceTenantId?: string;
}

export type PriceListItemType = "service" | "product" | "labor" | "package";

/**
 * Egyszerűsített beszerzési rekord – csak a lényeg:
 * kitől, mennyiért, mi a szállító cikkszáma.
 * Kizárólag CRM-es nézetben látható, a partner soha nem látja.
 */
export interface PurchaseRecord {
  _id: string;
  supplier_name: string; // szállító neve (pl. "Power Biztonságtechnika")
  supplier_item_number: string | null; // a szállító saját cikkszáma
  net_purchase_price: number; // nettó beszerzési ár (HUF)
  purchased_at: Date; // mikor volt a vétel
  notes: string | null;
}

export interface PriceListItem {
  _id: string;
  tenantId: string;
  item_number: string;
  type: PriceListItemType;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  net_price: number;
  currency: string;
  tax_rate: number;
  is_active: boolean;
  notes: string | null;
  /** Csak CRM – partner nem látja */
  purchase_records: PurchaseRecord[];
  /** Legutóbbi ismert nettó beszerzési ár – gyors megjelenítéshez */
  last_purchase_price: number | null;
  /** Ajánlott / elsődleges szállító */
  preferred_supplier: string | null;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  uploaded_at: Date;
}

export interface TicketComment {
  _id: string;
  author_id: string;
  author_role: "crm_staff" | "partner";
  message: string;
  is_internal: boolean;
  created_at: Date;
}

export type TicketSource = "crm" | "partner_portal" | "phone" | "email" | "walk_in";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketStatus = "new" | "in_progress" | "waiting" | "resolved" | "closed";

export interface Ticket {
  _id: string;
  ticket_number: string;
  tenantId: string;
  contact_id: string | null;
  one_time_contact_name: string | null;
  one_time_contact_phone: string | null;
  created_by: string;
  assigned_to: string | null;
  source: TicketSource;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  title: string;
  description: string;
  project_id: string | null;
  location: string | null;
  affected_items: string | null;
  attachments: Attachment[];
  comments: TicketComment[];
  resolution_notes: string | null;
  resolved_at: Date | null;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorklogItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  price_list_item_id: string | null;
}

export type WorklogStatus = "draft" | "finalized";

export interface Worklog {
  _id: string;
  worklog_number: string;
  tenantId: string;
  contact_id: string | null;
  one_time_contact_name: string | null;
  one_time_contact_phone: string | null;
  project_id: string | null;
  ticket_id: string | null;
  created_by: string;
  status: WorklogStatus;
  work_date: Date;
  work_start: string | null;
  work_end: string | null;
  technician_name: string;
  technician_signature: string | null;
  client_name: string | null;
  client_signature: string | null;
  site_address: string | null;
  work_category: string;
  work_description: string;
  items: WorklogItem[];
  travel_km: number | null;
  notes: string | null;
  pdf_url: string | null;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

export type CompletionCertificateStatus = "draft" | "sent" | "accepted" | "rejected";

export interface CompletionCertificateLine {
  price_list_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
}

export interface CompletionCertificate {
  _id: string;
  certificate_number: string;
  tenantId: string;
  contact_id: string | null;
  project_id: string | null;
  created_by: string;
  status: CompletionCertificateStatus;
  worklog_ids: string[];
  ticket_ids: string[];
  title: string;
  work_summary: string;
  work_period_start: Date | null;
  work_period_end: Date | null;
  total_hours: number | null;
  client_name: string | null;
  client_title: string | null;
  client_signature: string | null;
  signed_at: Date | null;
  recipient_name: string | null;
  recipient_email: string | null;
  pdf_url: string | null;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  rejection_reason: string | null;
  lines: CompletionCertificateLine[];
  created_at: Date;
  updated_at: Date;
}

export interface PortalPermissions {
  menu_tickets: boolean;
  menu_worklogs: boolean;
  menu_offers: boolean;
  menu_completion_certificates: boolean;
  menu_projects: boolean;
  menu_contracts: boolean;
  menu_invoices: boolean;
  menu_company_profile: boolean;
  menu_settings: boolean;
}

export type ProjectContractType = "project" | "ongoing" | "mixed" | "one_time" | null;
export type ProjectStatus = "open" | "on_hold" | "closed";
export type ProjectPhaseStatus = "pending" | "in_progress" | "completed";
export type StagingLinkApprovalStatus = "pending" | "approved" | "changes_requested";
export type ChecklistItemCategory =
  | "content"
  | "assets"
  | "documents"
  | "technical"
  | "other";

export interface ProjectPhase {
  name: string;
  status: ProjectPhaseStatus;
  order: number;
  due_date: Date | null;
  completed_at: Date | null;
}

export interface StagingLink {
  _id: string;
  label: string;
  url: string;
  added_by: string;
  added_at: Date;
  approval_status: StagingLinkApprovalStatus;
  approved_by: string | null;
  approved_at: Date | null;
  approval_note: string | null;
}

export interface ChecklistItem {
  _id: string;
  label: string;
  category: ChecklistItemCategory;
  required: boolean;
  completed: boolean;
  completed_at: Date | null;
  uploaded_file_url: string | null;
  note: string | null;
}

export interface Project {
  _id: string;
  project_number: string;
  tenantId: string;
  contact_id: string | null;
  created_by: string;
  assigned_to: string | null;
  contract_type: ProjectContractType;
  name: string;
  description: string;
  category: string | null;
  status: ProjectStatus;
  start_date: Date | null;
  deadline: Date | null;
  closed_at: Date | null;
  budget_hours: number | null;
  portal_visible: boolean;
  phases: ProjectPhase[];
  staging_links: StagingLink[];
  checklist: ChecklistItem[];
  notes: string | null;
  contract_warning_dismissed: boolean;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Address {
  street: string;
  city: string;
  zip: string;
  country: string;
}

export interface ContactPerson {
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

export type ContactType = "company" | "individual" | "one_time";
export type ContactContractType = "project" | "ongoing" | "mixed" | "one_time" | null;

export interface Contact {
  _id: string;
  contact_number: string;
  partner_id: string | null;
  tenantId: string;
  type: ContactType;
  name: string;
  short_name: string | null;
  tax_number: string | null;
  registration_number: string | null;
  address: Address;
  billing_address: Address | null;
  contact_persons: ContactPerson[];
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  has_portal_access: boolean;
  portal_permissions: PortalPermissions;
  active_services: string[];
  contract_type: ContactContractType;
  created_at: Date;
  updated_at: Date;
}

export interface CompanyDetails {
  name: string | null;
  headquarters: string | null;
  tax_number: string | null;
  registration_number: string | null;
  email: string | null;
  phone: string | null;
  bank_account: string | null;
  iban: string | null;
  website: string | null;
}

export interface ItemCategory {
  id: string;
  name: string;
  prefix: string;
}

export interface Settings {
  ticket_categories: string[];
  worklog_categories: string[];
  project_categories: string[];
  contract_categories: string[];
  price_list_categories: string[]; // Deprecated, to be removed.
  item_categories: ItemCategory[];
  worklog_units: string[];
  contact_tags: string[];
  company_details: CompanyDetails;
  /** Jótállási tájékoztató szövege (Markdown), szerkeszthető a CRM beállításokban */
  warranty_legal_notice: string;
}

// Backwards compatibility for older UI code during incremental refactor.
// Will be removed once all modules are migrated.
export type Organization = Contact;

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT MODULE
// ─────────────────────────────────────────────────────────────────────────────

export interface ContractTemplate {
  _id: string;
  tenantId: string;
  name: string;
  category: string;
  description: string | null;
  /** Rich text body with {{variable}} placeholders */
  body: string;
  /** Variable names detected in body, e.g. ["contact_name", "site_address"] */
  variables: string[];
  requires_digital_signature: boolean;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type ContractType = "generated" | "uploaded";

export type ContractStatus =
  | "draft"
  | "sent"
  | "signed_digital"
  | "signed_paper"
  | "cancelled";

export type ContractSigningType = "digital" | "paper" | "none";

export interface Contract {
  _id: string;
  /** Auto-generated: SZ-000001 */
  contract_number: string;
  tenantId: string;
  contact_id: string;
  project_id: string | null;
  ticket_id: string | null;
  template_id: string | null;
  created_by: string;
  type: ContractType;
  category: string;
  name: string;
  status: ContractStatus;
  /** Rendered body (generated type) */
  body: string | null;
  /** Key-value map of filled template variables */
  variables_filled: Record<string, string> | null;
  /** URL of generated PDF or uploaded file */
  pdf_url: string | null;
  portal_visible: boolean;
  signing_type: ContractSigningType;
  client_name: string | null;
  client_signature: string | null;
  signed_at: Date | null;
  valid_from: Date | null;
  /** null means indefinite */
  valid_until: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
export interface Supplier {
  _id: string;
  tenantId: string;
  partner_id: string; // SU + 6 digits
  name: string;
  tax_number: string | null;
  registration_number: string | null;
  headquarters: string | null;
  email: string | null;
  phone: string | null;
  bank_account: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export type PurchaseOrderStatus = "draft" | "sent" | "fulfilled" | "cancelled";

export interface PurchaseOrderLine {
  price_list_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  tax_rate: number;
}

export interface PurchaseOrder {
  _id: string;
  tenantId: string;
  order_number: string; // PO-YYYY-0001
  supplier_id: string;
  status: PurchaseOrderStatus;
  expected_delivery_date: Date | null;
  total_amount: number;
  currency: string;
  lines: PurchaseOrderLine[];
  notes: string | null;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WAREHOUSE / RAKTÁR MODULE
// ─────────────────────────────────────────────────────────────────────────────

/** Raktáron lévő készlet – árlistaelem alapján */
export interface StockItem {
  _id: string;
  tenantId: string;
  price_list_item_id: string;
  quantity_in_stock: number;
  quantity_allocated: number;
  serial_numbers: string[];
  low_stock_threshold: number | null;
  warehouse_location: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Raktárkilétel adataival együtt (API válasz) */
export interface StockItemWithProduct extends StockItem {
  product: PriceListItem | null;
}

export type WarehouseLocationType = "main" | "car" | "scrap" | "shelf";

/** Fizikai raktárhely (polc, terület, stb.) */
export interface WarehouseLocation {
  _id: string;
  tenantId: string;
  code: string;
  name: string;
  type: WarehouseLocationType;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export type StockTransactionType = "in" | "out" | "adjustment" | "transfer";
export type StockTransactionRef =
  | "worklog"
  | "offer"
  | "invoice"
  | "purchase_order"
  | "manual";

/** Raktármozgás napló bejegyzés */
export interface StockTransaction {
  _id: string;
  tenantId: string;
  price_list_item_id: string;
  type: StockTransactionType;
  quantity: number;
  serial_numbers: string[];
  to_warehouse_location: string | null;
  reference_type: StockTransactionRef;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryTakingItem {
  price_list_item_id: string;
  expected_qty: number;
  physical_qty: number;
  diff_qty: number;
  notes: string | null;
}

export interface InventoryTaking {
  _id: string;
  tenantId: string;
  warehouse_location: string;
  status: "draft" | "completed";
  created_by: string;
  items: InventoryTakingItem[];
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type RmaCaseStatus =
  | "received"
  | "sent_to_supplier"
  | "replaced"
  | "repaired"
  | "scrapped"
  | "returned_to_client";

export interface RmaCase {
  _id: string;
  tenantId: string;
  rma_number: string;
  price_list_item_id: string;
  serial_number: string | null;
  quantity: number;
  contact_id: string;
  supplier_name: string | null;
  status: RmaCaseStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY NOTE / SZÁLLÍTÓLEVÉL MODULE
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryNoteStatus = "draft" | "issued" | "cancelled";

export interface DeliveryNoteLine {
  price_list_item_id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface DeliveryNote {
  _id: string;
  tenantId: string;
  delivery_number: string;
  contact_id: string;
  project_id: string | null;
  status: DeliveryNoteStatus;
  issue_date: Date;
  lines: DeliveryNoteLine[];
  notes: string | null;
  created_by: string;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECRET STORAGE / TITOKTÁR MODULE
// ─────────────────────────────────────────────────────────────────────────────

export type SecretVisibility = "shared" | "private";

export interface Secret {
  _id: string;
  tenantId: string;
  project_id: string | null;
  contact_id: string | null;
  key: string;
  encrypted_value: string; // base64 ciphertext:iv:tag
  visibility: SecretVisibility;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WARRANTY CARD / JÓTÁLLÁSI JEGY MODULE
// ─────────────────────────────────────────────────────────────────────────────

export type WarrantyStatus = "active" | "expired" | "claimed" | "void";

export interface WarrantyLine {
  /** null = szabadon beírt terméksor (nem árlistás) */
  price_list_item_id: string | null;
  /** Termék neve – auto-kitölt árlistából, de szerkeszthető */
  name: string;
  /** Gyártási / sorozatszám */
  serial_number: string | null;
  /** Jótállás időtartama évben */
  warranty_years: number;
  /** Jótállás kezdő dátuma */
  warranty_start: Date;
  /** Auto-számolt lejárati dátum */
  warranty_end: Date;
}

export interface WarrantyCard {
  _id: string;
  tenantId: string;
  /** Auto-generált sorszám: JJY-000001 */
  warranty_number: string;
  /** Melyik partnernek szól a jótállás */
  contact_id: string;
  /** Opcionális számla sorszáma (szabadon beírt szöveg) */
  invoice_number: string | null;
  /** Kiállítás dátuma */
  issue_date: Date;
  /** Jótálló tételek listája */
  lines: WarrantyLine[];
  notes: string | null;
  /** Jótállás állapota */
  status: WarrantyStatus;
  /** Generált PDF URL */
  pdf_url: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY PLAN / HETI TERVEK MODULE
// ─────────────────────────────────────────────────────────────────────────────

export type WeeklyPlanStatus = "todo" | "in_progress" | "done" | "blocked";
export type WeeklyPlanPriority = "low" | "medium" | "high" | "urgent";

export interface WeeklyPlan {
  _id: string;
  tenantId: string;
  assignee_id: string;
  week_number: number; // ISO week number
  year: number;
  title: string;
  description: string | null;
  status: WeeklyPlanStatus;
  priority: WeeklyPlanPriority;
  ticket_id: string | null;
  project_id: string | null;
  worklog_id: string | null;
  due_date: Date | string | null;
  is_archived?: boolean;
  archived_at?: Date | null;
  archive_reason?: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL TRACKING / ESZKÖZÖK MODULE
// ─────────────────────────────────────────────────────────────────────────────

export type ToolStatus =
  | "in_warehouse"
  | "checked_out"
  | "maintenance"
  | "lost"
  | "retired";
export type ToolCondition = "new" | "good" | "fair" | "poor";

export interface Tool {
  _id: string;
  tenantId: string;
  name: string;
  brand?: string;
  model_number?: string;
  serial_number?: string;
  status: ToolStatus;
  assigned_to?: string; // User ID (actor.actorId)
  condition: ToolCondition;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type ToolTransactionType =
  | "check_out"
  | "check_in"
  | "maintenance_start"
  | "maintenance_end"
  | "mark_lost"
  | "retire";

export interface ToolTransaction {
  _id: string;
  tenantId: string;
  tool_id: string;
  actor_id: string;
  type: ToolTransactionType;
  target_user_id?: string;
  notes?: string;
  created_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST TEMPLATES – DINAMIKUS MUNKALAP ELLENŐRZŐLISTÁK
// ─────────────────────────────────────────────────────────────────────────────

export interface ChecklistTemplateItem {
  item_id: string;
  text: string;
  is_required: boolean;
  order: number;
}

export interface ChecklistTemplate {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  items: ChecklistTemplateItem[];
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorklogChecklistItem {
  item_id: string;
  text: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: Date | null;
  completed_by?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT EXPENSE – KIKÜLDETÉSI ÉS ÚTIKÖLTSÉG MODUL
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseType =
  | "fuel"
  | "parking"
  | "toll"
  | "accommodation"
  | "material"
  | "other";

export interface ProjectExpense {
  _id: string;
  tenantId: string;
  project_id: string;
  worklog_id?: string | null;
  expense_type: ExpenseType;
  description?: string;
  amount: number;
  currency: string;
  receipt_image_url?: string | null;
  recorded_by: string;
  date: Date | string;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECRET SHARE – EGYSZERI BIZTONSÁGOS MEGOSZTÁSI LINKEK
// ─────────────────────────────────────────────────────────────────────────────

export interface SecretShare {
  _id: string;
  tenantId: string;
  secret_id: string;
  token: string;
  expires_at: Date | string;
  view_count_limit: number;
  view_count: number;
  viewed_at?: Date | null;
  ip_address_log: string[];
  created_by: string;
  created_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE PLAN – SLA PREVENTÍV KARBANTARTÁS ÜTEMEZŐ
// ─────────────────────────────────────────────────────────────────────────────

export interface MaintenancePlan {
  _id: string;
  tenantId: string;
  title: string;
  contact_id: string;
  project_id?: string | null;
  frequency_months: number;
  next_due_date: Date | string;
  last_generated_at?: Date | null;
  is_active: boolean;
  template_title: string;
  template_description?: string;
  template_category: string;
  template_priority: "low" | "medium" | "high" | "critical";
  template_assigned_to?: string | null;
  advance_days: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOORPLAN – BIM / VIZUÁLIS HÁLÓZAT-TÉRKÉPEZÉS
// ─────────────────────────────────────────────────────────────────────────────

export type MarkerType =
  | "camera"
  | "ap"
  | "switch"
  | "rack"
  | "socket"
  | "sensor"
  | "router"
  | "server"
  | "other";

export interface FloorplanMarker {
  marker_id: string;
  x_percent: number;
  y_percent: number;
  label?: string;
  ticket_id?: string | null;
  asset_id?: string | null;
  marker_type: MarkerType;
  description?: string;
}

export interface Floorplan {
  _id: string;
  tenantId: string;
  contact_id: string;
  project_id?: string | null;
  name: string;
  image_url: string;
  markers: FloorplanMarker[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
