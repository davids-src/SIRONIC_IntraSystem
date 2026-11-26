"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@erp/ui";

type DeleteResult = { success: boolean; message?: string };

/**
 * Two-step (dialog-confirmed) delete trigger for Gépészet entities. A plain `window.confirm`
 * would do the job, but a Dialog lets the caller spell out *what else* the delete takes with it
 * (szervizjegyek, költségek, dokumentumok…), which is the whole point for a cascading delete.
 */
export function ConfirmDeleteButton({
  onDelete,
  title,
  description,
  triggerLabel = "Törlés",
  confirmLabel = "Véglegesen törlöm",
  redirectTo,
  size = "sm",
  iconOnly = false,
}: {
  onDelete: () => Promise<DeleteResult>;
  title: string;
  description: string;
  triggerLabel?: string;
  confirmLabel?: string;
  /** Where to go after a successful delete — omit to just refresh the current page. */
  redirectTo?: string;
  size?: "sm" | "icon" | "default";
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await onDelete();
      if (!result.success) {
        toast.error(result.message ?? "A törlés nem sikerült.");
        return;
      }
      toast.success(result.message ?? "Törölve.");
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={iconOnly ? "ghost" : "outline"}
        size={size}
        onClick={() => setOpen(true)}
        className={
          iconOnly ? "text-muted-foreground hover:text-destructive" : "text-destructive"
        }
        aria-label={iconOnly ? triggerLabel : undefined}
      >
        <Trash2Icon className="h-4 w-4" aria-hidden />
        {!iconOnly && triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            A törlés nem visszavonható. A feltöltött képek és fájlok a Médiatárban
            megmaradnak, csak a hivatkozásuk szűnik meg.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Mégsem
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending}
              disabled={pending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
