"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Combobox, Label } from "@erp/ui";

export type FelelosAssignResult = { success: boolean; message?: string };

/**
 * Shared "felelős" (assignee) picker for every module's detail page — Gépészet, Vállalkozás,
 * Termelés. Lets you pick an existing user OR type a name that isn't a system user; the caller's
 * `onAssign` decides which happened by whether it receives `userId` or `name`.
 */
export function FelelosAssignForm({
  label = "Felelős",
  users,
  currentUserId,
  currentName,
  onAssign,
  submitLabel = "Felelős hozzárendelése",
  clearOnSuccess = false,
  inputId = "assignee",
}: {
  /** Must be unique when the form appears twice on one page. */
  inputId?: string;
  label?: string;
  submitLabel?: string;
  /** Empty the field after a successful submit (for "add another" lists, e.g. gépkezelők). */
  clearOnSuccess?: boolean;
  users: Array<{ id: string; name: string }>;
  currentUserId?: string;
  currentName?: string;
  onAssign: (input: { userId?: string; name?: string }) => Promise<FelelosAssignResult>;
}) {
  const router = useRouter();
  const initialText =
    currentName ?? users.find((u) => u.id === currentUserId)?.name ?? "";
  const [text, setText] = useState(initialText);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const matched = users.find((u) => u.name.toLowerCase() === trimmed.toLowerCase());
    startTransition(async () => {
      const result = await onAssign(matched ? { userId: matched.id } : { name: trimmed });
      if (result.success) {
        toast.success(result.message ?? "Felelős hozzárendelve.");
        if (clearOnSuccess) setText("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Hiba történt.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        <Combobox
          id={inputId}
          value={text}
          onChange={setText}
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          placeholder="Válassz vagy írj be egy nevet…"
          emptyMessage="Nincs ilyen felhasználó — Enter után szabad szövegként kerül mentésre"
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        loading={pending}
        disabled={pending || !text.trim()}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
