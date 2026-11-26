"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import type { MuveletState } from "../actions";

/** Runs a Server Action, toasts the outcome and refreshes the page on success. */
export function useMuvelet() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const futtat = (run: () => Promise<MuveletState>, onOk?: () => void) =>
    startTransition(async () => {
      const r = await run();
      if (r.success) {
        if (r.message) toast.success(r.message);
        onOk?.();
        router.refresh();
      } else {
        toast.error(r.message ?? "A művelet nem sikerült.");
      }
    });
  return { futtat, pending };
}

/** Archive (reason mandatory) or restore — nothing is ever deleted by this. */
export function ArchivGombok({
  archivalt,
  ok,
  onArchive,
  onRestore,
  alany,
  kompakt,
}: {
  archivalt: boolean;
  ok?: string;
  onArchive?: (ok: string) => Promise<MuveletState>;
  onRestore?: () => Promise<MuveletState>;
  alany: string;
  kompakt?: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const [nyitva, setNyitva] = useState(false);
  const [indok, setIndok] = useState("");

  if (archivalt) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          Archivált {alany}
          {ok ? ` — ok: ${ok}` : ""}.
        </span>
        {onRestore && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => futtat(onRestore)}
          >
            Visszaállítás
          </Button>
        )}
      </div>
    );
  }
  if (!onArchive) return null;
  if (!nyitva) {
    return (
      <Button size="sm" variant="outline" onClick={() => setNyitva(true)}>
        {kompakt ? "Archiválás" : `${alany} archiválása`}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={indok}
        onChange={(e) => setIndok(e.target.value)}
        placeholder="Archiválás oka (kötelező)"
        aria-label="Archiválás oka"
        className="max-w-xs"
      />
      <Button
        size="sm"
        disabled={pending || !indok.trim()}
        onClick={() =>
          futtat(
            () => onArchive(indok),
            () => setNyitva(false),
          )
        }
      >
        Archiválás
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setNyitva(false)}>
        Mégse
      </Button>
    </div>
  );
}

/** Uploads one file to the media library and hands the new media id to the caller. */
export function FajlFeltolto({
  onFeltoltve,
  label = "Fájl feltöltése",
  disabled,
}: {
  onFeltoltve: (mediaId: string) => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [folyamatban, setFolyamatban] = useState(false);

  async function feltolt(file: File) {
    setFolyamatban(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const t =
          res.status === 413
            ? "A fájl túl nagy."
            : "A feltöltés nem sikerült (kép vagy PDF engedélyezett, feltöltési jogosultság kell).";
        toast.error(t);
        return;
      }
      const j = (await res.json()) as { id: string };
      await onFeltoltve(j.id);
    } catch {
      toast.error("A feltöltés nem sikerült.");
    } finally {
      setFolyamatban(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void feltolt(f);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        loading={folyamatban}
        disabled={disabled || folyamatban}
        onClick={() => ref.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}

export const mediaUrl = (id: string) => `/api/media/${id}/file`;
