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
      className="flex items-center gap-2 pl-8 pr-3 py-2 bg-muted/30 border-b border-border/60 cursor-pointer hover:bg-muted/50 transition-colors"
    >
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200 flex-shrink-0",
          !isExpanded && "-rotate-90",
        )}
      />
      <Layers className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
      <span className="text-xs font-medium text-muted-foreground italic flex-1">
        {subcategory.name}
      </span>
      {itemCount !== undefined && (
        <span className="text-[10px] text-muted-foreground/60">{itemCount} tétel</span>
      )}
    </div>
  );
}
