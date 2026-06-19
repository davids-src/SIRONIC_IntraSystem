import { defineSchema } from "./schema-def";
import { getModel } from "./get-model";
import { ts } from "./timestamps";

const weeklyPlanSchema = defineSchema(
  {
    tenantId: { type: String, required: true, index: true },
    assignee_id: { type: String, required: true, index: true },
    week_number: { type: Number, required: true },
    year: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ["todo", "in_progress", "done", "blocked"],
      required: true,
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      required: true,
      default: "medium",
    },
    ticket_id: { type: String, default: null, index: true },
    project_id: { type: String, default: null, index: true },
    worklog_id: { type: String, default: null, index: true },
    due_date: { type: Date, default: null },
    is_archived: { type: Boolean, default: false, index: true },
    archived_at: { type: Date, default: null },
    archive_reason: { type: String, default: null },
    created_by: { type: String, required: true },
  },
  ts,
);

// Compound index to quickly find weekly plans for a specific assignee, year, and week
weeklyPlanSchema.index({ assignee_id: 1, year: 1, week_number: 1 });

export const WeeklyPlanModel = getModel("WeeklyPlan", weeklyPlanSchema);
