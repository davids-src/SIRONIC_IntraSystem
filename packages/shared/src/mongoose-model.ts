import mongoose, { Schema } from "mongoose";

/** Cuts Mongoose schema literal inference cost for tsc (avoids multi-GB heaps). */
export function defineSchema(
  definition: unknown,
  options?: mongoose.SchemaOptions,
): Schema {
  return new Schema(definition as any, options);
}

/**
 * Registers on whichever mongoose connection the consuming app establishes — safe to reuse
 * across packages that target different databases (e.g. `@crm/db`'s `crm` vs
 * `@crm/auth-core`'s `sironic_auth`), since each app process has its own connection.
 */
export function getModel(name: string, schema: Schema): mongoose.Model<any> {
  return (mongoose.models[name] as mongoose.Model<any>) || mongoose.model(name, schema);
}

/** Shared mongoose `created_at` / `updated_at` field config */
export const ts = { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } };
