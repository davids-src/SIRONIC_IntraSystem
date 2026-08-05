"use client";

import React, { useState } from "react";
import { cn, Badge } from "@crm/ui";
import {
  Archive,
  Pencil,
  ChevronDown,
  Tag,
  DollarSign,
  Building2,
  User,
} from "lucide-react";
import type { ServicePriceListItem, PricingSettings } from "@crm/types";

interface ServiceItemRowProps {
  item: ServicePriceListItem;
  isAdmin: boolean;
  isEven: boolean;
  hasSubcategory: boolean;
  showMatrixView: boolean;
  pricingSettings: PricingSettings | null;
  partnerMultiplier: number | null;
  onEdit: (item: ServicePriceListItem) => void;
  onArchive: (item: ServicePriceListItem) => void;
}

const fmt = (n: number) => n.toLocaleString("hu-HU") + " Ft";

const pricingTypeBadge: Record<
  ServicePriceListItem["pricing_type"],
  { label: string; variant: "info" | "default" | "warning" | "success" }
> = {
  fixed: { label: "Fix alapár", variant: "info" },
  hourly: { label: "Óradíjas", variant: "default" },
  custom: { label: "Egyedi", variant: "warning" },
  unit_based: { label: "Rendszeregység", variant: "success" },
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
  isMainPrice: boolean,
  isCustom: boolean,
  isUnitBased: boolean,
): React.ReactNode {
  if (isCustom) {
    return (
      <span className="text-xs text-muted-foreground/60 italic block text-right">
        Egyedi
      </span>
    );
  }
  if (isUnitBased) {
    return (
      <span className="text-xs text-muted-foreground/60 italic block text-right">
        Sávos
      </span>
    );
  }
  if (base === null) {
    return <span className="text-xs text-muted-foreground/40 block text-right">—</span>;
  }
  const calc = Math.round((base * multiplier) / 100) * 100;
  return (
    <span
      className={cn(
        "font-mono text-right block w-full",
        isMainPrice
          ? "text-sm font-bold text-foreground"
          : "text-xs text-muted-foreground font-medium",
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
  showMatrixView,
  pricingSettings,
  partnerMultiplier,
  onEdit,
  onArchive,
}: ServiceItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCustom = item.pricing_type === "custom";
  const isUnitBased = item.pricing_type === "unit_based";
  const base = calcBasePrice(item, pricingSettings);

  const getMult = (key: string): number =>
    (pricingSettings?.client_multipliers as any)?.[key] ?? 1;

  const indentClass = hasSubcategory ? "pl-12" : "pl-6";
  const badgeInfo = pricingTypeBadge[item.pricing_type] || {
    label: item.pricing_type,
    variant: "default",
  };

  const getCalcPrice = (mult: number) => {
    if (base === null || isCustom || isUnitBased) return null;
    return Math.round((base * mult) / 100) * 100;
  };

  return (
    <div className="flex flex-col border-b border-border/40">
      {/* ── Fő Sor ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-0 pr-4 py-3 hover:bg-muted/30 transition-colors group text-sm cursor-pointer select-none",
          indentClass,
          isEven ? "bg-background" : "bg-muted/10",
        )}
      >
        {/* Kinyitó nyíl */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="mr-2 p-1 rounded hover:bg-muted/60 text-muted-foreground transition-transform"
          title="Árak részleteinek megtekintése"
        >
          <ChevronDown
            size={16}
            className={cn(
              "transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </button>

        {/* SKU / Cikkszám */}
        <div className="w-[110px] flex-shrink-0 font-mono text-xs text-muted-foreground/80 font-semibold pr-2">
          {item.sku}
        </div>

        {/* Megnevezés & Leírás */}
        <div className="flex-1 min-w-[200px] pr-4">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <span>{item.name}</span>
            {item.is_archived && <Badge variant="error">Archivált</Badge>}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-normal">
              {item.description}
            </p>
          )}
        </div>

        {/* Egység */}
        <div className="w-[70px] flex-shrink-0 text-xs text-muted-foreground text-center font-medium">
          {item.unit}
        </div>

        {/* Típus */}
        <div className="w-[120px] flex-shrink-0 flex justify-center">
          <Badge variant={badgeInfo.variant as any}>{badgeInfo.label}</Badge>
        </div>

        {/* Belső alapár (admin only) */}
        {isAdmin && (
          <div className="w-[110px] flex-shrink-0 text-xs text-muted-foreground/70 text-right font-mono font-medium pr-2">
            {item.pricing_type === "fixed" && item.internal_base_price != null
              ? fmt(item.internal_base_price)
              : item.pricing_type === "hourly"
                ? "óradíj"
                : "—"}
          </div>
        )}

        {/* Eladási Ár / KKV 1 év (Fő ár) */}
        <div className="w-[120px] flex-shrink-0 text-right pr-2">
          {renderPriceCell(base, getMult("smb_1year"), true, isCustom, isUnitBased)}
        </div>

        {/* Mátrix nézet extra oszlopok */}
        {showMatrixView && (
          <>
            <div className="w-[100px] flex-shrink-0 text-right pr-2">
              {renderPriceCell(
                base,
                getMult("smb_occasional"),
                false,
                isCustom,
                isUnitBased,
              )}
            </div>
            <div className="w-[100px] flex-shrink-0 text-right pr-2">
              {renderPriceCell(base, getMult("smb_2year"), false, isCustom, isUnitBased)}
            </div>
            <div className="w-[105px] flex-shrink-0 text-right pr-2">
              {renderPriceCell(base, getMult("enterprise"), false, isCustom, isUnitBased)}
            </div>
            <div className="w-[105px] flex-shrink-0 text-right pr-2">
              {renderPriceCell(base, getMult("individual"), false, isCustom, isUnitBased)}
            </div>
          </>
        )}

        {/* Partner ára */}
        {partnerMultiplier !== null && (
          <div className="w-[120px] flex-shrink-0 text-right pr-2">
            {isCustom || isUnitBased ? (
              <span className="text-xs text-muted-foreground/60 italic block text-right">
                {isCustom ? "Egyedi" : "Sávos"}
              </span>
            ) : base !== null ? (
              <span className="text-sm font-mono font-bold text-red-500 block text-right">
                {fmt(Math.round((base * partnerMultiplier) / 100) * 100)}
              </span>
            ) : null}
          </div>
        )}

        {/* Megjegyzés */}
        <div className="w-[140px] flex-shrink-0 text-xs text-muted-foreground/70 pr-3 truncate hidden md:block pl-3">
          {item.notes ?? "—"}
        </div>

        {/* Műveletek */}
        <div className="w-[70px] flex-shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Szerkesztés"
          >
            <Pencil size={15} />
          </button>
          {!item.is_archived && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(item);
              }}
              className="h-8 w-8 rounded-md hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              title="Archiválás"
            >
              <Archive size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Kinyíló Részletező Kártya (Összes ár egy helyen) ── */}
      {isExpanded && (
        <div className="bg-muted/20 border-t border-b border-border/50 p-4 pl-14 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                {item.name} – Teljes Árképzési Részletező
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Mértékegység: <strong className="text-foreground">{item.unit}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* KKV 1 ÉV */}
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                KKV 1 Év (Alap)
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Szorzó: ×{getMult("smb_1year")}
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-1">
                {getCalcPrice(getMult("smb_1year")) !== null
                  ? fmt(getCalcPrice(getMult("smb_1year"))!)
                  : isCustom
                    ? "Egyedi"
                    : isUnitBased
                      ? "Sávos"
                      : "—"}
              </span>
            </div>

            {/* KKV ESETI */}
            <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                KKV Eseti
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Szorzó: ×{getMult("smb_occasional")}
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-1">
                {getCalcPrice(getMult("smb_occasional")) !== null
                  ? fmt(getCalcPrice(getMult("smb_occasional"))!)
                  : isCustom
                    ? "Egyedi"
                    : isUnitBased
                      ? "Sávos"
                      : "—"}
              </span>
            </div>

            {/* KKV 2 ÉV */}
            <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                KKV 2 Év
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Szorzó: ×{getMult("smb_2year")}
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-1">
                {getCalcPrice(getMult("smb_2year")) !== null
                  ? fmt(getCalcPrice(getMult("smb_2year"))!)
                  : isCustom
                    ? "Egyedi"
                    : isUnitBased
                      ? "Sávos"
                      : "—"}
              </span>
            </div>

            {/* NAGYVÁLLALAT */}
            <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Nagyvállalat
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Szorzó: ×{getMult("enterprise")}
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-1">
                {getCalcPrice(getMult("enterprise")) !== null
                  ? fmt(getCalcPrice(getMult("enterprise"))!)
                  : isCustom
                    ? "Egyedi"
                    : isUnitBased
                      ? "Sávos"
                      : "—"}
              </span>
            </div>

            {/* MAGÁNSZEMÉLY */}
            <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Magánszemély
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Szorzó: ×{getMult("individual")}
              </span>
              <span className="text-sm font-bold font-mono text-foreground mt-1">
                {getCalcPrice(getMult("individual")) !== null
                  ? fmt(getCalcPrice(getMult("individual"))!)
                  : isCustom
                    ? "Egyedi"
                    : isUnitBased
                      ? "Sávos"
                      : "—"}
              </span>
            </div>

            {/* BELSŐ ÁR / ALAPÁR */}
            {isAdmin && (
              <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Belső Alapár
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {item.pricing_type}
                </span>
                <span className="text-sm font-bold font-mono text-foreground mt-1">
                  {item.internal_base_price != null ? fmt(item.internal_base_price) : "—"}
                </span>
              </div>
            )}
          </div>

          {/* Megjegyzések ha vannak */}
          {item.notes && (
            <p className="mt-3 text-xs text-muted-foreground italic">
              <strong>Megjegyzés:</strong> {item.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
