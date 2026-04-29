import { z } from "zod";
import type { PriceListItem, PriceListItemType } from "@crm/types";

export function generateItemNumber(sequence: number): string {
  const paddedSequence = sequence.toString().padStart(6, "0");
  return `AR-${paddedSequence}`;
}

export const priceListItemSchema = z.object({
  _id: z.string().min(1),
  tenantId: z.string().min(1),
  item_number: z.string().regex(/^AR-\d{6}$/),
  type: z.enum(["service", "product", "labor", "package"]),
  name: z.string().min(1),
  description: z.string().nullable(),
  category: z.string().min(1),
  unit: z.string().min(1),
  net_price: z.number().nonnegative(),
  currency: z.string().min(1),
  tax_rate: z.number().nonnegative(),
  is_active: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type PriceListItemInput = z.infer<typeof priceListItemSchema>;

export function createPriceListItemDraft(input: {
  _id: string;
  tenantId: string;
  type: PriceListItemType;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  net_price: number;
  currency?: string;
  tax_rate?: number;
  is_active?: boolean;
  notes?: string | null;
  itemNumberSequence: number;
}): PriceListItem {
  const now = new Date();

  return {
    _id: input._id,
    tenantId: input.tenantId,
    item_number: generateItemNumber(input.itemNumberSequence),
    type: input.type,
    name: input.name,
    description: input.description,
    category: input.category,
    unit: input.unit,
    net_price: input.net_price,
    currency: input.currency ?? "HUF",
    tax_rate: input.tax_rate ?? 27,
    is_active: input.is_active ?? true,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
  };
}

export function validatePriceListItem(item: PriceListItem): PriceListItemInput {
  return priceListItemSchema.parse(item);
}
