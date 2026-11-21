"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileTextIcon, PaperclipIcon, XIcon } from "lucide-react";
import { FileUploadButton, cn } from "@erp/ui";
import { MEDIA_UPLOAD_ACCEPT } from "@erp/media/upload-constraints";
import { FELADAT_CSATOLMANY_MAX } from "@erp/feladat/client";

export type Csatolmany = {
  id: string;
  filename: string;
  contentType?: string;
  url?: string;
};

/**
 * Picks images / PDFs for a task or a comment and uploads them at once as protected media
 * (`/api/media/vedett`, #47) — only the ids go to the Server Action, which attaches them.
 * `entityId` is the task for a comment's files; empty while the task is being given.
 */
export function CsatolmanyFeltolto({
  value,
  onChange,
  entityId,
  disabled,
}: {
  value: Csatolmany[];
  onChange: (next: Csatolmany[]) => void;
  entityId?: string;
  disabled?: boolean;
}) {
  const [toltes, setToltes] = useState(false);
  const marad = FELADAT_CSATOLMANY_MAX - value.length;

  async function feltolt(files: FileList) {
    const lista = [...files].slice(0, Math.max(0, marad));
    if (files.length > lista.length)
      toast.error(`Legfeljebb ${FELADAT_CSATOLMANY_MAX} csatolmány adható meg.`);
    if (lista.length === 0) return;
    setToltes(true);
    const ujak: Csatolmany[] = [];
    try {
      for (const file of lista) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("entityType", "feladat");
        if (entityId) fd.set("entityId", entityId);
        const res = await fetch("/api/media/vedett", { method: "POST", body: fd });
        const json = (await res.json().catch(() => ({}))) as {
          id?: string;
          filename?: string;
          contentType?: string;
          error?: string;
        };
        if (!res.ok || !json.id) {
          toast.error(json.error ?? `${file.name}: a feltöltés nem sikerült`);
          continue;
        }
        ujak.push({
          id: json.id,
          filename: json.filename ?? file.name,
          contentType: json.contentType,
        });
      }
    } finally {
      setToltes(false);
    }
    if (ujak.length) {
      const ids = new Set(value.map((v) => v.id));
      onChange([...value, ...ujak.filter((u) => !ids.has(u.id))]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FileUploadButton
        accept={MEDIA_UPLOAD_ACCEPT}
        multiple
        size="sm"
        variant="ghost"
        loading={toltes}
        disabled={disabled || marad <= 0}
        onFilesSelected={feltolt}
      >
        Csatolás (kép, PDF)
      </FileUploadButton>
      {value.map((c) => (
        <span
          key={c.id}
          className="bg-muted inline-flex max-w-[14rem] items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs"
        >
          <PaperclipIcon className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{c.filename}</span>
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v.id !== c.id))}
            className="hover:bg-muted rounded-full p-0.5"
            aria-label={`${c.filename} eltávolítása`}
          >
            <XIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Attachments with a thumbnail for images and an icon for PDFs; each opens in a new tab. */
export function CsatolmanyLista({
  csatolmanyok,
  className,
}: {
  csatolmanyok: Csatolmany[];
  className?: string;
}) {
  if (csatolmanyok.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Csatolmányok">
      {csatolmanyok.map((c) => {
        const url = c.url ?? `/api/media/${c.id}/file`;
        const kep = c.contentType?.startsWith("image/");
        return (
          <li key={c.id}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="hover:bg-muted flex w-28 flex-col items-center gap-1 rounded-md border p-1.5 text-xs"
              title={c.filename}
            >
              {kep ? (
                <img
                  src={url}
                  alt={c.filename}
                  className="h-20 w-full rounded object-cover"
                />
              ) : (
                <FileTextIcon className="text-muted-foreground h-20 w-10" aria-hidden />
              )}
              <span className="w-full truncate text-center">{c.filename}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
