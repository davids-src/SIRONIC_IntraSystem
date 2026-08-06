"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { Button } from "./Button";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceListItemForPicker {
  _id: string;
  item_number: string;
  name: string;
  category: string; // free-form category ID from settings
  type: "product" | "service" | "labor" | "package";
  unit: string;
  net_price: number;
  is_active: boolean;
}

export interface ServiceItemForPicker {
  _id: string;
  sku?: string;
  name: string;
  description?: string | null;
  category_id: string;
  unit: string;
  pricing_type?: string;
  internal_base_price?: number | null;
}

export interface StockInfoForPicker {
  price_list_item_id: string;
  quantity_in_stock: number;
  warehouse_location?: string | null;
}

export interface ServiceCategoryForPicker {
  _id: string;
  name: string;
}

export interface ItemPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Termék árlista tételek */
  priceList: PriceListItemForPicker[];
  /** Szolgáltatás árlista tételek */
  servicePriceList: ServiceItemForPicker[];
  /** Kategórianevek a szolgáltatásoknál (ha rendelkezésre áll) */
  serviceCategories?: ServiceCategoryForPicker[];
  itemCategories?: Array<{ id: string; name: string }>;
  /** Raktárkészlet-adatok a termékekhez */
  stockItems?: StockInfoForPicker[];
  /** Csak aktív termékeket mutasson-e */
  onlyActive?: boolean;
  /** Visszahívás, ha terméket választottak */
  onSelectProduct: (item: PriceListItemForPicker) => void;
  /** Visszahívás, ha szolgáltatást választottak */
  onSelectService: (item: ServiceItemForPicker) => void;
  /** Módosítható felirat */
  title?: string;
  /** Kezdő tab */
  defaultTab?: "product" | "service";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtHuf = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

