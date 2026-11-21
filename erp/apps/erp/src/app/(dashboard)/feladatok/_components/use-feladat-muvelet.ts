"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Eredmeny = { success: boolean; message?: string };

/** Runs a task action: pending state, a toast either way, a refresh on success. */
export function useFeladatMuvelet() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const futtat = (fn: () => Promise<Eredmeny>, utana?: (ok: boolean) => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        if (r.message) toast.success(r.message);
        router.refresh();
      } else toast.error(r.message ?? "Nem sikerült.");
      utana?.(r.success);
    });
  return { pending, futtat };
}
