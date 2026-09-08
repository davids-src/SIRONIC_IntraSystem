import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const stackTemplateSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    is_default: { type: Boolean, required: true, default: false },
    compose_yaml: { type: String, required: true },
    placeholders: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        required: { type: Boolean, required: true, default: false },
        default_value: { type: String, default: null },
        secret: { type: Boolean, required: true, default: false },
      },
    ],
    required_networks: { type: [String], default: ["nginxproxy_default"] },
    created_by: { type: String, required: true },
  },
  ts,
);

export const StackTemplateModel = getModel("StackTemplate", stackTemplateSchema);
