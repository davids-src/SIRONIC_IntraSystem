import { z } from "zod";

// Kiszervezve egy külön (nem route.ts) fájlba, mert a Next.js App Router
// route fájlokból csak a HTTP method handlerek exportálását engedi meg –
// bármilyen más export (pl. egy zod séma) típushibát okoz a build típus-
// ellenőrzésekor.
export const priceSnapshotZodSchema = z.object({
  internal_base_price: z.number(),
  client_multiplier: z.number(),
  multiplier_key: z.string(),
  calculated_price: z.number(),
  urgency_multiplier: z.number().optional().default(1.0),
  pricing_settings_captured_at: z.string().nullable().optional(),
});

export const lineSchema = z.object({
  price_list_item_id: z.string().nullable().optional(),
  service_price_list_item_id: z.string().nullable().optional(),
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  net_unit_price: z.number().optional(),
  price_snapshot: priceSnapshotZodSchema.nullable().optional(),
});
