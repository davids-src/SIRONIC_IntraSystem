/** Shared types and helpers of the facade files. No permission checks anywhere in the facade. */
import { Types } from "mongoose";
import { IntegrationError } from "@erp/integrations";
import { OrchestratorHiba } from "./lepesek/tipusok";

export type DeploymentsResult<T extends object = object> =
  ({ ok: true; id?: string } & T) | { ok: false; message: string };

export const ok = <T extends object = object>(id?: string, extra?: T): DeploymentsResult<T> =>
  ({ ok: true, id, ...(extra ?? {}) }) as DeploymentsResult<T>;
export const hiba = (message: string): { ok: false; message: string } => ({
  ok: false,
  message,
});

export const validId = (id: string) => Types.ObjectId.isValid(id);
export const oid = (id: string) => new Types.ObjectId(id);

/** `YYYY-MM-DD` → UTC-midnight Date. */
export const nap = (s?: string): Date | undefined =>
  s ? new Date(`${s}T00:00:00.000Z`) : undefined;
export const napStr = (d?: Date | null): string | undefined =>
  d ? d.toISOString().slice(0, 10) : undefined;
export const iso = (d?: Date | null): string | undefined => (d ? d.toISOString() : undefined);

export const elsoHiba = (issues: Array<{ message: string }>) =>
  issues[0]?.message ?? "Érvénytelen adatok.";

/** User-facing text of an error thrown by the orchestrator or a provider client. */
export function hibaSzoveg(err: unknown): string {
  if (err instanceof IntegrationError) return err.safeMessage;
  if (err instanceof OrchestratorHiba) return err.message;
  return "A művelet nem sikerült.";
}

export const duplikalt = (err: unknown): boolean =>
  typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

/** `{ ...filter, $and: [...] }` helper (typed loosely: Mongo filters are dynamic here). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const es = (filter: Record<string, unknown>, extra: Record<string, unknown>): any => {
  const and = Array.isArray(filter.$and) ? (filter.$and as unknown[]) : [];
  return { ...filter, $and: [...and, extra] };
};
