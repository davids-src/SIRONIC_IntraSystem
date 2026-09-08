import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

/** Schema only for P1/P2 — no CRUD/cron routes yet; those land with billing (P4). */
const deploymentPaymentSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    deployment_id: { type: String, required: true, index: true },
    contact_id: { type: String, required: true, index: true },
    package_id: { type: String, default: null },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    amount_huf: { type: Number, required: true },
    currency: { type: String, required: true, default: "HUF" },
    cycle: { type: String, enum: ["monthly", "quarterly", "yearly"], required: true },
    status: {
      type: String,
      enum: ["due", "paid", "overdue", "waived", "cancelled"],
      required: true,
      default: "due",
    },
    paid_at: { type: Date, default: null },
    invoice_id: { type: String, default: null },
    notes: { type: String, default: null },
    created_by: { type: String, default: null },
  },
  ts,
);

deploymentPaymentSchema.index(
  { tenantId: 1, deployment_id: 1, period_start: 1 },
  { unique: true },
);
deploymentPaymentSchema.index({ tenantId: 1, status: 1, period_end: 1 });
deploymentPaymentSchema.index({ tenantId: 1, contact_id: 1, status: 1 });

export const DeploymentPaymentModel = getModel(
  "DeploymentPayment",
  deploymentPaymentSchema,
);
