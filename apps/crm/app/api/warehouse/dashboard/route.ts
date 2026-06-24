import { NextResponse } from "next/server";
import {
  StockItemModel,
  StockTransactionModel,
  PriceListItemModel,
  RmaCaseModel,
  WarehouseLocationModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

/**
 * GET /api/warehouse/dashboard
 * Raktár dashboard statisztikák lekérése.
 */
export async function GET(_req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });

    return await withDb(async () => {
      // 1. Fetch all stock items and locations
      const [stockItemsRaw, locationsRaw, activeRmaCount] = await Promise.all([
        StockItemModel.find({ tenantId: actor.tenantId }).lean(),
        WarehouseLocationModel.find({ tenantId: actor.tenantId }).lean(),
        RmaCaseModel.countDocuments({
          tenantId: actor.tenantId,
          status: { $in: ["received", "sent_to_supplier"] },
        }),
      ]);

      const stockItems = stockItemsRaw as any[];
      const locations = locationsRaw as any[];

      const priceListIds = stockItems.map((s) => s.price_list_item_id);
      const products = await PriceListItemModel.find({
        tenantId: actor.tenantId,
        _id: { $in: priceListIds },
      }).lean();
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      // 2. Calculate valuations and enrich items
      let totalValuation = 0;
      const enrichedStock = stockItems.map((s) => {
        const prod = productMap.get(s.price_list_item_id) ?? null;
        const purchasePrice = prod?.last_purchase_price ?? 0;
        const value = s.quantity_in_stock * purchasePrice;
        totalValuation += value;
        return {
          ...s,
          product: prod,
          valuation: value,
        };
      });

      // 3. Location distribution
      const locationMap = new Map(locations.map((l) => [l.code, l]));
      const distributionObj: Record<
        string,
        { name: string; type: string; count: number; value: number }
      > = {};

      // Initialize with all locations
      for (const loc of locations) {
        distributionObj[loc.code] = {
          name: loc.name,
          type: loc.type || "shelf",
          count: 0,
          value: 0,
        };
      }
      // Add a fallback for unassigned items
      distributionObj["__unassigned__"] = {
        name: "Nincs tárhelyhez rendelve",
        type: "shelf",
        count: 0,
        value: 0,
      };

      for (const item of enrichedStock) {
        const locCode = item.warehouse_location || "__unassigned__";
        if (!distributionObj[locCode]) {
          distributionObj[locCode] = {
            name: locCode,
            type: "shelf",
            count: 0,
            value: 0,
          };
        }
        distributionObj[locCode].count += item.quantity_in_stock;
        distributionObj[locCode].value += item.valuation;
      }

      // Convert to array and filter out locations with 0 stock/value if they are "__unassigned__"
      const distribution = Object.entries(distributionObj)
        .map(([code, data]) => ({ code, ...data }))
        .filter((d) => d.code !== "__unassigned__" || d.count > 0);

      // 4. Critical Stock (below threshold)
      const criticalStock = enrichedStock
        .filter(
          (s) =>
            s.low_stock_threshold !== null &&
            s.quantity_in_stock <= s.low_stock_threshold,
        )
        .slice(0, 10);

      // 5. Dead Stock (positive stock, no transactions in 90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const activeProductIds = await StockTransactionModel.distinct(
        "price_list_item_id",
        {
          tenantId: actor.tenantId,
          created_at: { $gte: cutoffDate },
        },
      );

      const deadStock = enrichedStock
        .filter(
          (s) =>
            s.quantity_in_stock > 0 && !activeProductIds.includes(s.price_list_item_id),
        )
        .slice(0, 10);

      // 6. Recent 5 Transactions
      const recentTransactions = await StockTransactionModel.find({
        tenantId: actor.tenantId,
      })
        .sort({ created_at: -1 })
        .limit(5)
        .lean();

      const txProductIds = recentTransactions.map((t) => t.price_list_item_id);
      const txProducts = await PriceListItemModel.find({
        tenantId: actor.tenantId,
        _id: { $in: txProductIds },
      }).lean();
      const txProductMap = new Map(txProducts.map((p) => [String(p._id), p]));

      const enrichedTransactions = recentTransactions.map((t) => ({
        ...t,
        product: txProductMap.get(t.price_list_item_id) ?? null,
      }));

      return NextResponse.json(
        serializeForJson({
          kpis: {
            totalValuation,
            lowStockCount: criticalStock.length,
            activeRmaCount,
            totalLocations: locations.length,
          },
          distribution,
          criticalStock,
          deadStock,
          recentTransactions: enrichedTransactions,
        }),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}
