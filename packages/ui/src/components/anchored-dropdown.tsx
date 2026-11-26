"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useCallback, useRef, type ReactNode } from "react";
import { cn } from "@erp/lib";

export type AnchoredDropdownProps = {
  open: boolean;
  onClose: () => void;
  /** The input (and anything around it) the list hangs from — clicks here never close it. */
  anchor: ReactNode;
  anchorClassName?: string;
  children: ReactNode;
  id?: string;
  role?: string;
  className?: string;
};

/**
 * Result list for a type-ahead input, rendered in a portal so a parent card's `overflow-hidden`
 * (or a scroll container) can no longer clip it. Built on Radix Popover so it stacks and stays
 * clickable inside modal Dialogs/Sheets, flips above the input near the bottom of the screen and
 * never grows past the visible space. Focus stays in the input.
 *
 * Scrolling inside a modal: a Radix Dialog/Sheet locks scrolling with `react-remove-scroll`,
 * whose `wheel` / `touchmove` listeners sit on `document` and cancel every event that does not
 * start inside the dialog content — and this list is portalled to `<body>`, outside it. The
 * list therefore stops those events from bubbling up to `document` itself, so the browser
 * scrolls it natively; `overscroll-contain` keeps the page behind from scrolling along at the
 * ends. Outside a dialog nothing listens on `document`, so this changes nothing there.
 */
const SCROLL_EVENTS = ["wheel", "touchmove"] as const;
const stopToDocument = (e: Event) => e.stopPropagation();

export function AnchoredDropdown({
  open,
  onClose,
  anchor,
  anchorClassName,
  children,
  id,
  role = "listbox",
  className,
}: AnchoredDropdownProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  // Callback ref: the content mounts and unmounts with `open`.
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    for (const t of SCROLL_EVENTS)
      node.addEventListener(t, stopToDocument, { passive: true });
    return () => {
      for (const t of SCROLL_EVENTS) node.removeEventListener(t, stopToDocument);
    };
  }, []);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <PopoverPrimitive.Anchor asChild>
        <div ref={anchorRef} className={cn("relative w-full", anchorClassName)}>
          {anchor}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={contentRef}
          id={id}
          role={role}
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
          className={cn(
            "bg-popover text-popover-foreground z-50 w-[var(--radix-popover-trigger-width)] overflow-auto overscroll-contain rounded-md border shadow-md",
            "max-h-[min(16rem,var(--radix-popover-content-available-height))]",
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
