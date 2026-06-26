"use client";

import React from "react";
import { cn } from "@crm/ui";
import { Archive, Pencil } from "lucide-react";
import type { ServicePriceListItem, PricingSettings } from "@crm/types";

interface ServiceItemRowProps {
  item: ServicePriceListItem;
  isAdmin: boolean;
  isEven: boolean;
  hasSubcategory: boolean;
  pricingSettings: PricingSettings | null;
  partnerMultiplier: number | null;
  onEdit: (item: ServicePriceListItem) => void;
  onArchive: (item: ServicePriceListItem) => void;
}

const fmt = (n: number) => n.toLocaleString("hu-HU") + " Ft";

const pricingTypeBadge: Record<
  ServicePriceListItem["pricing_type"],
  { label: string; className: string }
> = {
  fixed: {
    label: "Fix alapár",
    className:
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30",
  },
  hourly: {
    label: "Óradíjas",
    className:
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30",
  },
  custom: {
    label: "Egyedi",
    className:
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30",
  },
  unit_based: {
    label: "Rendszeregység",
    className:
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30",
  },
};

function calcBasePrice(
  item: ServicePriceListItem,
  settings: PricingSettings | null,
): number | null {
  if (!settings) return null;
  if (item.pricing_type === "fixed") return item.internal_base_price ?? null;
  if (item.pricing_type === "hourly") {
    const rateKey = item.hourly_rate_category as keyof typeof settings.hourly_rates;
    const rawRate = settings.hourly_rates?.[rateKey] ?? 0;
    return Math.round((rawRate * (settings.overhead_multiplier ?? 1.45)) / 100) * 100;
  }
  return null; // custom / unit_based
}

function renderPriceCell(
  base: number | null,
  multiplier: number,
  isRef: boolean,
  isCustom: boolean,
  isUnitBased: boolean,
): React.ReactNode {
  if (isCustom) {
    return (
      <span className="text-[10px] text-center text-muted-foreground/50 italic w-full block">
        Egyedi
      </span>
    );
  }
  if (isUnitBased) {
    return (
      <span className="text-[10px] text-center text-muted-foreground/50 italic w-full block">
        Sávos
      </span>
    );
  }
  if (base === null) {
    return (
      <span className="text-[10px] text-muted-foreground/40 block text-right">—</span>
    );
  }
  const calc = Math.round((base * multiplier) / 100) * 100;
  return (
    <span
      className={cn(
        "font-mono text-right block w-full",
        isRef ? "text-sm font-semibold text-foreground" : "text-xs text-muted-foreground",
      )}
    >
      {fmt(calc)}
    </span>
  );
}

export function ServiceItemRow({
  item,
  isAdmin,
  isEven,
  hasSubcategory,
  pricingSettings,
  partnerMultiplier,
  onEdit,
  onArchive,
}: ServiceItemRowProps) {
  const isCustom = item.pricing_type === "custom";
  const isUnitBased = item.pricing_type === "unit_based";
  const base = calcBasePrice(item, pricingSettings);

  const getMult = (key: string): number =>
    (pricingSettings?.client_multipliers as any)?.[key] ?? 1;

  const indentClass = hasSubcategory ? "pl-12" : "pl-6";

  const badge = pricingTypeBadge[item.pricing_type];

  return (
    <div
      className={cn(
        "flex items-center gap-0 pr-3 py-2.5 border-b border-border/40 hover:bg-muted/20 transition-colors group",
        indentClass,
        isEven ? "bg-background" : "bg-muted/10",
      )}
    >
      {/* SKU */}
      <div className="w-[100px] flex-shrink-0 font-mono text-[10px] text-muted-foreground/70 pr-2">
        {item.sku}
      </div>

      {/* Megnevezés */}
      <div className="flex-1 min-w-[180px] pr-2">
        <span className="text-sm font-medium text-foreground line-clamp-1">
          {item.name}
        </span>
        {item.description && (
          <span className="text-[10px] text-muted-foreground/60 line-clamp-1 mt-0.5 block">
            {item.description}
          </span>
        )}
      </div>

      {/* Egység */}
      <div className="w-[70px] flex-shrink-0 text-xs text-muted-foreground text-center">
        {item.unit}
      </div>

      {/* Típus */}
      <div className="w-[110px] flex-shrink-0 flex justify-center">
        <span className={badge.className}>{badge.label}</span>
      </div>

      {/* Belső alapár (admin only) */}
      {isAdmin && (
        <div className="w-[100px] flex-shrink-0 text-xs text-muted-foreground/60 text-right font-mono pr-2">
          {item.pricing_type === "fixed" && item.internal_base_price != null
            ? fmt(item.internal_base_price)
            : item.pricing_type === "hourly"
              ? "óradíj"
              : "—"}
        </div>
      )}

      {/* KKV 1 év (ALAP – kiemelve) */}
      <div className="w-[95px] flex-shrink-0 text-right font-mono bg-green-500/5 pr-1">
        {renderPriceCell(base, getMult("smb_1year"), true, isCustom, isUnitBased)}
      </div>

      {/* KKV eseti */}
      <div className="w-[95px] flex-shrink-0 text-right font-mono pr-1 hidden lg:block">
        {renderPriceCell(base, getMult("smb_occasional"), false, isCustom, isUnitBased)}
      </div>

      {/* KKV 2 év */}
      <div className="w-[95px] flex-shrink-0 text-right font-mono pr-1 hidden xl:block">
        {renderPriceCell(base, getMult("smb_2year"), false, isCustom, isUnitBased)}
      </div>

      {/* Nagyvállalat */}
      <div className="w-[95px] flex-shrink-0 text-right font-mono pr-1 hidden 2xl:block">
        {renderPriceCell(base, getMult("enterprise"), false, isCustom, isUnitBased)}
      </div>

      {/* Magánszemély */}
      <div className="w-[95px] flex-shrink-0 text-right font-mono pr-1 hidden 2xl:block">
        {renderPriceCell(base, getMult("individual"), false, isCustom, isUnitBased)}
      </div>

      {/* Partner ára */}
      {partnerMultiplier !== null && (
        <div className="w-[95px] flex-shrink-0 text-right font-mono pr-1 bg-red-500/5">
          {isCustom || isUnitBased ? (
            <span className="text-[10px] text-muted-foreground/50 italic block text-right">
              {isCustom ? "Egyedi" : "Sávos"}
            </span>
          ) : base !== null ? (
            <span
              className="text-sm font-mono font-bold text-right block"
              style={{ color: "#E8271A" }}
            >
              {fmt(Math.round((base * partnerMultiplier) / 100) * 100)}
            </span>
          ) : null}
        </div>
      )}

      {/* Megjegyzés */}
      <div className="w-[120px] flex-shrink-0 text-[10px] text-muted-foreground/60 pr-2 truncate hidden md:block">
        {item.notes ?? ""}
      </div>

      {/* Műveletek */}
      <div className="w-[70px] flex-shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          className="h-7 w-7 p-0 rounded hover:bg-muted flex items-center justify-center"
          title="Szerkesztés"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        {!item.is_archived && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(item);
            }}
            className="h-7 w-7 p-0 rounded hover:bg-destructive/10 flex items-center justify-center"
            title="Archiválás"
          >
            <Archive className="h-3.5 w-3.5 text-destructive/70" />
          </button>
        )}
      </div>
    </div>
  );
}
