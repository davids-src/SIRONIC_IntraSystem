"use client";

import { toast } from "sonner";
import type { MuveletState } from "../actions";

/** Runs a Server Action result through the toast; returns whether it succeeded. */
export function toastResult(r: MuveletState): boolean {
  if (r.success) toast.success(r.message);
  else toast.error(r.message ?? "A művelet nem sikerült.");
  return r.success;
}

export const SELECT_CLASS =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";

export const FT = new Intl.NumberFormat("hu-HU");
export const ft = (n: number) => `${FT.format(Math.round(n))} Ft`;
export const datum = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });
