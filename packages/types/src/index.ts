export type RoleKey = "crm.admin" | "crm.staff" | "partner.admin" | "partner.viewer";

export type PermissionAction = "view" | "write" | "admin";

export type PermissionModule = "dashboard" | "organization" | "inventory" | "offer";

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
