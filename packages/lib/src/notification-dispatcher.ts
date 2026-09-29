import {
  NotificationModel,
  NotificationPreferenceModel,
  DeliveryLogModel,
  CrmUserModel,
} from "@crm/db";
import type { NotificationEventType } from "@crm/types";

export interface DispatchNotificationParams {
  tenantId: string;
  eventType: NotificationEventType | string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  href?: string;
  recipientUserIds?: string[];
  broadcastToAllStaff?: boolean;
}

export async function dispatchNotification(
  params: DispatchNotificationParams,
): Promise<{ dispatchedCount: number }> {
  try {
    let targetUserIds = params.recipientUserIds || [];

    if (params.broadcastToAllStaff || targetUserIds.length === 0) {
      const users = await CrmUserModel.find({
        tenantId: params.tenantId,
      }).select("_id");
      targetUserIds = users.map((u: any) => u._id.toString());
    }

    if (targetUserIds.length === 0) {
      return { dispatchedCount: 0 };
    }

    // Check notification preferences for in_app
    const prefs = await NotificationPreferenceModel.find({
      tenantId: params.tenantId,
      user_id: { $in: targetUserIds },
      event_type: params.eventType,
      channel: "in_app",
    });

    const disabledUserSet = new Set(
      prefs.filter((p: any) => p.enabled === false).map((p: any) => p.user_id),
    );

    const activeUserIds = targetUserIds.filter((uid) => !disabledUserSet.has(uid));

    const docsToInsert = activeUserIds.map((userId) => ({
      tenantId: params.tenantId,
      user_id: userId,
      type: params.eventType,
      title: params.title,
      message: params.message,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      href: params.href || null,
      read: false,
      created_at: new Date(),
    }));

    if (docsToInsert.length > 0) {
      await NotificationModel.insertMany(docsToInsert);
    }

    // Record in delivery log
    await DeliveryLogModel.create({
      tenantId: params.tenantId,
      channel: "in_app",
      recipient: `${docsToInsert.length} user(s)`,
      event: params.eventType,
      subject: params.title,
      status: "sent",
      sent_at: new Date(),
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
    });

    return { dispatchedCount: docsToInsert.length };
  } catch (error: any) {
    console.error("[NotificationDispatcher] Failed to dispatch notification:", error);
    try {
      await DeliveryLogModel.create({
        tenantId: params.tenantId,
        channel: "in_app",
        recipient: "unknown",
        event: params.eventType,
        subject: params.title,
        status: "failed",
        sent_at: new Date(),
        error: error?.message || "Unknown error",
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
      });
    } catch {}
    return { dispatchedCount: 0 };
  }
}
