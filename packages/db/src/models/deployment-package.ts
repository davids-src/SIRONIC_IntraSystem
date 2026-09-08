import { Schema } from "mongoose";
import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const deploymentPackageSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    price_huf: { type: Number, required: true, min: 0 },
    default_cycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      required: true,
      default: "monthly",
    },
    resources: {
      vcpu: { type: Number, default: null },
      ram_mb: { type: Number, default: null },
      disk_gb: { type: Number, default: null },
      bandwidth_gb: { type: Number, default: null },
      custom: { type: Schema.Types.Mixed, default: null },
    },
    is_active: { type: Boolean, required: true, default: true },
    sort_order: { type: Number, required: true, default: 0 },
  },
  ts,
);

deploymentPackageSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const DeploymentPackageModel = getModel(
  "DeploymentPackage",
  deploymentPackageSchema,
);
