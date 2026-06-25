import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PriceListItemModel,
  StockItemModel,
  StockTransactionModel,
  ProjectModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ price_list_item_id: string }> };

const patchSchema = z.object({
  warehouse_location: z.string().nullable().optional(),
  low_stock_threshold: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  quantity_allocated: z.number().optional(),
  project_id: z.string().nullable().optional(),
  allocate_quantity: z.number().optional(),
});

const adjustSchema = z.object({
  new_quantity: z.number().min(0),
  notes: z.string().nullable().optional(),
});

/**
 * PATCH /api/warehouse/stock/[price_list_item_id]
 * Raktárkészlet metaadatainak módosítása (hely, küszöb, megjegyzés).
 */
export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { price_list_item_id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(price_list_item_id);
      const query = isObjectId
        ? { tenantId: actor.tenantId, _id: price_list_item_id }
        : { tenantId: actor.tenantId, price_list_item_id };

      let pliId = price_list_item_id;
      if (isObjectId) {
        const si = (await StockItemModel.findOne({
          tenantId: actor.tenantId,
          _id: price_list_item_id,
        }).lean()) as any;
        if (si) {
          pliId = String(si.price_list_item_id);
        }
      }

      if (b.project_id && b.allocate_quantity && b.allocate_quantity > 0) {
        const project = await ProjectModel.findOne({
          _id: b.project_id,
          tenantId: actor.tenantId,
        });

        if (!project) {
          return NextResponse.json({ error: "Projekt nem található." }, { status: 404 });
        }

        if (!project.required_items) {
          project.required_items = [];
        }

        let reqItem = project.required_items.find(
          (ri: any) => ri.price_list_item_id === pliId,
        );

        if (reqItem) {
          reqItem.reserved_quantity += b.allocate_quantity;
        } else {
          const pli = (await PriceListItemModel.findOne({
            _id: pliId,
            tenantId: actor.tenantId,
          }).lean()) as any;

          project.required_items.push({
            price_list_item_id: pliId,
            name: pli ? pli.name : "Ismeretlen termék",
            unit: pli ? pli.unit : "db",
            required_quantity: 0,
            reserved_quantity: b.allocate_quantity,
          });
        }

        await project.save();

        const doc = await StockItemModel.findOneAndUpdate(
          query,
          {
            $inc: { quantity_allocated: b.allocate_quantity },
            ...(b.notes !== undefined && { notes: b.notes }),
          },
          { new: true, upsert: true },
        ).lean();

        await StockTransactionModel.create({
          tenantId: actor.tenantId,
          price_list_item_id: pliId,
          type: "transfer",
          quantity: b.allocate_quantity,
          reference_type: "manual",
          reference_id: String(project._id),
          notes: `Foglalás a ${project.name} projekthez.`,
          created_by: actor.actorId ?? "system",
        });

        return NextResponse.json(serializeForJson(doc));
      }

      const doc = await StockItemModel.findOneAndUpdate(
        query,
        {
          $set: {
            ...(b.warehouse_location !== undefined && {
              warehouse_location: b.warehouse_location,
            }),
            ...(b.low_stock_threshold !== undefined && {
              low_stock_threshold: b.low_stock_threshold,
            }),
            ...(b.notes !== undefined && { notes: b.notes }),
            ...(b.quantity_allocated !== undefined && {
              quantity_allocated: b.quantity_allocated,
            }),
          },
        },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Nem található." }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/warehouse/stock/[price_list_item_id]
 * Törli a raktárkészlet tételt (nullázza az árlistaelemet a raktárból).
 */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { price_list_item_id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "admin", scope: "global" });

    return await withDb(async () => {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(price_list_item_id);
      const query = isObjectId
        ? { tenantId: actor.tenantId, _id: price_list_item_id }
        : { tenantId: actor.tenantId, price_list_item_id };

      const res = await StockItemModel.deleteOne(query);
      if (res.deletedCount === 0) {
        return NextResponse.json({ error: "Nem található." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
