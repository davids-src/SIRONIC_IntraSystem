import mongoose, { Schema } from "mongoose";

/** Cuts Mongoose schema literal inference cost for tsc (avoids multi-GB heaps). */
export function defineSchema(
  definition: unknown,
  options?: mongoose.SchemaOptions,
): Schema {
  return new Schema(definition as any, options);
}