const ALL_KEY = "__all__";

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemPickerModal({
  open,
  onClose,
  priceList,
  servicePriceList,
  serviceCategories = [],
  itemCategories = [],
  stockItems = [],
  onlyActive = true,
  onSelectProduct,
  onSelectService,
  title = "Tétel hozzáadása",
  defaultTab = "product",
}: ItemPickerModalProps) {
  const [tab, setTab] = React.useState<"product" | "service">(defaultTab);
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>(ALL_KEY);

  // Reset on open/tab change
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedCategory(ALL_KEY);
      setTab(defaultTab);
    }
  }, [open, defaultTab]);

  React.useEffect(() => {
    setSearch("");
    setSelectedCategory(ALL_KEY);
  }, [tab]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const itemCategoryMap = new Map((itemCategories ?? []).map((c) => [c.id, c.name]));
  const getCategoryLabel = (catId: string) => {
    if (!catId) return "Hardver";
    if (itemCategoryMap.has(catId)) return itemCategoryMap.get(catId)!;
    if (catId.length > 20 && !catId.includes(" ")) return "Termék";
    return catId;
  };

  // ── Product logic ──────────────────────────────────────────────────────────
  const activeProducts = onlyActive ? priceList.filter((p) => p.is_active) : priceList;

  // Build unique category list sorted alphabetically
  const productCategories: { id: string; label: string; count: number }[] = (() => {
    const map = new Map<string, number>();
    for (const p of activeProducts) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, label: getCategoryLabel(id), count }))
      .sort((a, b) => a.label.localeCompare(b.label, "hu"));
  })();

  const filteredProducts = activeProducts.filter((p) => {
    const matchCat = selectedCategory === ALL_KEY || p.category === selectedCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q || p.name.toLowerCase().includes(q) || p.item_number.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  // ── Service logic ──────────────────────────────────────────────────────────
  const serviceCategoryMap = new Map(serviceCategories.map((c) => [c._id, c.name]));

  const serviceCategList: { id: string; label: string; count: number }[] = (() => {
    const map = new Map<string, number>();
    for (const s of servicePriceList) {
      map.set(s.category_id, (map.get(s.category_id) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([id, count]) => ({
        id,
        label: serviceCategoryMap.get(id) ?? id,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "hu"));
  })();

  const filteredServices = servicePriceList.filter((s) => {
    const matchCat = selectedCategory === ALL_KEY || s.category_id === selectedCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.sku ?? "").toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const categories = tab === "product" ? productCategories : serviceCategList;
  const totalCount = tab === "product" ? activeProducts.length : servicePriceList.length;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.72)",
    backdropFilter: "blur(4px)",
    zIndex: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  };

  const dialogStyle: React.CSSProperties = {
    background: colors.bg.card,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.lg,
    width: "100%",
    maxWidth: "860px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px",
    borderRadius: radius.sm,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
    background: active ? colors.accent.primary : "transparent",
    color: active ? "#fff" : colors.text.secondary,
    transition: "background 0.15s, color 0.15s",
  });

  const catBtnStyle = (active: boolean): React.CSSProperties => ({
    width: "100%",
    textAlign: "left",
    padding: "7px 12px",
    borderRadius: radius.sm,
    border: "none",
    cursor: "pointer",
    fontSize: "0.8125rem",
    fontWeight: active ? 600 : 400,
    background: active ? colors.accent.badgeBg : "transparent",
    color: active ? colors.accent.primary : colors.text.secondary,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    transition: "background 0.12s, color 0.12s",
  });

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={dialogStyle} role="dialog" aria-modal="true" aria-label={title}>
        {/* ─ Header ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            borderBottom: `1px solid ${colors.border.default}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 700,
                color: colors.text.primary,
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Bezárás"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.text.secondary,
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: "4px 8px",
                borderRadius: radius.sm,
              }}
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              style={tabBtnStyle(tab === "product")}
              onClick={() => setTab("product")}
            >
              📦 Termékek
            </button>
            <button
              style={tabBtnStyle(tab === "service")}
              onClick={() => setTab("service")}
            >
              🔧 Szolgáltatások
            </button>
          </div>

          {/* Search */}
          <div
            style={{
              position: "relative",
              paddingBottom: "16px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-60%)",
                color: colors.text.muted,
                fontSize: "0.9rem",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder={
                tab === "product"
                  ? "Keresés névben vagy cikkszámban…"
                  : "Keresés névben vagy SKU-ban…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 12px 8px 36px",
                borderRadius: radius.sm,
                border: `1px solid ${colors.border.default}`,
                background: colors.bg.secondary,
                color: colors.text.primary,
                fontSize: "0.875rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* ─ Body ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left: category list */}
          <div
            style={{
              width: "240px",
              minWidth: "220px",
              flexShrink: 0,
              borderRight: `1px solid ${colors.border.default}`,
              overflowY: "auto",
              padding: "12px 8px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <p
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: colors.text.muted,
                padding: "0 4px",
                marginBottom: "6px",
              }}
            >
              Kategóriák
            </p>

            {/* All */}
            <button
              style={catBtnStyle(selectedCategory === ALL_KEY)}
              onClick={() => setSelectedCategory(ALL_KEY)}
            >
              <span>Összes</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  background: colors.border.default,
                  padding: "1px 7px",
                  borderRadius: radius.pill,
                  color: colors.text.secondary,
                }}
              >
                {totalCount}
              </span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                style={catBtnStyle(selectedCategory === cat.id)}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span
                  style={{
                    flex: 1,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: 1.3,
                    paddingRight: "4px",
                  }}
                >
                  {cat.label}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    background: colors.border.default,
                    padding: "1px 7px",
                    borderRadius: radius.pill,
                    color: colors.text.secondary,
                    flexShrink: 0,
                  }}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Right: item list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {tab === "product" && (
              <>
                {filteredProducts.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: colors.text.muted,
                      padding: "40px 20px",
                      fontSize: "0.875rem",
                    }}
                  >
                    Nincs találat a megadott szűrőkre.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {filteredProducts.map((p) => {
                      const stockInfo = stockItems.find(
                        (s) => s.price_list_item_id === p._id,
                      );
                      const stockQty = stockInfo?.quantity_in_stock ?? null;
                      const location = stockInfo?.warehouse_location;
                      const isProduct = p.type === "product";

                      return (
                        <div
                          key={p._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            padding: "12px 14px",
                            border: `1px solid ${colors.border.default}`,
                            borderRadius: radius.md,
                            background: colors.bg.secondary,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                color: colors.text.primary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {p.name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: colors.text.secondary,
                                marginTop: "3px",
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ color: colors.text.muted }}>
                                {p.item_number}
                              </span>
                              <span>·</span>
                              <span
                                style={{ fontWeight: 600, color: colors.text.primary }}
                              >
                                {fmtHuf(p.net_price)} / {p.unit}
                              </span>
                              {isProduct && stockQty !== null && (
                                <>
                                  <span>·</span>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color:
                                        stockQty > 0
                                          ? colors.status.success
                                          : colors.status.error,
                                    }}
                                  >
                                    {stockQty > 0
                                      ? `${stockQty} ${p.unit} készleten`
                                      : "Nincs készleten"}
                                    {location ? ` (${location})` : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              onSelectProduct(p);
                              onClose();
                            }}
                          >
                            + Hozzáad
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {tab === "service" && (
              <>
                {filteredServices.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: colors.text.muted,
                      padding: "40px 20px",
                      fontSize: "0.875rem",
                    }}
                  >
                    Nincs találat a megadott szűrőkre.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {filteredServices.map((s) => {
                      const catName =
                        serviceCategoryMap.get(s.category_id) ?? s.category_id;
                      return (
                        <div
                          key={s._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            padding: "12px 14px",
                            border: `1px solid ${colors.border.default}`,
                            borderRadius: radius.md,
                            background: colors.bg.secondary,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                color: colors.text.primary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {s.name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: colors.text.secondary,
                                marginTop: "3px",
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              {s.sku && (
                                <>
                                  <span style={{ color: colors.text.muted }}>
                                    {s.sku}
                                  </span>
                                  <span>·</span>
                                </>
                              )}
                              <span
                                style={{
                                  background: colors.accent.badgeBg,
                                  color: colors.accent.primary,
                                  padding: "1px 8px",
                                  borderRadius: radius.pill,
                                  fontWeight: 600,
                                  fontSize: "0.6875rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                {catName}
                              </span>
                              {s.description && (
                                <span
                                  style={{
                                    color: colors.text.muted,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "260px",
                                  }}
                                >
                                  {s.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              onSelectService(s);
                              onClose();
                            }}
                          >
                            + Hozzáad
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─ Footer ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: `1px solid ${colors.border.default}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "0.8125rem", color: colors.text.muted }}>
            {tab === "product"
              ? `${filteredProducts.length} termék megjelenítve`
              : `${filteredServices.length} szolgáltatás megjelenítve`}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bezárás
          </Button>
        </div>
      </div>
    </div>
  );
}
