import { NextResponse } from "next/server";
import { DeploymentEventModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const cursor = searchParams.get("cursor");

    return await withDb(async () => {
      const filter: Record<string, unknown> = {
        tenantId: actor.tenantId,
        deployment_id: id,
      };
      if (cursor) filter.created_at = { $lt: new Date(cursor) };
      const rows = await DeploymentEventModel.find(filter)
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();
      const nextCursor = rows.length === limit ? rows[rows.length - 1]?.created_at : null;
      return NextResponse.json({
        items: serializeForJson(rows),
        next_cursor: nextCursor,
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
