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
  | "ticket"
  | "worklog"
  | "completion_certificate"
  | "portal_permissions"
  | "project"
  | "settings";

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
  created_at: Date;
  updated_at: Date;
}

export type CompletionCertificateStatus = "draft" | "sent" | "accepted" | "rejected";

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
  pdf_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PortalPermissions {
  menu_tickets: boolean;
  menu_worklogs: boolean;
  menu_offers: boolean;
  menu_completion_certificates: boolean;
  menu_projects: boolean;
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

export interface Settings {
  ticket_categories: string[];
  worklog_categories: string[];
  project_categories: string[];
  price_list_categories: string[];
  worklog_units: string[];
  contact_tags: string[];
}

// Backwards compatibility for older UI code during incremental refactor.
// Will be removed once all modules are migrated.
export type Organization = Contact;
