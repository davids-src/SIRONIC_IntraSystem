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
      className="flex items-center gap-3 px-3 py-3 bg-muted/60 border-b border-border cursor-pointer hover:bg-muted/80 transition-colors"
      style={{ "--cat-color": category.color ?? "#6366f1" } as React.CSSProperties}
    >
      {/* Bal oldali kategória szín csík */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color ?? "#6366f1" }}
      />

      {/* Toggle ikon */}
      <ChevronDown
        className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
          !isExpanded && "-rotate-90",
        )}
      />

      <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      {/* Kategória neve */}
      <span className="font-semibold text-sm text-foreground flex-1">
        {category.name}
      </span>

      {/* Prefix badge */}
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-background border border-border text-muted-foreground ml-2">
        {category.sku_prefix}
      </span>

      {/* Tétel darabszám */}
      <span className="text-xs text-muted-foreground ml-auto mr-3">
        {itemCount} tétel
      </span>
    </div>
  );
}
