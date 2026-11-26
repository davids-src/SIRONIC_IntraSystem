"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@erp/ui";
import { FELADAT_SZOVEG_MAX } from "@erp/feladat/client";

type Eredmeny = { success: boolean; message?: string };

/**
 * A button that asks first — for the destructive task actions (withdraw one member, withdraw
 * the whole group). With `okMezo` the dialog takes an optional reason that goes with the action.
 */
export function MegerositoGomb({
  cimke,
  ikon,
  cim,
  leiras,
  megerosites,
  okMezo = false,
  variant = "outline",
  size = "sm",
  onConfirm,
}: {
  cimke: string;
  ikon?: ReactNode;
  cim: string;
  leiras: string;
  megerosites: string;
  okMezo?: boolean;
  variant?: "outline" | "ghost" | "destructive";
  size?: "sm" | "icon";
  onConfirm: (indok?: string) => Promise<Eredmeny>;
}) {
  const router = useRouter();
  const [nyitva, setNyitva] = useState(false);
  const [indok, setIndok] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          setNyitva(true);
        }}
        className={variant === "destructive" ? undefined : "text-destructive"}
        aria-label={size === "icon" ? cimke : undefined}
        title={size === "icon" ? cimke : undefined}
      >
        {ikon}
        {size !== "icon" && cimke}
      </Button>
      <Dialog open={nyitva} onOpenChange={(o) => !pending && setNyitva(o)}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{cim}</DialogTitle>
            <DialogDescription>{leiras}</DialogDescription>
          </DialogHeader>
          {okMezo && (
            <label className="flex flex-col gap-1 text-sm">
              Indok (nem kötelező — a címzett látja)
              <Textarea
                value={indok}
                onChange={(e) => setIndok(e.target.value)}
                rows={2}
                maxLength={FELADAT_SZOVEG_MAX}
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setNyitva(false)}
            >
              Mégsem
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await onConfirm(indok.trim() || undefined);
                  if (!r.success) {
                    toast.error(r.message ?? "Nem sikerült.");
                    return;
                  }
                  toast.success(r.message);
                  setIndok("");
                  setNyitva(false);
                  router.refresh();
                })
              }
            >
              {megerosites}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
