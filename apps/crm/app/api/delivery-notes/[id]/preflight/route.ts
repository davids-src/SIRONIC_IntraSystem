import { NextResponse } from "next/server";
import {
  DeliveryNoteModel,
  StockItemModel,
  PriceListItemModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import type {
  PreflightResult,
  PreflightMessage,
  StockImpactLine,
  RelatedDocument,
} from "@crm/types";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/delivery-notes/:id/preflight
 * Szállítólevél kiadás előtti ellenőrzés (meglévő draft szállítólevélhez)
 */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "delivery_note", action: "view", scope: "global" });

    return await withDb(async () => {
      const doc = (await DeliveryNoteModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean()) as any;

      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const messages: PreflightMessage[] = [];
      const stockImpact: StockImpactLine[] = [];
      const relatedDocuments: RelatedDocument[] = [];

      // Ellenőrzés: csak piszkozatot lehet kiadni
      if (doc.status !== "draft") {
        messages.push({
          severity: "error",
          code: "NOT_DRAFT",
          message: `A szállítólevél állapota "${doc.status}" – csak piszkozat állapotú bizonylat adható ki.`,
        });
      }

      // Tételenkénti készletellenőrzés
      for (const line of doc.lines || []) {
        // PriceListItem típus lekérése
        const pli = (await PriceListItemModel.findOne({
          _id: line.price_list_item_id,
          tenantId: actor.tenantId,
        }).lean()) as any;

        // Nem-termék tételekre nincs készlethatás
        if (pli && pli.type !== "product") {
          continue;
        }

        const stockItem = (await StockItemModel.findOne({
          tenantId: actor.tenantId,
          price_list_item_id: line.price_list_item_id,
        }).lean()) as any;

        const currentStock = stockItem?.quantity_in_stock ?? 0;
        const allocatedStock = stockItem?.quantity_allocated ?? 0;
        const availableStock = currentStock - allocatedStock;
        const stockAfter = currentStock - line.quantity;
        const insufficient = line.quantity > currentStock;

        stockImpact.push({
          price_list_item_id: line.price_list_item_id,
          name: line.name,
          unit: line.unit,
          requested_quantity: line.quantity,
          current_stock: currentStock,
          allocated_stock: allocatedStock,
          available_stock: availableStock,
          stock_after: stockAfter,
          insufficient,
        });

        if (insufficient) {
          messages.push({
            severity: "error",
            code: "INSUFFICIENT_STOCK",
            message: `Nincs elég készlet: "${line.name}" – kért: ${line.quantity}, elérhető: ${currentStock} ${line.unit}`,
            item_ref: line.price_list_item_id,
          });
        } else if (
          stockAfter <= (stockItem?.low_stock_threshold ?? 0) &&
          stockItem?.low_stock_threshold
        ) {
          messages.push({
            severity: "warning",
            code: "LOW_STOCK_WARNING",
            message: `A kiadás után alacsony készlet lesz: "${line.name}" – maradék: ${stockAfter} ${line.unit} (küszöb: ${stockItem.low_stock_threshold})`,
            item_ref: line.price_list_item_id,
          });
        }
      }

      // Duplikáció ellenőrzés: van-e már kiadott szállítólevél ugyanahhoz a partnerhez és projekthez
      if (doc.project_id) {
        const existingIssued = await DeliveryNoteModel.find({
          tenantId: actor.tenantId,
          contact_id: doc.contact_id,
          project_id: doc.project_id,
          status: "issued",
          _id: { $ne: id },
          is_archived: { $ne: true },
        })
          .sort({ created_at: -1 })
          .limit(5)
          .lean();

        for (const existing of existingIssued) {
          const e = existing as any;
          relatedDocuments.push({
            _id: String(e._id),
            type: "delivery_note",
            number: e.delivery_number,
            status: e.status,
            created_at: e.created_at?.toISOString?.() ?? "",
          });
        }

        if (existingIssued.length > 0) {
          messages.push({
            severity: "warning",
            code: "EXISTING_DELIVERY_NOTES",
            message: `Már létezik ${existingIssued.length} kiadott szállítólevél ehhez a projekthez. Ellenőrizd, hogy nem duplikáció-e.`,
          });
        }
      }

      const canProceed = !messages.some((m) => m.severity === "error");

      const result: PreflightResult = {
        canProceed,
        messages,
        stockImpact,
        deliveryNotePreview: null,
        shouldGenerateDeliveryNote: false,
        relatedDocuments,
        documentType: "delivery_note",
        documentId: id,
      };

      return NextResponse.json(serializeForJson(result));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
