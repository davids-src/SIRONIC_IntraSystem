import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const serviceCategorySchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    icon: { type: String, required: true, default: "Tag" },
    sku_prefix: { type: String, required: true },
    color: { type: String, required: true, default: "#6366f1" },
    sort_order: { type: Number, required: true, default: 0 },
    is_active: { type: Boolean, required: true, default: true },
    description: { type: String, default: null },
  },
  ts,
);

serviceCategorySchema.index({ tenantId: 1, sku_prefix: 1 }, { unique: true });

export const ServiceCategoryModel = getModel("ServiceCategory", serviceCategorySchema);
