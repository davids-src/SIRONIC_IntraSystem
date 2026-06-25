import { NextResponse } from "next/server";
import {
  WorklogModel,
  StockItemModel,
  StockTransactionModel,
  DeliveryNoteModel,
  PriceListItemModel,
  ProjectModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "finalize", scope: "global" });
    return await withDb(async () => {
      const doc = (await WorklogModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId, status: "draft" },
        { $set: { status: "finalized" } },
        { new: true },
      ).lean()) as any;
      if (!doc) {
        return NextResponse.json(
          { error: "Not found or already finalized" },
          { status: 404 },
        );
      }

      // ── Raktár levonás / Szállítólevél generálás ────────────────────────────
      const linkedItems = doc.items.filter(
        (it: any) => it.price_list_item_id && it.quantity > 0,
      );

      // Load price list items to check their types
      const itemIds = linkedItems.map((it: any) => it.price_list_item_id);
      const priceListItems = await PriceListItemModel.find({
        tenantId: actor.tenantId,
        _id: { $in: itemIds },
      }).lean();
      const priceListMap = new Map(priceListItems.map((p: any) => [String(p._id), p]));

      // Check if there is at least one "product" type item
      const hasProduct = linkedItems.some((it: any) => {
        const p = priceListMap.get(String(it.price_list_item_id));
        return p && p.type === "product";
      });

      if (hasProduct) {
        // Create auto-generated delivery note
        const n = await nextCounterValue(actor.tenantId, "delivery_note");
        const delivery_number = formatNumber("SZL", n);

        const deliveryLines = linkedItems.map((it: any) => ({
          price_list_item_id: String(it.price_list_item_id),
          name: it.description,
          quantity: it.quantity,
          unit: it.unit,
        }));

        const isProjectBound = !!doc.project_id;
        const deliveryNoteStatus = isProjectBound ? "issued" : "draft";

        await DeliveryNoteModel.create({
          tenantId: actor.tenantId,
          delivery_number,
          contact_id: doc.contact_id || "",
          project_id: doc.project_id || null,
          status: deliveryNoteStatus,
          issue_date: new Date(),
          lines: deliveryLines,
          notes: `Automatizáltan generálva a ${doc.worklog_number} munkalapból.`,
          created_by: actor.actorId ?? "system",
        });

        // If project bound, immediately deduct stock of type 'product' and release allocation
        if (isProjectBound) {
          const project = await ProjectModel.findOne({
            _id: doc.project_id,
            tenantId: actor.tenantId,
          });

          for (const line of deliveryLines) {
            try {
              const item = priceListMap.get(line.price_list_item_id);
              if (item && (item as any).type !== "product") {
                continue;
              }

              // Deduct from quantity_in_stock
              await StockItemModel.findOneAndUpdate(
                { tenantId: actor.tenantId, price_list_item_id: line.price_list_item_id },
                { $inc: { quantity_in_stock: -line.quantity } },
                { upsert: true },
              );

              // Calculate reservation deductions
              let usedFromReservation = 0;
              if (project && project.required_items) {
                const reqItem = project.required_items.find(
                  (ri: any) => ri.price_list_item_id === line.price_list_item_id,
                );
                if (reqItem && reqItem.reserved_quantity > 0) {
                  usedFromReservation = Math.min(
                    line.quantity,
                    reqItem.reserved_quantity,
                  );
                  reqItem.reserved_quantity -= usedFromReservation;
                }
              }

              if (usedFromReservation > 0) {
                // Reduce the total allocated quantity on the StockItem
                await StockItemModel.findOneAndUpdate(
                  {
                    tenantId: actor.tenantId,
                    price_list_item_id: line.price_list_item_id,
                  },
                  { $inc: { quantity_allocated: -usedFromReservation } },
                );
              }

              // Log transaction
              await StockTransactionModel.create({
                tenantId: actor.tenantId,
                price_list_item_id: line.price_list_item_id,
                type: "out",
                quantity: line.quantity,
                reference_type: "worklog",
                reference_id: String(doc._id),
                notes: `Projekt munkalap alapján (SZL: ${delivery_number})`,
                created_by: actor.actorId ?? "system",
              });
            } catch (err) {
              console.error("Hiba a raktár levonásakor (projekt):", err);
            }
          }

          if (project) {
            await project.save();
          }
        }
      } else {
        // Fallback: original stock deduction logic for non-delivery note items (e.g. services / other)
        for (const item of linkedItems) {
          try {
            const stockItem = (await StockItemModel.findOne({
              tenantId: actor.tenantId,
              price_list_item_id: item.price_list_item_id,
            }).lean()) as any;

            if (!stockItem) continue;

            const deduct = Math.min(item.quantity, stockItem.quantity_in_stock);
            if (deduct <= 0) continue;

            await StockItemModel.findOneAndUpdate(
              { tenantId: actor.tenantId, price_list_item_id: item.price_list_item_id },
              { $inc: { quantity_in_stock: -deduct } },
            );

            await StockTransactionModel.create({
              tenantId: actor.tenantId,
              price_list_item_id: item.price_list_item_id,
              type: "out",
              quantity: deduct,
              reference_type: "worklog",
              reference_id: String(doc._id),
              notes: `Munkalap: ${doc.worklog_number} – ${item.description}`,
              created_by: actor.actorId ?? "system",
            });
          } catch {
            // non-fatal
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
