/**
 * Side-effect module: must be the FIRST import of an entry point. `@erp/db-core` reads
 * MONGODB_URI / MONGODB_DB_NAME when it is loaded, so the env file has to be applied before it.
 */
import { betoltEnv } from "./env";

const i = process.argv.findIndex(
  (a) => a === "--env-file" || a.startsWith("--env-file="),
);
const explicit =
  i < 0
    ? undefined
    : process.argv[i]!.includes("=")
      ? process.argv[i]!.split("=")[1]
      : process.argv[i + 1];
betoltEnv(explicit);
