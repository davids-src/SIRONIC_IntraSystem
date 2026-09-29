import { AuditLogModel } from "@crm/db";

export interface CreateAuditLogParams {
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
}

export async function logAuditEvent(params: CreateAuditLogParams): Promise<void> {
  try {
    await AuditLogModel.create({
      tenantId: params.tenantId,
      user_id: params.userId,
      user_name: params.userName,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      summary: params.summary,
      changes: params.changes || null,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[AuditLog] Failed to record audit log:", error);
    // Non-blocking: Do not crash the parent operation if logging fails
  }
}
