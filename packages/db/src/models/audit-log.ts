import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";

const auditLogSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    user_name: { type: String, required: true },
    action: { type: String, required: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    summary: { type: String, required: true },
    changes: { type: Object, default: null },
  },
  { timestamps: false },
);

export const AuditLogModel = getModel("AuditLog", auditLogSchema);
