import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const projectExpenseSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    project_id: { type: String, required: true, index: true },
    worklog_id: { type: String, default: null },
    expense_type: {
      type: String,
      enum: ["fuel", "parking", "toll", "accommodation", "material", "other"],
      required: true,
    },
    description: { type: String },
    amount: { type: Number, required: true }, // nettó összeg
    currency: { type: String, default: "HUF" },
    receipt_image_url: { type: String, default: null }, // feltöltött számla/bizonylat URL
    recorded_by: { type: String, required: true }, // actor.actorId
    date: { type: Date, required: true },
  },
  ts,
);

export const ProjectExpenseModel = getModel("ProjectExpense", projectExpenseSchema);
