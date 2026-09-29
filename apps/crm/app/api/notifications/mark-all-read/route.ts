import { NextResponse } from "next/server";
import { NotificationModel } from "@crm/db";
import { requireCrmAuth, withDb, handleApiError } from "@/lib/api-helpers";

export async function POST() {
  try {
    const { actor, session } = await requireCrmAuth();
    return await withDb(async () => {
      await NotificationModel.updateMany(
        {
          tenantId: actor.tenantId,
          user_id: session.user.id,
          read: false,
        },
        { $set: { read: true } },
      );

      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
