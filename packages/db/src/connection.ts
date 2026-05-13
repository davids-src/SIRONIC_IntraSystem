import mongoose from "mongoose";

export async function connectDb(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  return mongoose;
}
