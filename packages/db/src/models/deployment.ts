import { Schema } from "mongoose";
import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const deploymentStepSchema = {
  key: {
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
    required: true,
  },
  status: {
    type: String,
    enum: [
      "pending",
      "running",
      "done",
      "failed",
      "skipped",
      "adopted",
      "manual_required",
    ],
    required: true,
    default: "pending",
  },
  external_id: { type: String, default: null },
  message: { type: String, default: null },
  last_error: { type: String, default: null },
  started_at: { type: Date, default: null },
  finished_at: { type: Date, default: null },
  meta: { type: Schema.Types.Mixed, default: null },
};

const deploymentSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    contact_id: { type: String, required: true, index: true },
    deployment_number: { type: String, required: true },
    name: { type: String, required: true },
    domain: { type: String, required: true, lowercase: true },
    www_redirect: { type: Boolean, required: true, default: true },
    status: {
      type: String,
      enum: ["draft", "provisioning", "live", "degraded", "suspended", "archived"],
      required: true,
      default: "draft",
    },
    notes: { type: String, default: null },

    dns: {
      record_type: { type: String, enum: ["A", "CNAME"], default: "A" },
      target: { type: String, default: null },
      proxied: { type: Boolean, default: false },
    },
    proxy: {
      forward_host: { type: String, default: null },
      forward_port: { type: Number, default: null },
      forward_scheme: { type: String, enum: ["http", "https"], default: "http" },
      websocket_support: { type: Boolean, default: true },
    },
    image: {
      repository: { type: String, default: null },
      tag: { type: String, default: null },
      workflow_id: { type: String, default: null },
      workflow_ref: { type: String, default: "main" },
    },
    stack: {
      stack_name: { type: String, default: null },
      template_id: { type: String, default: null },
      env: [
        {
          name: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
    },

    package_id: { type: String, default: null },
    billing_cycle: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: null,
    },
    price_override_huf: { type: Number, default: null },
    next_billing_at: { type: Date, default: null },
    last_paid_at: { type: Date, default: null },
    billing_notes: { type: String, default: null },

    steps: { type: [deploymentStepSchema], default: [] },

    external_ids: {
      cloudflare_zone_id: { type: String, default: null },
      cloudflare_dns_record_ids: { type: [String], default: [] },
      npm_certificate_id: { type: Number, default: null },
      npm_proxy_host_id: { type: Number, default: null },
      portainer_stack_id: { type: Number, default: null },
      portainer_endpoint_id: { type: Number, default: null },
      portainer_webhook_id: { type: String, default: null },
      github_last_run_id: { type: Number, default: null },
      image_digest: { type: String, default: null },
    },

    source: {
      type: String,
      enum: ["created", "imported"],
      required: true,
      default: "created",
    },
    migrated_from_domain_hosting_id: { type: String, default: null },

    created_by: { type: String, required: true },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
  },
  ts,
);

deploymentSchema.index({ tenantId: 1, deployment_number: 1 }, { unique: true });
deploymentSchema.index({ tenantId: 1, domain: 1 }, { unique: true });
deploymentSchema.index({ tenantId: 1, contact_id: 1, status: 1 });
deploymentSchema.index({ tenantId: 1, "external_ids.cloudflare_zone_id": 1 });
deploymentSchema.index({ tenantId: 1, "external_ids.portainer_stack_id": 1 });
deploymentSchema.index({ tenantId: 1, next_billing_at: 1 });

export const DeploymentModel = getModel("Deployment", deploymentSchema);
