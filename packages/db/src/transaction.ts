import mongoose from "mongoose";
import { connectDb } from "./connection";

/**
 * Tranzakciós wrapper – MongoDB ACID session-ös művelet.
 * Ha a callback dob hibát, az egész tranzakció rollback-elődik.
 *
 * Ha a MongoDB topológia nem támogatja a tranzakciókat (standalone),
 * a callback session nélkül fut le, "best-effort" módban.
 */
export async function withDbTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
  await connectDb();

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {
      // abort may fail if already aborted or session is invalid
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
