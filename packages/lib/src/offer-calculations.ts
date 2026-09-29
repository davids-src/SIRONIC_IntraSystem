import type { OfferLine } from "@crm/types";

export interface OfferLineFinancials {
  line: OfferLine;
  is_billable: boolean; // false for bundle children
  line_net_base: number;
  line_discount_amount: number;
  line_net_after_discount: number;
  line_tax_amount: number;
  line_gross_total: number;
  // Cost breakdown
  unit_cost: number;
  line_cost: number;
  cost_source: string;
  line_margin: number;
  line_margin_percent: number;
  has_cost_snapshot: boolean;
}

export interface OfferCalculationResult {
  // Document totals (customer-facing & official)
  lines_breakdown: OfferLineFinancials[];
  net_total: number;
  global_discount_percent: number;
  global_discount_amount: number;
  discounted_net_total: number;
  tax_total: number;
  gross_total: number;
  tax_breakdown: Array<{ tax_rate: number; net: number; tax: number; gross: number }>;

  // Revenue breakdown by type
  product_revenue: number;
  service_revenue: number;
  labor_revenue: number;
  other_revenue: number;

  // Internal cost & margin summary (internal ERP only)
  direct_purchase_cost: number;
  internal_labor_cost: number;
  other_internal_cost: number;
  total_internal_cost: number;
  calculated_margin: number;
  margin_percent: number;
  has_historical_snapshot: boolean;
}

/**
 * Calculates canonical offer totals and internal profit / margin breakdown.
 * Ensures that bundle child lines are NOT double-counted in document totals,
 * while accurately capturing all component direct costs.
 */
