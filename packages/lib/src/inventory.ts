import { z } from "zod";
import type { Product, ProductCategoryRef, ProductMetadata } from "@crm/types";

const productMetadataSchema = z.object({
  net_price: z.number().nonnegative(),
  seller: z.string().min(1),
  part_number: z.string().min(1),
  updated_at: z.date(),
});

export const productSchema = z.object({
  sku: z.string().regex(/^[A-Z0-9]+-\d{6}$/),
  category: z.object({
    _id: z.string().min(1),
    name: z.string().min(1),
    skuPrefix: z.string().regex(/^[A-Z0-9]+$/),
  }),
  part_number: z.string().min(1),
  net_price: z.number().nonnegative(),
  image: z.string().url().optional(),
  metadata: productMetadataSchema,
  metadata_history: z.array(productMetadataSchema),
  created_at: z.date(),
  updated_at: z.date(),
});

export type ProductInput = z.infer<typeof productSchema>;

export function generateSku(category: ProductCategoryRef, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(6, "0");
  return `${category.skuPrefix}-${paddedSequence}`;
}

export function createProductDraft(input: {
  category: ProductCategoryRef;
  part_number: string;
  net_price: number;
  metadata: Omit<ProductMetadata, "updated_at">;
  image?: string;
  skuSequence: number;
}): Product {
  const now = new Date();
  const metadataEntry: ProductMetadata = {
    ...input.metadata,
    updated_at: now,
  };

  return {
    sku: generateSku(input.category, input.skuSequence),
    category: input.category,
    part_number: input.part_number,
    net_price: input.net_price,
    image: input.image,
    metadata: metadataEntry,
    metadata_history: [metadataEntry],
    created_at: now,
    updated_at: now,
  };
}

export function validateProduct(product: Product): ProductInput {
  return productSchema.parse(product);
}
