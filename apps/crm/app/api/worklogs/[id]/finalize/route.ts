import { NextResponse } from "next/server";
import { WorklogModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "finalize", scope: "global" });
    return await withDb(async () => {
      const doc = await WorklogModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId, status: "draft" },
        { $set: { status: "finalized" } },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json(
          { error: "Not found or already finalized" },
          { status: 404 },
        );
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
