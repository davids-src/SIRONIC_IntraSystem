import mongoose from "mongoose";

/**
 * Deliberately its own env var (not `MONGODB_URI`) — the platform-identity database
 * (`sironic_auth`) is a separate trust boundary from the CRM/portal `crm` database, even
 * when both happen to live on the same MongoDB server.
 */
export async function connectAuthDb(): Promise<typeof mongoose> {
  const uri = process.env.AUTH_MONGODB_URI;
  if (!uri) {
    throw new Error("AUTH_MONGODB_URI is not set");
  }
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  return mongoose;
}
