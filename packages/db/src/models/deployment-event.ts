import { Schema } from "mongoose";
import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";

/** Append-only audit log — no updates/deletes from app code, so only `created_at` is tracked. */
const deploymentEventSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    deployment_id: { type: String, required: true, index: true },
    step_key: {
      type: String,
      enum: [
        "cloudflare_zone",
        "ns_delegation",
        "dns_records",
        "ssl_certificate",
        "proxy_host",
        "image_build",
        "stack_create",
        "stack_deploy",
      ],
      default: null,
    },
    kind: {
      type: String,
      enum: [
        "step_plan",
        "step_execute_start",
        "step_execute_ok",
        "step_execute_fail",
        "step_adopt",
        "step_skip",
        "step_verify",
        "redeploy",
        "billing",
        "import",
        "note",
      ],
      required: true,
    },
    actor_id: { type: String, default: null },
    actor_type: {
      type: String,
      enum: ["crm_user", "portal_user", "system", "webhook"],
      required: true,
    },
    message: { type: String, required: true },
    detail: { type: Schema.Types.Mixed, default: null },
    duration_ms: { type: Number, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

deploymentEventSchema.index({ tenantId: 1, deployment_id: 1, created_at: -1 });

export const DeploymentEventModel = getModel("DeploymentEvent", deploymentEventSchema);
