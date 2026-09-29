import { NextResponse } from "next/server";
import { NotificationModel, serializeForJson } from "@crm/db";
import { requireCrmAuth, withDb, handleApiError, HttpError } from "@/lib/api-helpers";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { actor, session } = await requireCrmAuth();
    return await withDb(async () => {
      const doc = await NotificationModel.findOneAndUpdate(
        {
          _id: id,
          tenantId: actor.tenantId,
          user_id: session.user.id,
        },
        { $set: { read: true } },
        { new: true },
      ).lean();

      if (!doc) {
        throw new HttpError(404, "Notification not found");
      }

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
