import mongoose, { Schema } from "mongoose";

/** Cuts Mongoose schema literal inference cost for tsc (avoids multi-GB heaps). */
export function defineSchema(
  definition: unknown,
  options?: mongoose.SchemaOptions,
): Schema {
  return new Schema(definition as any, options);
}

/**
 * Registers on the given mongoose connection, defaulting to the global default connection
 * (`mongoose.connection`) when none is passed — this is what every existing caller gets,
 * unchanged. Pass an explicit `connection` when a single process needs two independent
 * database connections at once (e.g. the CRM's own `crm` database on the default connection,
 * plus a second `mongoose.createConnection(...)` to `sironic_auth`) — reusing the default
 * connection for both would silently point one of them at the wrong database, since
 * `mongoose.connect()` on an already-connected default connection is a no-op that returns
 * whichever URI connected first.
 */
export function getModel(
  name: string,
  schema: Schema,
  connection: mongoose.Connection = mongoose.connection,
): mongoose.Model<any> {
  return (
    (connection.models[name] as mongoose.Model<any>) || connection.model(name, schema)
  );
}

/** Shared mongoose `created_at` / `updated_at` field config */
export const ts = { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } };
