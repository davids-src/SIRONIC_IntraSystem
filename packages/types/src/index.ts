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
  | "organization"
  | "inventory"
  | "offer"
  | "ticket"
  | "worklog"
  | "completion_certificate"
  | "portal_permissions"
  | "project";

export type PermissionScope = "global" | "organization" | "resource";

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

export interface ProductMetadata {
  net_price: number;
  seller: string;
  part_number: string;
  updated_at: Date;
}

export interface ProductCategoryRef {
  _id: string;
  name: string;
  skuPrefix: string;
}

export interface Product {
  sku: string;
  category: ProductCategoryRef;
  part_number: string;
  net_price: number;
  image?: string;
  metadata: ProductMetadata;
  metadata_history: ProductMetadata[];
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

export type TicketSource = "crm" | "partner_portal";
export type TicketType = "incident" | "service_request" | "maintenance" | "security";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketStatus = "new" | "in_progress" | "waiting" | "resolved" | "closed";

export interface Ticket {
  _id: string;
  ticket_number: string;
  tenantId: string;
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  source: TicketSource;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  project_id: string | null;
  location: string;
  affected_system: string;
  affected_devices: string[];
  attachments: Attachment[];
  comments: TicketComment[];
  resolution_notes: string | null;
  resolved_at: Date | null;
  sla_deadline: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorklogDevice {
  device_name: string;
  device_type: string;
  serial_number: string | null;
  action_taken: string;
}

export interface WorklogMaterial {
  name: string;
  quantity: number;
  unit: string;
  part_number: string | null;
}

export type WorklogStatus = "draft" | "finalized" | "signed";
export type WorklogType =
  | "it_support"
  | "network"
  | "security"
  | "web"
  | "maintenance"
  | "installation";

export interface Worklog {
  _id: string;
  worklog_number: string;
  tenantId: string;
  organization_id: string;
  partner_id: string | null;
  created_by: string;
  ticket_id: string | null;
  project_id: string | null;
  status: WorklogStatus;
  work_date: Date;
  work_start: string;
  work_end: string;
  technician_name: string;
  technician_signature: string | null;
  client_name: string;
  client_signature: string | null;
  site_address: string;
  work_type: WorklogType;
  work_description: string;
  devices_serviced: WorklogDevice[];
  materials_used: WorklogMaterial[];
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
  organization_id: string;
  partner_id: string;
  created_by: string;
  worklog_ids: string[];
  ticket_ids: string[];
  project_id: string | null;
  status: CompletionCertificateStatus;
  title: string;
  description: string;
  work_period_start: Date;
  work_period_end: Date;
  total_hours: number;
  work_summary: string;
  client_name: string;
  client_title: string;
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

export type ProjectType =
  | "network"
  | "web"
  | "security"
  | "nis2"
  | "it_support"
  | "other";
export type ProjectContractType = "project" | "ongoing";
export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "review"
  | "live"
  | "closed"
  | "on_hold";
export type ProjectPhaseStatus = "pending" | "in_progress" | "completed";
export type StagingLinkApprovalStatus = "pending" | "approved" | "changes_requested";
export type ChecklistItemCategory =
  | "content"
  | "assets"
  | "documents"
  | "technical"
  | "other";

export interface ProjectPhase {
  _id: string;
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
  organization_id: string;
  created_by: string;
  assigned_to: string | null;
  type: ProjectType;
  contract_type: ProjectContractType;
  status: ProjectStatus;
  name: string;
  description: string;
  start_date: Date;
  deadline: Date | null;
  closed_at: Date | null;
  budget_hours: number | null;
  total_logged_hours: number;
  staging_links: StagingLink[];
  material_checklist: ChecklistItem[];
  phases: ProjectPhase[];
  portal_visible: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  _id: string;
  name: string;
  tax_id?: string;
  address?: string;
  type?: string;
  portal_permissions: PortalPermissions;
}
