"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  FileText,
  SearchX,
  Plus,
  Settings2,
  Layers,
  Tag,
  FolderTree,
  Table as TableIcon,
  Filter,
} from "lucide-react";
import { PageHeader, Input, Button, Card, Badge } from "@crm/ui";
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
import CategoryManagerModal from "./CategoryManagerModal";

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
  const [showMatrixView, setShowMatrixView] = useState(false); // Matrix view toggle for detailed multiplier columns
  const [partnerMultiplier, setPartnerMultiplier] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  // Expanded states (by default, everything is expanded, we track collapsed)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedSubcategories, setCollapsedSubcategories] = useState<Set<string>>(
    new Set(),
  );

  // Modals state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ServicePriceListItem | null>(null);

  // Event listener for global "open-new-service-item"
  useEffect(() => {
    const handleOpenNew = () => {
      setSelectedItem(null);
      setIsSheetOpen(true);
    };
    window.addEventListener("open-new-service-item", handleOpenNew);
    document.addEventListener("open-new-service-item", handleOpenNew);
    return () => {
      window.removeEventListener("open-new-service-item", handleOpenNew);
      document.removeEventListener("open-new-service-item", handleOpenNew);
    };
  }, []);

  // Data fetching
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const res = await fetch("/api/service-categories");
      if (!res.ok) throw new Error("Kategóriák lekérése sikertelen");
      return res.json();
    },
    initialData: initialCategories,
  });

  const { data: subcategories = [] } = useQuery<ServiceSubCategory[]>({
    queryKey: ["service-subcategories"],
    queryFn: async () => {
      const res = await fetch("/api/service-subcategories");
      if (!res.ok) throw new Error("Alkategóriák lekérése sikertelen");
      return res.json();
    },
    initialData: initialSubcategories,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<ServicePriceListItem[]>({
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

  const { data: pricingSettings } = useQuery<PricingSettings | null>({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/pricing");
      if (!res.ok) throw new Error("Beállítások lekérése sikertelen");
      return res.json();
    },
    initialData: initialPricingSettings,
  });

  // KPI stats
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i: ServicePriceListItem) => !i.is_archived).length;
    const catCount = categories.filter((c: ServiceCategory) => c.is_active).length;
    return { total, active, catCount };
  }, [items, categories]);

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

      // Root items
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
    <div className="flex flex-col gap-6 pb-20">
      {/* ── Page Header ── */}
      <PageHeader
        title="Szolgáltatás Árlista"
        subtitle="Vállalati szolgáltatások, belső óradíjak és dinamikus árképzési tételek"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>
              <Settings2 size={16} className="mr-2" />
              Kategóriák kezelése
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedItem(null);
                setIsSheetOpen(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              Új tétel
            </Button>
          </div>
        }
      />

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="p-5 flex items-center justify-between transition-all hover:-translate-y-0.5"
          style={{ border: "1px solid var(--color-border-default, #222)" }}
        >
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Összes Tétel
            </span>
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <Layers size={20} />
          </div>
        </Card>

        <Card
          className="p-5 flex items-center justify-between transition-all hover:-translate-y-0.5"
          style={{ border: "1px solid var(--color-border-default, #222)" }}
        >
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Aktív Tételek
            </span>
            <span className="text-2xl font-bold text-foreground">{stats.active}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Tag size={20} />
          </div>
        </Card>

        <Card
          className="p-5 flex items-center justify-between transition-all hover:-translate-y-0.5"
          style={{ border: "1px solid var(--color-border-default, #222)" }}
        >
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Kategóriák
            </span>
            <span className="text-2xl font-bold text-foreground">{stats.catCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <FolderTree size={20} />
          </div>
        </Card>
      </div>

      {/* ── Szűrő- és Vezérlősáv ── */}
      <Card className="p-4 flex flex-col gap-4 border border-border">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keresés */}
          <div className="flex-1 min-w-[260px] relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              label=""
              placeholder="Keresés név, SKU vagy leírás alapján..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Kategória szűrő */}
          <div className="w-[180px]">
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

          {/* Árképzés típus szűrő */}
          <div className="w-[160px]">
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

          {/* Partner árai szűrő */}
          <PartnerPricePanel
            pricingSettings={pricingSettings ?? null}
            onPartnerSelect={(mult: number | null, name: string | null) => {
              setPartnerMultiplier(mult);
              setPartnerName(name);
            }}
          />

          {/* Mátrix nézet kapcsoló */}
          <Button
            variant={showMatrixView ? "primary" : "secondary"}
            onClick={() => setShowMatrixView(!showMatrixView)}
            className="h-10 px-3 flex items-center gap-1.5"
            title="Összes ügyfél-szorzó oszlop megjelenítése"
          >
            <TableIcon size={15} />
            <span className="text-xs font-semibold whitespace-nowrap">
              {showMatrixView ? "Kompakt nézet" : "Mátrix nézet"}
            </span>
          </Button>

          {/* Archiváltak kapcsoló */}
          <div className="flex items-center gap-2 h-10 px-2">
            <input
              type="checkbox"
              id="show-archived-check"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
            />
            <label
              htmlFor="show-archived-check"
              className="text-xs font-semibold text-muted-foreground cursor-pointer whitespace-nowrap select-none"
            >
              Archiváltak
            </label>
          </div>
        </div>

        {/* Aktív szűrők pillsek */}
        {(filterCategory ||
          filterPricingType ||
          search ||
          partnerMultiplier !== null) && (
          <div className="flex items-center justify-between pt-3 border-t border-border flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">
                Aktív szűrők:
              </span>
              {filterCategory && (
                <Badge variant="info">
                  Kategória:{" "}
                  {
                    categories.find((c: ServiceCategory) => c._id === filterCategory)
                      ?.name
                  }
                  <button
                    onClick={() => setFilterCategory("")}
                    className="ml-1.5 font-bold hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filterPricingType && (
                <Badge variant="default">
                  Típus: {filterPricingType}
                  <button
                    onClick={() => setFilterPricingType("")}
                    className="ml-1.5 font-bold hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {partnerName && (
                <Badge variant="success">
                  Partner: {partnerName} (×{partnerMultiplier})
                  <button
                    onClick={() => {
                      setPartnerMultiplier(null);
                      setPartnerName(null);
                    }}
                    className="ml-1.5 font-bold hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Szűrők törlése
            </Button>
          </div>
        )}
      </Card>

      {/* ── Táblázat ── */}
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="min-w-[900px] w-full">
          {/* Fejléc sor */}
          <div className="flex items-center border-b border-border bg-muted/40 px-4 py-3 sticky top-0 z-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {/* Collapse nyíl helye */}
            <div className="w-[28px] flex-shrink-0" />

            {/* Cikkszám */}
            <div className="w-[110px] flex-shrink-0">Cikkszám</div>

            {/* Megnevezés */}
            <div className="flex-1 min-w-[200px]">Megnevezés</div>

            {/* Egység */}
            <div className="w-[70px] flex-shrink-0 text-center">Egység</div>

            {/* Típus */}
            <div className="w-[120px] flex-shrink-0 text-center">Típus</div>

            {/* Belső alapár (admin only) */}
            {isAdmin && (
              <div className="w-[110px] flex-shrink-0 text-right">Belső ár</div>
            )}

            {/* KKV Eseti – Fő Eladási Ár (Alapár) */}
            <div className="w-[120px] flex-shrink-0 text-right text-emerald-400 font-bold">
              Eladási ár (nettó)
              <span className="block text-[9px] font-normal text-muted-foreground/70 normal-case mt-0.5">
                KKV Eseti (×{getMult("smb_occasional")})
              </span>
            </div>

            {/* Mátrix nézetben megjelenő extra oszlopok */}
            {showMatrixView && (
              <>
                <div className="w-[100px] flex-shrink-0 text-right">
                  KKV 1 Év
                  <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                    ×{getMult("smb_1year")}
                  </span>
                </div>
                <div className="w-[100px] flex-shrink-0 text-right">
                  KKV 2 Év
                  <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                    ×{getMult("smb_2year")}
                  </span>
                </div>
                <div className="w-[105px] flex-shrink-0 text-right">
                  Nagyvállalat
                  <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                    ×{getMult("enterprise")}
                  </span>
                </div>
                <div className="w-[105px] flex-shrink-0 text-right">
                  Magánszemély
                  <span className="block text-[9px] font-normal text-muted-foreground/60 mt-0.5">
                    ×{getMult("individual")}
                  </span>
                </div>
              </>
            )}

            {/* Partner ára (dinamikus ha van kiválasztva partner) */}
            {partnerMultiplier !== null && (
              <div className="w-[120px] flex-shrink-0 text-right text-red-500 font-bold">
                Partner ára
                <span className="block text-[9px] font-normal text-muted-foreground/70 normal-case mt-0.5">
                  ×
                  {partnerMultiplier.toLocaleString("hu-HU", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            {/* Megjegyzés */}
            <div className="w-[140px] flex-shrink-0 hidden md:block pl-3">Megjegyzés</div>

            {/* Műveletek */}
            <div className="w-[70px] flex-shrink-0 text-right pr-2">Műveletek</div>
          </div>

          {/* ── Tartalom ── */}
          {itemsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : initialItems.length === 0 ? (
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
            <div className="flex flex-col w-full divide-y divide-border/40">
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
                                    showMatrixView={showMatrixView}
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

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <ServicePriceListSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        item={selectedItem}
        isAdmin={isAdmin}
      />
    </div>
  );
}
