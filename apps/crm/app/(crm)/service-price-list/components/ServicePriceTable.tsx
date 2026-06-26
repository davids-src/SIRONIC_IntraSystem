"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, SearchX } from "lucide-react";
import { Input, Button, Card } from "@crm/ui";
import type {
  ServicePriceListItem,
  ServiceCategory,
  ServiceSubCategory,
  PricingSettings,
} from "@crm/types";

import { CategoryRow } from "./CategoryRow";
import { SubCategoryRow } from "./SubCategoryRow";
import { ServiceItemRow } from "./ServiceItemRow";
import { PartnerPricePanel } from "./PartnerPricePanel";
import ServicePriceListSheet from "./ServicePriceListSheet";

interface ServicePriceTableProps {
  initialCategories: ServiceCategory[];
  initialSubcategories: ServiceSubCategory[];
  initialItems: ServicePriceListItem[];
  initialPricingSettings: PricingSettings | null;
  isAdmin: boolean;
}

export function ServicePriceTable({
  initialCategories,
  initialSubcategories,
  initialItems,
  initialPricingSettings,
  isAdmin,
}: ServicePriceTableProps) {
  // Filters state
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPricingType, setFilterPricingType] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [partnerMultiplier, setPartnerMultiplier] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  // Expanded states (by default, everything is expanded, so we track collapsed instead)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedSubcategories, setCollapsedSubcategories] = useState<Set<string>>(
    new Set(),
  );

  // Modals state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ServicePriceListItem | null>(null);

  // Data fetching
  const { data: categories } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const res = await fetch("/api/service-categories");
      if (!res.ok) throw new Error("Kategóriák lekérése sikertelen");
      return res.json();
    },
    initialData: initialCategories,
  });

  const { data: subcategories } = useQuery({
    queryKey: ["service-subcategories"],
    queryFn: async () => {
      const res = await fetch("/api/service-subcategories");
      if (!res.ok) throw new Error("Alkategóriák lekérése sikertelen");
      return res.json();
    },
    initialData: initialSubcategories,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: [
      "service-price-list",
      filterCategory,
      filterPricingType,
      showArchived,
      search,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category_id", filterCategory);
      if (filterPricingType) params.set("pricing_type", filterPricingType);
      if (showArchived) params.set("include_archived", "true");
      if (search) params.set("search", search);

      const res = await fetch(`/api/service-price-list?${params.toString()}`);
      if (!res.ok) throw new Error("Árlista lekérése sikertelen");
      return res.json();
    },
    initialData: initialItems,
  });

  const { data: pricingSettings } = useQuery({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/pricing");
      if (!res.ok) throw new Error("Beállítások lekérése sikertelen");
      return res.json();
    },
    initialData: initialPricingSettings,
  });

  // Derived Multipliers for Header
  const getMult = (key: string) => {
    if (!pricingSettings) return "1,00";
    const v = (pricingSettings.client_multipliers as any)?.[key] ?? 1.0;
    return v.toLocaleString("hu-HU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Group items hierarchically
  const groupedData = useMemo(() => {
    const categoryGroups = new Map<string, Map<string, ServicePriceListItem[]>>();
    let totalItemsDisplayed = 0;

    for (const item of items) {
      const catId = item.category_id;
      const subId = item.subcategory_id ?? "root";

      if (!categoryGroups.has(catId)) categoryGroups.set(catId, new Map());
      const subMap = categoryGroups.get(catId)!;
      if (!subMap.has(subId)) subMap.set(subId, []);
      subMap.get(subId)!.push(item);
      totalItemsDisplayed++;
    }

    const sortedCats = [...categories].sort(
      (a: ServiceCategory, b: ServiceCategory) => a.sort_order - b.sort_order,
    );
    const result: {
      category: ServiceCategory;
      itemCount: number;
      subgroups: {
        subcategory: ServiceSubCategory | null;
        items: ServicePriceListItem[];
      }[];
    }[] = [];

    for (const cat of sortedCats) {
      if (!categoryGroups.has(cat._id)) continue;
      const subMap = categoryGroups.get(cat._id)!;
      const subgroups: (typeof result)[0]["subgroups"] = [];
      let catItemCount = 0;

      // Root items (no subcategory)
      if (subMap.has("root")) {
        const rootItems = subMap.get("root")!.sort((a, b) => a.sort_order - b.sort_order);
        subgroups.push({ subcategory: null, items: rootItems });
        catItemCount += rootItems.length;
      }

      // Subcategories
      const catSubs = subcategories
        .filter((s: ServiceSubCategory) => s.category_id === cat._id)
        .sort(
          (a: ServiceSubCategory, b: ServiceSubCategory) => a.sort_order - b.sort_order,
        );

      for (const sub of catSubs) {
        if (subMap.has(sub._id)) {
          const subItems = subMap
            .get(sub._id)!
            .sort((a, b) => a.sort_order - b.sort_order);
          subgroups.push({ subcategory: sub, items: subItems });
          catItemCount += subItems.length;
        }
      }

      result.push({ category: cat, subgroups, itemCount: catItemCount });
    }

    return { result, totalItemsDisplayed };
  }, [items, categories, subcategories]);

  // Handlers
  const toggleCategory = (id: string) => {
    const next = new Set(collapsedCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedCategories(next);
  };

  const toggleSubCategory = (id: string) => {
    const next = new Set(collapsedSubcategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsedSubcategories(next);
  };

  const handleEdit = (item: ServicePriceListItem) => {
    setSelectedItem(item);
    setIsSheetOpen(true);
  };

  const handleArchive = async (item: ServicePriceListItem) => {
    if (!confirm(`Biztosan archiválod ezt a tételt: ${item.name}?`)) return;
    try {
      const res = await fetch(`/api/service-price-list/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("");
    setFilterPricingType("");
    setShowArchived(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Szűrősáv ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end p-4 bg-card border border-border rounded-lg">
        {/* Keresés */}
        <div className="flex-1 min-w-[240px] relative">
          <Search
            size={14}
            className="absolute left-3 top-3 text-muted-foreground pointer-events-none"
          />
          <Input
            label="Keresés"
            placeholder="Keresés név, SKU vagy leírás alapján..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Kategória */}
        <div className="w-full sm:w-[200px] flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Kategória</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Mindegyik kategória</option>
            {categories.map((c: ServiceCategory) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Árképzés típusa */}
        <div className="w-full sm:w-[180px] flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Árképzés típusa
          </label>
          <select
            value={filterPricingType}
            onChange={(e) => setFilterPricingType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">Mindegyik árképzés</option>
            <option value="fixed">Fix alapár</option>
            <option value="hourly">Óradíjas</option>
            <option value="custom">Egyedi</option>
            <option value="unit_based">Rendszeregység</option>
          </select>
        </div>

        {/* Archiváltak */}
        <div className="flex items-center self-end pb-1 gap-2 h-10">
          <input
            type="checkbox"
            id="show-archived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <label
            htmlFor="show-archived"
            className="text-sm font-medium text-foreground cursor-pointer whitespace-nowrap"
          >
            Archiváltak
          </label>
        </div>

        {/* Partner kereső */}
        <div className="w-full sm:w-[220px] flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Partner árai
          </label>
          <PartnerPricePanel
            pricingSettings={pricingSettings ?? null}
            onPartnerSelect={(mult: number | null, name: string | null) => {
              setPartnerMultiplier(mult);
              setPartnerName(name);
            }}
          />
        </div>
      </div>

      {/* ── Táblázat ── */}
      <div className="w-full overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[900px] w-full">
          {/* Fejléc sor */}
          <div className="flex items-center border-b-2 border-border bg-muted/50 sticky top-0 z-10 px-3 py-2">
            {/* Indent placeholder */}
            <div className="w-[28px] flex-shrink-0" />

            {/* Cikkszám */}
            <div className="w-[100px] flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cikkszám
            </div>

            {/* Megnevezés */}
            <div className="flex-1 min-w-[180px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left">
              Megnevezés
            </div>

            {/* Egység */}
            <div className="w-[70px] flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Egység
            </div>

            {/* Típus */}
            <div className="w-[110px] flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Típus
            </div>

            {/* Belső alapár (admin only) */}
            {isAdmin && (
              <div className="w-[100px] flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Belső ár
              </div>
            )}

            {/* KKV 1 év – kiemelve */}
            <div className="w-[95px] flex-shrink-0 text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400">
                KKV 1 ÉV
              </span>
              <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                ×{getMult("smb_1year")}
              </span>
            </div>

            {/* KKV eseti */}
            <div className="w-[95px] flex-shrink-0 text-right hidden lg:block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                KKV Eseti
              </span>
              <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                ×{getMult("smb_occasional")}
              </span>
            </div>

            {/* KKV 2 év */}
            <div className="w-[95px] flex-shrink-0 text-right hidden xl:block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                KKV 2 Év
              </span>
              <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                ×{getMult("smb_2year")}
              </span>
            </div>

            {/* Nagyvállalat */}
            <div className="w-[95px] flex-shrink-0 text-right hidden 2xl:block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nagyvállalat
              </span>
              <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                ×{getMult("enterprise")}
              </span>
            </div>

            {/* Magánszemély */}
            <div className="w-[95px] flex-shrink-0 text-right hidden 2xl:block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Magánszemély
              </span>
              <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                ×{getMult("individual")}
              </span>
            </div>

            {/* Partner ára */}
            {partnerMultiplier !== null && (
              <div className="w-[95px] flex-shrink-0 text-right">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "#E8271A" }}
                >
                  Partner
                </span>
                <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                  ×
                  {partnerMultiplier.toLocaleString("hu-HU", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            {/* Megjegyzés */}
            <div className="w-[120px] flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:block">
              Megjegyzés
            </div>

            {/* Műveletek */}
            <div className="w-[70px] flex-shrink-0" />
          </div>

          {/* ── Tartalom ── */}
          {itemsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : initialItems.length === 0 ? (
            /* Üres állapot – még nincs tétel */
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Még nincsenek szolgáltatások
              </p>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                Hozd létre az első tételt a jobb felső sarokban lévő 'Új tétel' gombbal.
              </p>
            </div>
          ) : groupedData.totalItemsDisplayed === 0 ? (
            /* Szűrési üres állapot */
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <SearchX className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground">Nincs találat</p>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                Próbálj más keresési feltételt vagy szűrőt használni.
              </p>
              <Button variant="secondary" onClick={clearFilters}>
                Szűrők törlése
              </Button>
            </div>
          ) : (
            /* Sorok */
            <div className="flex flex-col w-full">
              {groupedData.result.map(({ category, subgroups, itemCount }) => {
                const isCatCollapsed = collapsedCategories.has(category._id);
                let rowIndex = 0;

                return (
                  <React.Fragment key={category._id}>
                    <CategoryRow
                      category={category}
                      isExpanded={!isCatCollapsed}
                      onToggle={() => toggleCategory(category._id)}
                      itemCount={itemCount}
                    />
                    {!isCatCollapsed &&
                      subgroups.map(({ subcategory, items: subItems }, subIdx) => {
                        const subId = subcategory?._id ?? `root-${subIdx}`;
                        const isSubCollapsed = collapsedSubcategories.has(subId);

                        return (
                          <React.Fragment key={subId}>
                            <SubCategoryRow
                              subcategory={subcategory}
                              isExpanded={!isSubCollapsed}
                              onToggle={() => toggleSubCategory(subId)}
                              itemCount={subItems.length}
                            />
                            {!isSubCollapsed &&
                              subItems.map((item) => {
                                const isEven = rowIndex % 2 === 0;
                                rowIndex++;
                                return (
                                  <ServiceItemRow
                                    key={item._id}
                                    item={item}
                                    isAdmin={isAdmin}
                                    isEven={isEven}
                                    hasSubcategory={!!subcategory}
                                    pricingSettings={pricingSettings ?? null}
                                    partnerMultiplier={partnerMultiplier}
                                    onEdit={handleEdit}
                                    onArchive={handleArchive}
                                  />
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ServicePriceListSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        item={selectedItem}
        isAdmin={isAdmin}
      />
    </div>
  );
}
