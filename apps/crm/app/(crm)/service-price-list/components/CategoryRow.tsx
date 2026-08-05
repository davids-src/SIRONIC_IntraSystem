"use client";

import React from "react";
import { ChevronDown, Folder } from "lucide-react";
import { cn } from "@crm/ui";
import type { ServiceCategory } from "@crm/types";

interface CategoryRowProps {
  category: ServiceCategory;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount: number;
}

export function CategoryRow({
  category,
  isExpanded,
  onToggle,
  itemCount,
}: CategoryRowProps) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border cursor-pointer hover:bg-muted/70 transition-colors select-none"
    >
      {/* Bal oldali kategória szín csík */}
      <div
        className="w-1.5 h-5 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color ?? "#3b82f6" }}
      />

      {/* Toggle nyíl */}
      <ChevronDown
        className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
          !isExpanded && "-rotate-90",
        )}
      />

      <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      {/* Kategória neve */}
      <span className="font-bold text-sm text-foreground flex-1 tracking-tight">
        {category.name}
      </span>

      {/* SKU Prefix badge */}
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-background border border-border text-muted-foreground">
        {category.sku_prefix}
      </span>

      {/* Tétel darabszám */}
      <span className="text-xs font-semibold text-muted-foreground bg-background px-2.5 py-1 rounded-full border border-border/60">
        {itemCount} tétel
      </span>
    </div>
  );
}
