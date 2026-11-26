"use client";

import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  PrinterIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@erp/lib";

export type ExportMenuProps = {
  onExcel: () => Promise<void> | void;
  onPrint: () => Promise<void> | void;
  /** Button text; omit for an icon-only trigger (app header). */
  label?: string;
  className?: string;
  align?: "start" | "end";
};

/**
 * "Exportálás" menu: Excel download or a print view (the browser's dialog saves it as PDF).
 * Errors become a toast — an export never breaks the page.
 */
export function ExportMenu({
  onExcel,
  onPrint,
  label,
  className,
  align = "end",
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void> | void) => {
    setOpen(false);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      console.error("[export]", e);
      toast.error(
        e instanceof Error && e.message ? e.message : "Az exportálás nem sikerült.",
      );
    } finally {
      setBusy(false);
    }
  };

  const item =
    "hover:bg-muted flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none focus-visible:bg-muted";

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={busy}
          data-export="skip"
          aria-label={label ? undefined : "Exportálás és nyomtatás"}
          title={label ? undefined : "Exportálás és nyomtatás"}
          className={cn(
            "bg-background hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-md border text-sm disabled:opacity-60",
            label ? "px-3" : "w-9 justify-center",
            className,
          )}
        >
          {busy ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <DownloadIcon className="size-3.5" aria-hidden />
          )}
          {label}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={4}
          data-export="skip"
          className="bg-popover text-popover-foreground z-50 w-56 rounded-md border p-1 shadow-md"
        >
          <button type="button" className={item} onClick={() => run(onExcel)}>
            <FileSpreadsheetIcon className="size-4" aria-hidden />
            Excel (.xlsx)
          </button>
          <button type="button" className={item} onClick={() => run(onPrint)}>
            <PrinterIcon className="size-4" aria-hidden />
            Nyomtatás / PDF
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
