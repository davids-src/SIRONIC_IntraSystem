import { NextResponse } from "next/server";
import {
  WorklogModel,
  StockItemModel,
  PriceListItemModel,
  DeliveryNoteModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import type {
  PreflightResult,
  PreflightMessage,
  StockImpactLine,
  DeliveryNotePreviewLine,
  RelatedDocument,
} from "@crm/types";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/worklogs/:id/preflight
 * Munkalap véglegesítés előtti átfogó ellenőrzés
 */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "view", scope: "global" });

    return await withDb(async () => {
      const doc = (await WorklogModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean()) as any;

      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const messages: PreflightMessage[] = [];
      const stockImpact: StockImpactLine[] = [];
      const deliveryNotePreview: DeliveryNotePreviewLine[] = [];
      const relatedDocuments: RelatedDocument[] = [];

      // Ellenőrzés: csak piszkozatot lehet véglegesíteni
      if (doc.status !== "draft") {
        messages.push({
          severity: "error",
          code: "NOT_DRAFT",
          message: `A munkalap állapota "${doc.status}" – csak piszkozat állapotú munkalap véglegesíthető.`,
        });
      }

      // Checklist ellenőrzés
      const checklist = doc.checklist_items || [];
      const uncompletedRequired = checklist.filter(
        (item: any) => item.is_required && !item.is_completed,
      );
      if (uncompletedRequired.length > 0) {
        messages.push({
          severity: "error",
          code: "INCOMPLETE_CHECKLIST",
          message: `Kötelező checklist elemek nincsenek kész: ${uncompletedRequired.map((i: any) => i.text).join(", ")}`,
        });
      }

      // Fizikai termékek azonosítása (szállítólevél generáláshoz)
      const linkedItems = (doc.items || []).filter(
        (it: any) => it.price_list_item_id && it.quantity > 0,
      );

      // PriceListItem-ek betöltése típus ellenőrzéshez
      const itemIds = linkedItems.map((it: any) => it.price_list_item_id);
      const priceListItems = await PriceListItemModel.find({
        tenantId: actor.tenantId,
        _id: { $in: itemIds },
      }).lean();
      const priceListMap = new Map(priceListItems.map((p: any) => [String(p._id), p]));

      let hasProductItems = false;

      for (const item of linkedItems) {
        const pli = priceListMap.get(String(item.price_list_item_id));
        if (!pli || (pli as any).type !== "product") continue;

        hasProductItems = true;

        // Készlet ellenőrzés
        const stockItem = (await StockItemModel.findOne({
          tenantId: actor.tenantId,
          price_list_item_id: item.price_list_item_id,
        }).lean()) as any;

        const currentStock = stockItem?.quantity_in_stock ?? 0;
        const allocatedStock = stockItem?.quantity_allocated ?? 0;
        const availableStock = currentStock - allocatedStock;
        const stockAfter = currentStock - item.quantity;
        const insufficient = item.quantity > currentStock;

        stockImpact.push({
          price_list_item_id: item.price_list_item_id,
          name: item.description || (pli as any).name || "Ismeretlen termék",
          unit: item.unit || (pli as any).unit || "db",
          requested_quantity: item.quantity,
          current_stock: currentStock,
          allocated_stock: allocatedStock,
          available_stock: availableStock,
          stock_after: stockAfter,
          insufficient,
        });

        // Szállítólevél tétel hozzáadása
        deliveryNotePreview.push({
          price_list_item_id: item.price_list_item_id,
          name: item.description || (pli as any).name || "Ismeretlen termék",
          quantity: item.quantity,
          unit: item.unit || (pli as any).unit || "db",
        });

        if (insufficient) {
          messages.push({
            severity: "error",
            code: "INSUFFICIENT_STOCK",
            message: `Nincs elég készlet: "${item.description}" – kért: ${item.quantity}, elérhető: ${currentStock} ${item.unit}`,
            item_ref: item.price_list_item_id,
          });
        } else if (
          stockAfter <= (stockItem?.low_stock_threshold ?? 0) &&
          stockItem?.low_stock_threshold
        ) {
          messages.push({
            severity: "warning",
            code: "LOW_STOCK_WARNING",
            message: `A véglegesítés után alacsony készlet lesz: "${item.description}" – maradék: ${stockAfter} ${item.unit}`,
            item_ref: item.price_list_item_id,
          });
        }
      }

      // Ha van termék tétel, szállítólevél generálás szükséges
      if (hasProductItems) {
        messages.push({
          severity: "info",
          code: "DELIVERY_NOTE_WILL_BE_CREATED",
          message: `A véglegesítés szállítólevelet generál ${deliveryNotePreview.length} tétellel. Az alábbi tételeket és mennyiségeket ellenőrizd és szükség esetén korrigáld.`,
        });
      }

      // Duplikáció: van-e már véglegesített munkalap ugyanarra a dátumra és partnerhez
      if (doc.contact_id) {
        const sameDayWorklogs = await WorklogModel.find({
          tenantId: actor.tenantId,
          contact_id: doc.contact_id,
          status: "finalized",
          work_date: doc.work_date,
          _id: { $ne: id },
          is_archived: { $ne: true },
        })
          .limit(5)
          .lean();

        for (const existing of sameDayWorklogs) {
          const e = existing as any;
          relatedDocuments.push({
            _id: String(e._id),
            type: "worklog",
            number: e.worklog_number,
            status: e.status,
            created_at: e.created_at?.toISOString?.() ?? "",
          });
        }

        if (sameDayWorklogs.length > 0) {
          messages.push({
            severity: "warning",
            code: "EXISTING_FINALIZED_WORKLOGS",
            message: `Már van ${sameDayWorklogs.length} véglegesített munkalap ehhez a partnerhez ugyanerre a napra.`,
          });
        }
      }

      // Kapcsolódó szállítólevelek lekérdezése
      if (doc.project_id) {
        const existingDNs = await DeliveryNoteModel.find({
          tenantId: actor.tenantId,
          project_id: doc.project_id,
          status: { $in: ["draft", "issued"] },
          is_archived: { $ne: true },
        })
          .sort({ created_at: -1 })
          .limit(5)
          .lean();

        for (const existing of existingDNs) {
          const e = existing as any;
          relatedDocuments.push({
            _id: String(e._id),
            type: "delivery_note",
            number: e.delivery_number,
            status: e.status,
            created_at: e.created_at?.toISOString?.() ?? "",
          });
        }
      }

      const canProceed = !messages.some((m) => m.severity === "error");

      const result: PreflightResult = {
        canProceed,
        messages,
        stockImpact,
        deliveryNotePreview: deliveryNotePreview.length > 0 ? deliveryNotePreview : null,
        shouldGenerateDeliveryNote: hasProductItems,
        relatedDocuments,
        documentType: "worklog",
        documentId: id,
      };

      return NextResponse.json(serializeForJson(result));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
