import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

/**
 * Raktárhelyek – fizikai tárolóhelyek (pl. "A-12", "Polc 3")
 */
const warehouseLocationSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
  },
  ts,
);

warehouseLocationSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const WarehouseLocationModel = getModel(
  "WarehouseLocation",
  warehouseLocationSchema,
);