export function calculateOfferTotals(
  lines: OfferLine[] = [],
  globalDiscountPercent: number = 0,
): OfferCalculationResult {
  const safeLines = Array.isArray(lines) ? lines : [];
  const taxMap = new Map<number, { net: number; tax: number; gross: number }>();

  let netTotal = 0;
  let productRevenue = 0;
  let serviceRevenue = 0;
  let laborRevenue = 0;
  let otherRevenue = 0;

  let directPurchaseCost = 0;
  let internalLaborCost = 0;
  let otherInternalCost = 0;

  let hasAnyCostSnapshot = false;
  let hasLinesWithoutCost = false;

  const linesBreakdown: OfferLineFinancials[] = safeLines.map((line) => {
    const qty = Number(line.quantity) || 0;
    const netUnitPrice = Number(line.net_unit_price) || 0;
    const taxRate = Number(line.tax_rate) || 0;
    const lineDiscountPct = Math.max(
      0,
      Math.min(100, Number(line.discount_percent) || 0),
    );

    // A child row inside a bundle is already billed via the bundle parent
    const isChildInBundle = Boolean(line.group_id && !line.is_group_parent);
    const isBillable = !isChildInBundle;

    const lineNetBase = qty * netUnitPrice;
    const lineDiscountAmount = lineNetBase * (lineDiscountPct / 100);
    const lineNetAfterDiscount = lineNetBase - lineDiscountAmount;
    const lineTaxAmount = lineNetAfterDiscount * (taxRate / 100);
    const lineGrossTotal = lineNetAfterDiscount + lineTaxAmount;

    if (isBillable) {
      netTotal += lineNetAfterDiscount;

      // Group revenue by line type
      const type =
        line.line_type || (line.service_price_list_item_id ? "service" : "product");
      if (type === "product") productRevenue += lineNetAfterDiscount;
      else if (type === "service") serviceRevenue += lineNetAfterDiscount;
      else if (type === "labor") laborRevenue += lineNetAfterDiscount;
      else otherRevenue += lineNetAfterDiscount;

      // Accumulate tax breakdown
      const existingTax = taxMap.get(taxRate) || { net: 0, tax: 0, gross: 0 };
      existingTax.net += lineNetAfterDiscount;
      existingTax.tax += lineTaxAmount;
      existingTax.gross += lineGrossTotal;
      taxMap.set(taxRate, existingTax);
    }

    // Cost calculations
    let unitCost = 0;
    let costSource = "none";
    let hasSnapshot = false;

    if (
      line.purchase_unit_price_snapshot !== undefined &&
      line.purchase_unit_price_snapshot !== null
    ) {
      unitCost = Number(line.purchase_unit_price_snapshot) || 0;
      costSource = line.purchase_price_source || "snapshot";
      hasSnapshot = true;
      hasAnyCostSnapshot = true;
    } else if (
      line.internal_cost_unit_price !== undefined &&
      line.internal_cost_unit_price !== null
    ) {
      unitCost = Number(line.internal_cost_unit_price) || 0;
      costSource = "internal_cost";
      hasSnapshot = true;
      hasAnyCostSnapshot = true;
    } else if (
      line.price_snapshot?.internal_base_price !== undefined &&
      line.price_snapshot?.internal_base_price !== null
    ) {
      unitCost = Number(line.price_snapshot.internal_base_price) || 0;
      costSource = "price_snapshot";
      hasSnapshot = true;
      hasAnyCostSnapshot = true;
    } else {
      hasLinesWithoutCost = true;
    }

    const lineCost = qty * unitCost;
    const type =
      line.line_type || (line.service_price_list_item_id ? "service" : "product");

    if (type === "labor") {
      internalLaborCost += lineCost;
    } else if (type === "product") {
      directPurchaseCost += lineCost;
    } else if (type === "service") {
      directPurchaseCost += lineCost;
    } else {
      otherInternalCost += lineCost;
    }

    const lineMargin = lineNetAfterDiscount - lineCost;
    const lineMarginPercent =
      lineNetAfterDiscount > 0 ? (lineMargin / lineNetAfterDiscount) * 100 : 0;

    return {
      line,
      is_billable: isBillable,
      line_net_base: lineNetBase,
      line_discount_amount: lineDiscountAmount,
      line_net_after_discount: lineNetAfterDiscount,
      line_tax_amount: lineTaxAmount,
      line_gross_total: lineGrossTotal,
      unit_cost: unitCost,
      line_cost: lineCost,
      cost_source: costSource,
      line_margin: lineMargin,
      line_margin_percent: lineMarginPercent,
      has_cost_snapshot: hasSnapshot,
    };
  });

  const safeGlobalDiscount = Math.max(
    0,
    Math.min(100, Number(globalDiscountPercent) || 0),
  );
  const globalDiscountAmount = netTotal * (safeGlobalDiscount / 100);
  const discountedNetTotal = netTotal - globalDiscountAmount;

  // Recalculate tax with global discount ratio if applicable
  const discountMultiplier = netTotal > 0 ? discountedNetTotal / netTotal : 1;
  let taxTotal = 0;

  const taxBreakdown = Array.from(taxMap.entries()).map(([tax_rate, values]) => {
    const discountedNet = values.net * discountMultiplier;
    const tax = discountedNet * (tax_rate / 100);
    const gross = discountedNet + tax;
    taxTotal += tax;
    return {
      tax_rate,
      net: Math.round(discountedNet),
      tax: Math.round(tax),
      gross: Math.round(gross),
    };
  });

  const grossTotal = discountedNetTotal + taxTotal;
  const totalInternalCost = directPurchaseCost + internalLaborCost + otherInternalCost;
  const calculatedMargin = discountedNetTotal - totalInternalCost;
  const marginPercent =
    discountedNetTotal > 0 ? (calculatedMargin / discountedNetTotal) * 100 : 0;

  return {
    lines_breakdown: linesBreakdown,
    net_total: Math.round(netTotal),
    global_discount_percent: safeGlobalDiscount,
    global_discount_amount: Math.round(globalDiscountAmount),
    discounted_net_total: Math.round(discountedNetTotal),
    tax_total: Math.round(taxTotal),
    gross_total: Math.round(grossTotal),
    tax_breakdown: taxBreakdown,

    product_revenue: Math.round(productRevenue),
    service_revenue: Math.round(serviceRevenue),
    labor_revenue: Math.round(laborRevenue),
    other_revenue: Math.round(otherRevenue),

    direct_purchase_cost: Math.round(directPurchaseCost),
    internal_labor_cost: Math.round(internalLaborCost),
    other_internal_cost: Math.round(otherInternalCost),
    total_internal_cost: Math.round(totalInternalCost),
    calculated_margin: Math.round(calculatedMargin),
    margin_percent: Number(marginPercent.toFixed(2)),
    has_historical_snapshot: hasAnyCostSnapshot || safeLines.length === 0,
  };
}
