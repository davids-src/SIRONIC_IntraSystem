import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";
import mongoose from "mongoose";

const toolSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    brand: { type: String },
    model_number: { type: String },
    serial_number: { type: String, index: true },
    status: {
      type: String,
      enum: ["in_warehouse", "checked_out", "maintenance", "lost", "retired"],
      default: "in_warehouse",
    },
    assigned_to: { type: String },
    condition: {
      type: String,
      enum: ["new", "good", "fair", "poor"],
      default: "good",
    },
    notes: { type: String },
  },
  ts,
);

export const ToolModel = getModel("Tool", toolSchema);

const toolTransactionSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    tool_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tool", required: true },
    actor_id: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "check_out",
        "check_in",
        "maintenance_start",
        "maintenance_end",
        "mark_lost",
        "retire",
      ],
      required: true,
    },
    target_user_id: { type: String },
    notes: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

export const ToolTransactionModel = getModel("ToolTransaction", toolTransactionSchema);
