"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Label, Textarea } from "@erp/ui";
import { createSecretAction, updateSecretAction, type SecretFormState } from "../actions";

type Props = {
  mode: "create" | "edit";
  initial?: { id: string; name: string; description?: string; partnerId?: string };
};

export function SecretForm({ mode, initial }: Props) {
  const router = useRouter();
  const bound =
    mode === "create" ? createSecretAction : updateSecretAction.bind(null, initial!.id);
  const [state, action, pending] = useActionState(bound, {
    success: false,
  } satisfies SecretFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/secrets/${state.id}`);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const err = (k: string) =>
    state.success === false ? state.fieldErrors?.[k]?.[0] : undefined;

  return (
    <form action={action} className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Név</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name}
          maxLength={120}
          required
        />
        {err("name") && <p className="text-destructive text-sm">{err("name")}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="value">
          {mode === "create" ? "Érték" : "Új érték (opcionális)"}
        </Label>
        <Textarea
          id="value"
          name="value"
          rows={4}
          required={mode === "create"}
          autoComplete="off"
          spellCheck={false}
          placeholder={
            mode === "edit" ? "Üresen hagyva a mentett érték nem változik" : undefined
          }
        />
        {mode === "edit" && (
          <p className="text-muted-foreground text-xs">
            A mentett érték biztonsági okból nem töltődik vissza az űrlapba.
          </p>
        )}
        {err("value") && <p className="text-destructive text-sm">{err("value")}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Leírás</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description}
        />
        {err("description") && (
          <p className="text-destructive text-sm">{err("description")}</p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="partnerId">Partner azonosító (opcionális)</Label>
        <Input id="partnerId" name="partnerId" defaultValue={initial?.partnerId} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Mentés…" : "Mentés"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
