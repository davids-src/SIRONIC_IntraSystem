import { calculateOfferTotals } from "../src/offer-calculations";
import type { OfferLine } from "@crm/types";

describe("Offer Calculation Service", () => {
  it("should correctly calculate normal product items", () => {
    const lines: OfferLine[] = [
      {
        price_list_item_id: "prod-1",
        description: "IP Kamera 4MP",
        quantity: 2,
        unit: "db",
        net_unit_price: 35000,
        tax_rate: 27,
        purchase_unit_price_snapshot: 20000,
        purchase_price_source: "price_list",
        line_type: "product",
      },
    ];

    const result = calculateOfferTotals(lines);

    expect(result.net_total).toBe(70000);
    expect(result.product_revenue).toBe(70000);
    expect(result.tax_total).toBe(18900); // 70000 * 0.27
    expect(result.gross_total).toBe(88900);
    expect(result.direct_purchase_cost).toBe(40000); // 2 * 20000
    expect(result.calculated_margin).toBe(30000); // 70000 - 40000
    expect(result.margin_percent).toBeCloseTo(42.86, 1);
    expect(result.has_historical_snapshot).toBe(true);
  });

  it("should correctly handle labor line items and internal labor cost", () => {
    const lines: OfferLine[] = [
      {
        price_list_item_id: null,
        description: "Kamerarendszer telepítés és kábelezés",
        quantity: 10,
        unit: "óra",
        net_unit_price: 15000,
        tax_rate: 27,
        internal_cost_unit_price: 6000,
        line_type: "labor",
      },
    ];

    const result = calculateOfferTotals(lines);

    expect(result.net_total).toBe(150000);
    expect(result.labor_revenue).toBe(150000);
    expect(result.internal_labor_cost).toBe(60000); // 10 * 6000
    expect(result.direct_purchase_cost).toBe(0);
    expect(result.calculated_margin).toBe(90000); // 150000 - 60000
    expect(result.margin_percent).toBe(60);
  });

  it("should NOT double-count bundle child rows in document totals while tracking their direct cost", () => {
    const bundleGroupId = "bundle-grp-1";
    const lines: OfferLine[] = [
      // Parent bundle line
      {
        price_list_item_id: null,
        description: "4 Kamerás Alaprendszer Csomag",
        quantity: 1,
        unit: "csomag",
        net_unit_price: 250000,
        tax_rate: 27,
        is_group_parent: true,
        group_id: bundleGroupId,
        line_type: "product",
      },
      // Child row 1 (Camera x4)
      {
        price_list_item_id: "prod-cam",
        description: "4MP Dome Kamera",
        quantity: 4,
        unit: "db",
        net_unit_price: 30000,
        tax_rate: 27,
        is_group_parent: false,
        group_id: bundleGroupId,
        purchase_unit_price_snapshot: 18000,
        line_type: "product",
      },
      // Child row 2 (NVR Recorder x1)
      {
        price_list_item_id: "prod-nvr",
        description: "8 Csatornás NVR",
        quantity: 1,
        unit: "db",
        net_unit_price: 80000,
        tax_rate: 27,
        is_group_parent: false,
        group_id: bundleGroupId,
        purchase_unit_price_snapshot: 45000,
        line_type: "product",
      },
    ];

    const result = calculateOfferTotals(lines);

    // Document total must ONLY include the parent (250,000 Ft), not 250k + 4*30k + 80k
    expect(result.net_total).toBe(250000);
    expect(result.gross_total).toBe(317500);

    // Cost must accurately sum the child items: 4*18,000 + 1*45,000 = 72,000 + 45,000 = 117,000 Ft
    expect(result.direct_purchase_cost).toBe(117000);
    expect(result.calculated_margin).toBe(133000); // 250000 - 117000
    expect(result.margin_percent).toBeCloseTo(53.2, 1);
  });

  it("should correctly handle line discounts and global discount", () => {
    const lines: OfferLine[] = [
      {
        price_list_item_id: "prod-1",
        description: "Termék",
        quantity: 1,
        unit: "db",
        net_unit_price: 100000,
        tax_rate: 27,
        discount_percent: 10, // 10% line discount -> 90,000 Ft
        purchase_unit_price_snapshot: 50000,
        line_type: "product",
      },
    ];

    // 5% global discount on 90,000 Ft -> 85,500 Ft
    const result = calculateOfferTotals(lines, 5);

    expect(result.net_total).toBe(90000);
    expect(result.global_discount_percent).toBe(5);
    expect(result.global_discount_amount).toBe(4500);
    expect(result.discounted_net_total).toBe(85500);
    expect(result.direct_purchase_cost).toBe(50000);
    expect(result.calculated_margin).toBe(35500); // 85500 - 50000
    expect(result.margin_percent).toBeCloseTo(41.52, 1);
  });

  it("should safely handle zero values without NaN or division by zero errors", () => {
    const lines: OfferLine[] = [
      {
        price_list_item_id: null,
        description: "Díjmentes felmérés",
        quantity: 1,
        unit: "alkalom",
        net_unit_price: 0,
        tax_rate: 0,
        purchase_unit_price_snapshot: 0,
        line_type: "service",
      },
    ];

    const result = calculateOfferTotals(lines, 0);

    expect(result.net_total).toBe(0);
    expect(result.gross_total).toBe(0);
    expect(result.calculated_margin).toBe(0);
    expect(result.margin_percent).toBe(0);
    expect(isNaN(result.margin_percent)).toBe(false);
  });

  it("should handle empty lines array gracefully", () => {
    const result = calculateOfferTotals([]);

    expect(result.net_total).toBe(0);
    expect(result.gross_total).toBe(0);
    expect(result.calculated_margin).toBe(0);
    expect(result.margin_percent).toBe(0);
    expect(result.lines_breakdown).toEqual([]);
  });
});
