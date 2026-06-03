import { NextResponse } from "next/server";
import {
  PriceListItemModel,
  SettingsModel,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await PriceListItemModel.findOne({
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
    guard(actor, { module: "price_list", action: "write", scope: "global" });
    const patch: Record<string, unknown> = await req.json();
    delete patch._id;
    delete patch.tenantId;
    delete patch.item_number;

    return await withDb(async () => {
      const currentItem = await PriceListItemModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });
      if (!currentItem) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (patch.category && patch.category !== currentItem.category) {
        const settings = await SettingsModel.findOne({ tenantId: actor.tenantId }).lean();
        let prefix = "PL";
        if ((settings as any)?.item_categories) {
          const cat = (settings as any).item_categories.find(
            (c: any) => c.id === patch.category,
          );
          if (cat && cat.prefix) {
            prefix = cat.prefix;
          }
        }

        let item_number = "";
        let foundUnique = false;
        let counter = await nextCounterValue(actor.tenantId, `price_list_${prefix}`);
        while (!foundUnique) {
          item_number = `${prefix}${String(counter).padStart(6, "0")}`;
          const existing = await PriceListItemModel.findOne({
            tenantId: actor.tenantId,
            item_number,
          });
          if (!existing) {
            foundUnique = true;
          } else {
            counter = await nextCounterValue(actor.tenantId, `price_list_${prefix}`);
          }
        }
        patch.item_number = item_number;
      }

      const doc = await PriceListItemModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true },
      ).lean();

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "admin", scope: "global" });
    return await withDb(async () => {
      const res = await PriceListItemModel.deleteOne({
        _id: id,
        tenantId: actor.tenantId,
      });
      if (res.deletedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
