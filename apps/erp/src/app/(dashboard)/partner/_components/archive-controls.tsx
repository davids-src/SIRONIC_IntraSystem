"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import type { FormState } from "./form-errors";

type ArchiveAction = (prev: FormState, formData: FormData) => Promise<FormState>;
type RestoreAction = (prev: FormState) => Promise<FormState>;

/** Archive (with a mandatory reason) or restore — the entity is never deleted. */
export function ArchiveControls({
  archived,
  archiveReason,
  archiveAction,
  restoreAction,
  subject,
}: {
  archived: boolean;
  archiveReason?: string;
  archiveAction?: ArchiveAction;
  restoreAction?: RestoreAction;
  subject: string;
}) {
  const router = useRouter();
  const [archState, archForm, archPending] = useActionState(
    archiveAction ?? (async () => ({ success: false }) as FormState),
    { success: false } as FormState,
  );
  const [restState, restForm, restPending] = useActionState(
    restoreAction ?? (async () => ({ success: false }) as FormState),
    { success: false } as FormState,
  );

  useEffect(() => {
    for (const s of [archState, restState]) {
      if (s.success) {
        toast.success(s.message);
        router.refresh();
      } else if (s.message) toast.error(s.message);
    }
  }, [archState, restState, router]);

  if (archived) {
    return (
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-muted-foreground">
          Archivált {subject}
          {archiveReason ? ` — ok: ${archiveReason}` : ""}.
        </p>
        {restoreAction && (
          <form action={restForm}>
            <Button type="submit" variant="outline" size="sm" disabled={restPending}>
              Visszaállítás
            </Button>
          </form>
        )}
      </div>
    );
  }
  if (!archiveAction) return null;
  const err = !archState.success ? archState.fieldErrors?.ok?.[0] : undefined;
  return (
    <form action={archForm} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Input
          name="ok"
          placeholder="Archiválás oka (kötelező)"
          className="max-w-sm"
          aria-label="Archiválás oka"
        />
        <Button type="submit" variant="outline" size="sm" disabled={archPending}>
          Archiválás
        </Button>
      </div>
      {err && <p className="text-destructive text-sm">{err}</p>}
    </form>
  );
}
