import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const serviceSubCategorySchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    category_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    sort_order: { type: Number, required: true, default: 0 },
    is_active: { type: Boolean, required: true, default: true },
  },
  ts,
);

serviceSubCategorySchema.index({ tenantId: 1, category_id: 1 });

export const ServiceSubCategoryModel = getModel(
  "ServiceSubCategory",
  serviceSubCategorySchema,
);
