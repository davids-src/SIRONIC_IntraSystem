import { z } from "zod";

// Kiszervezve egy külön (nem route.ts) fájlba, mert a Next.js App Router
// route fájlokból csak a HTTP method handlerek exportálását engedi meg –
// bármilyen más export (pl. egy zod séma vagy segédfüggvény) típushibát
// okoz a build típusellenőrzésekor.
export const priceSnapshotZodSchema = z.object({
  internal_base_price: z.number(),
  client_multiplier: z.number(),
  multiplier_key: z.string(),
  calculated_price: z.number(),
  urgency_multiplier: z.number().optional().default(1.0),
  pricing_settings_captured_at: z.string().nullable().optional(),
});

export const offerLineSchema = z.object({
  price_list_item_id: z.string().nullable().optional(),
  service_price_list_item_id: z.string().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  net_unit_price: z.number().min(0),
  tax_rate: z.number().min(0).max(100),
  discount_percent: z.number().min(0).max(100).optional().default(0),
  price_snapshot: priceSnapshotZodSchema.nullable().optional(),
  is_group_parent: z.boolean().optional(),
  group_id: z.string().nullable().optional(),
});

export function grossTotalFromLines(
  lines: {
    quantity: number;
    net_unit_price: number;
    tax_rate: number;
    discount_percent?: number;
    is_group_parent?: boolean;
    group_id?: string | null;
  }[],
): number {
  return lines.reduce((sum, l) => {
    // Csomag (bundle) gyerek sorok ára már benne van a szülő (is_group_parent) sor
    // net_unit_price-ában – kihagyjuk őket, hogy ne számoljuk kétszer.
    if (l.group_id && !l.is_group_parent) return sum;
    const discountedNet = l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
    return sum + l.quantity * discountedNet * (1 + l.tax_rate / 100);
  }, 0);
}
