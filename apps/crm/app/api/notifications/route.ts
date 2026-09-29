import { NextResponse } from "next/server";
import { NotificationModel, serializeForJson } from "@crm/db";
import { requireCrmAuth, withDb, handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const { actor, session } = await requireCrmAuth();
    return await withDb(async () => {
      const rows = await NotificationModel.find({
        tenantId: actor.tenantId,
        user_id: session.user.id,
      })
        .sort({ created_at: -1 })
        .limit(50)
        .lean();

      const unreadCount = await NotificationModel.countDocuments({
        tenantId: actor.tenantId,
        user_id: session.user.id,
        read: false,
      });

      return NextResponse.json({
        notifications: serializeForJson(rows),
        unreadCount,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
