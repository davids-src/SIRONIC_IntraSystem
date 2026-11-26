/** Shared types and helpers of the facade files. No permission checks anywhere in the facade. */
import { Types } from "mongoose";
import { IntegrationError } from "@erp/integrations";

export type InfraResult<T extends object = object> =
  ({ ok: true; id?: string } & T) | { ok: false; message: string };

export const ok = <T extends object = object>(id?: string, extra?: T): InfraResult<T> =>
  ({ ok: true, id, ...(extra ?? {}) }) as InfraResult<T>;
export const hiba = (message: string): { ok: false; message: string } => ({
  ok: false,
  message,
});

/** A user-presentable error raised by the facade (validation, missing integration, …). */
export class InfraHiba extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InfraHiba";
  }
}

export const validId = (id: string) => Types.ObjectId.isValid(id);
export const oid = (id: string) => new Types.ObjectId(id);
export const iso = (d?: Date | null): string | undefined =>
  d ? d.toISOString() : undefined;

export const elsoHiba = (issues: Array<{ message: string }>) =>
  issues[0]?.message ?? "Érvénytelen adatok.";

/** User-facing text of an error thrown by the facade or a provider client. */
export function hibaSzoveg(err: unknown): string {
  if (err instanceof IntegrationError) return err.safeMessage;
  if (err instanceof InfraHiba) return err.message;
  // Unexpected: keep the user text generic (no internals/secrets) but leave a server-side trace.
  console.error("[infra] váratlan hiba:", err);
  return "A művelet nem sikerült.";
}

export const duplikalt = (err: unknown): boolean =>
  typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

/** Who performed an action: a user id, or `cli:<name>` / `mcp:<name>` for agents. */
export type Szereplo = string;
