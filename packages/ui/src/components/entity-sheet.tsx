"use client";

import type React from "react";
import { useRef } from "react";
import { cn } from "@erp/lib";
import { ElementExportMenu } from "./export/element-export-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./sheet";

export type EntitySheetSize = "sm" | "md" | "lg" | "xl" | "full";
export type EntitySheetMode = "view" | "edit" | "create";

export interface EntitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: "right" | "left";
  size?: EntitySheetSize;
  mode?: EntitySheetMode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** `false` hides the sheet's Excel / print menu. */
  exportable?: boolean;
}

export function EntitySheet({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  size = "md",
  footer,
  children,
  className,
  exportable = true,
}: EntitySheetProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} size={size} className={cn("overflow-y-auto", className)}>
        <SheetHeader className="pr-12">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <SheetTitle>{title}</SheetTitle>
              {description ? <SheetDescription>{description}</SheetDescription> : null}
            </div>
            {exportable ? (
              <ElementExportMenu getRoot={() => bodyRef.current} title={title} />
            ) : null}
          </div>
        </SheetHeader>
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 pb-4">
          {children}
        </div>
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
