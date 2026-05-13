import mongoose, { Schema } from "mongoose";

const counterSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true },
    value: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

counterSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export type CounterName =
  | "contact"
  | "price_list"
  | "project"
  | "ticket"
  | "worklog"
  | "completion_certificate"
  | "contract"
  | "offer"
  | "invoice";

const CounterModel =
  (mongoose.models.Counter as mongoose.Model<{
    tenantId: string;
    name: string;
    value: number;
  }>) || mongoose.model("Counter", counterSchema, "counters");

export async function nextCounterValue(
  tenantId: string,
  name: CounterName,
): Promise<number> {
  const doc = await CounterModel.findOneAndUpdate(
    { tenantId, name },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return doc?.value ?? 1;
}

export function formatNumber(prefix: string, value: number, width = 6): string {
  return `${prefix}-${String(value).padStart(width, "0")}`;
}
