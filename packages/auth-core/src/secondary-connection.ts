import mongoose, { type Connection } from "mongoose";

/**
 * For a process that already has its own primary default connection (CRM's `connectDb()`
 * to `crm`, via `mongoose.connect()`) and also needs the auth DB. Reusing the default
 * connection for both is NOT safe here: `mongoose.connect()` on an already-open default
 * connection is a no-op, so whichever of `connectDb()` / `connectAuthDb()` runs first wins
 * and the other silently operates against the wrong database. A dedicated
 * `mongoose.createConnection()` sidesteps that entirely — apps/auth itself doesn't need
 * this, since it only ever talks to one database.
 *
 * Cached on `globalThis`, not a plain module-level variable: Next.js bundles this package
 * (it's in `transpilePackages`, unlike `mongoose`/`mongodb` which are externalized) into
 * each API route's own module graph separately, so a module-level cache here would silently
 * get re-initialized to null per route. `globalThis` is the one thing actually shared
 * across those separate module instances within the same Node process.
 *
 * The cache holds the in-flight *promise*, not the resolved connection, and it's assigned
 * synchronously before any `await` — several requests racing in on a cold server all see
 * the same promise (there's no gap between the `if` check and the assignment for a second
 * caller to land in), instead of each independently calling `createConnection` and leaking
 * every connection but whichever got cached last. On rejection the cache is cleared so a
 * later call can retry rather than replaying the same failure forever.
 */
declare global {
  // eslint-disable-next-line no-var
  var __sironicSecondaryAuthConnection: Promise<Connection> | undefined;
}

export function connectSecondaryAuthDb(): Promise<Connection> {
  if (!globalThis.__sironicSecondaryAuthConnection) {
    const uri = process.env.AUTH_MONGODB_URI;
    if (!uri) {
      return Promise.reject(new Error("AUTH_MONGODB_URI is not set"));
    }
    const connection = mongoose.createConnection(uri);
    globalThis.__sironicSecondaryAuthConnection = connection.asPromise().catch((e) => {
      globalThis.__sironicSecondaryAuthConnection = undefined;
      throw e;
    });
  }
  return globalThis.__sironicSecondaryAuthConnection;
}
