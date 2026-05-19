import { NextResponse } from "next/server";
import { StockTransactionModel, PriceListItemModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

/**
 * GET /api/warehouse/transactions
 * Raktármozgás napló lekérdezése.
 * Szűrhető: price_list_item_id, type, reference_type
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("price_list_item_id")?.trim();
    const txType = searchParams.get("type")?.trim();
    const refType = searchParams.get("reference_type")?.trim();

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (itemId) filter.price_list_item_id = itemId;
      if (txType) filter.type = txType;
      if (refType) filter.reference_type = refType;

      const rows = await StockTransactionModel.find(filter)
        .sort({ created_at: -1 })
        .limit(200)
        .lean();

      // Enrich with product name
      const ids = [...new Set(rows.map((r) => r.price_list_item_id))];
      const products = await PriceListItemModel.find({
        tenantId: actor.tenantId,
        _id: { $in: ids },
      })
        .select("name item_number unit")
        .lean();
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      const enriched = rows.map((r) => ({
        ...r,
        product: productMap.get(r.price_list_item_id) ?? null,
      }));

      return NextResponse.json(serializeForJson(enriched));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
