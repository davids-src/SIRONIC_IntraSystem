import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const documentRecordSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    document_type: { type: String, required: true, index: true },
    file_url: { type: String, required: true },
    file_size: { type: Number, default: null },
    mime_type: { type: String, default: null },
    entity_type: {
      type: String,
      enum: ["partner", "project", "offer", "contract", "other"],
      default: "other",
      index: true,
    },
    entity_id: { type: String, default: null, index: true },
    created_by: { type: String, required: true },
  },
  ts,
);

export const DocumentRecordModel = getModel("DocumentRecord", documentRecordSchema);
