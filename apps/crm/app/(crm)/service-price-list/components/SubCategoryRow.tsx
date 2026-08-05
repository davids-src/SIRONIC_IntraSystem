"use client";

import React from "react";
import { ChevronDown, Layers } from "lucide-react";
import { cn } from "@crm/ui";
import type { ServiceSubCategory } from "@crm/types";

interface SubCategoryRowProps {
  subcategory: ServiceSubCategory | null;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount?: number;
}

export function SubCategoryRow({
  subcategory,
  isExpanded,
  onToggle,
  itemCount,
}: SubCategoryRowProps) {
  if (!subcategory) return null;

  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-2 pl-9 pr-4 py-2 bg-muted/20 border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors select-none"
    >
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200 flex-shrink-0",
          !isExpanded && "-rotate-90",
        )}
      />
      <Layers className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground flex-1">
        {subcategory.name}
      </span>
      {itemCount !== undefined && (
        <span className="text-[11px] font-medium text-muted-foreground/70">
          {itemCount} tétel
        </span>
      )}
    </div>
  );
}
