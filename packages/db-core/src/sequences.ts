import { connectDB } from "./connection";
import { Counter } from "./models/Counter";

/**
 * Atomically increments the named counter and returns the new value, zero-padded.
 * Callers own their own namespace (e.g. `'termeles:job'`, `'gazdasag:szamla'`) — this
 * function never inspects or assumes anything about the key.
 */
export async function nextSequence(key: string, padLength: number): Promise<string> {
  await connectDB();
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  ).exec();
  return String(doc.seq).padStart(padLength, "0");
}
