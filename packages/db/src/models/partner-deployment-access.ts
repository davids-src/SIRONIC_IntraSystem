import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

/** Schema only for P1/P2 — no enforcement routes yet; reserved for the Partner Portal (P3). */
const partnerDeploymentAccessSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true, index: true },
    portal_user_id: { type: String, required: true, index: true },
    deployment_id: { type: String, required: true, index: true },
    access_level: {
      type: String,
      enum: ["view", "manage"],
      required: true,
      default: "view",
    },
    created_by: { type: String, default: null },
  },
  ts,
);

partnerDeploymentAccessSchema.index(
  { tenantId: 1, portal_user_id: 1, deployment_id: 1 },
  { unique: true },
);
partnerDeploymentAccessSchema.index({ tenantId: 1, contact_id: 1, deployment_id: 1 });

export const PartnerDeploymentAccessModel = getModel(
  "PartnerDeploymentAccess",
  partnerDeploymentAccessSchema,
);
