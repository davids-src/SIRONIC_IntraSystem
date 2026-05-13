import mongoose, { type Schema } from "mongoose";

/**
 * Large schemas use `defineSchema()` so tsc stays fast; `Model<any>` keeps `.lean()`
 * shapes usable in routes without Mongoose's heavy document generics.
 */
export function getModel(name: string, schema: Schema): mongoose.Model<any> {
  return (mongoose.models[name] as mongoose.Model<any>) || mongoose.model(name, schema);
}
