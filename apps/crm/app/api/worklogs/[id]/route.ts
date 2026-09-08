import { NextResponse } from "next/server";
import { WorklogModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await WorklogModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "write", scope: "global" });
    const patch: Record<string, unknown> = await req.json();
    delete patch._id;
    delete patch.tenantId;
    delete patch.worklog_number;

    // Guard: véglegesítés kizárólag a /finalize végponton keresztül lehetséges
    if (patch.status === "finalized") {
      return NextResponse.json(
        {
          error:
            "A véglegesítés kizárólag a /finalize végponton keresztül lehetséges, hogy a készlet- és szállítólevél-kezelés helyesen fusson le.",
        },
        { status: 400 },
      );
    }
    return await withDb(async () => {
      // Megjegyzés: a "finalized" státuszra váltás itt fentebb már 400-at ad
      // vissza, tehát ide sosem juthat el patch.status === "finalized" – a
      // kötelező checklist-ellenőrzés a tényleges véglegesítési útvonalon,
      // a POST /api/worklogs/[id]/finalize végponton történik.
      const doc = await WorklogModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "admin", scope: "global" });
    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "Törölve";
    return await withDb(async () => {
      const doc = await WorklogModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_archived: true, archived_at: new Date(), archive_reason: reason } },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
