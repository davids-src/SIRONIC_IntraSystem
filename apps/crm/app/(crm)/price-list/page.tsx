"use client";

import { PageHeader, Card, Badge, Button, Input } from "@crm/ui";
import {
  Search,
  Plus,
  Filter,
  Tag,
  Layers,
  Server,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Building2,
  Hash,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { PriceListItem, Settings, ItemCategory, Supplier } from "@crm/types";
import { apiJsonBody } from "@/lib/api-client";

interface PurchaseRecord {
  _id: string;
  supplier_name: string;
  supplier_item_number: string | null;
  net_purchase_price: number;
  purchased_at: Date;
  notes: string | null;
}

interface PriceItem {
  _id: string;
  code: string;
  name: string;
  category: "hardware" | "software" | "service" | "license";
  unit: string;
  unit_price: number;
  tax_percent: number;
  description: string;
  status: "active" | "archived";
  purchase_records: PurchaseRecord[];
  last_purchase_price: number | null;
  preferred_supplier: string | null;
  rawCategory?: string;
  rawType?: string;
  is_archived: boolean;
  archive_reason: string | null;
}

function mapPriceListItem(p: PriceListItem): PriceItem {
  const category: PriceItem["category"] =
    p.type === "product" || p.type === "package" ? "hardware" : "service";
  return {
    _id: p._id,
    code: p.item_number,
    name: p.name,
    category,
    unit: p.unit,
    unit_price: p.net_price,
    tax_percent: p.tax_rate,
    description: p.description ?? "",
    status: p.is_active ? "active" : "archived",
    purchase_records: (p.purchase_records ?? []).map((pr) => ({
      ...pr,
      purchased_at: new Date(pr.purchased_at as unknown as string),
    })),
    last_purchase_price: p.last_purchase_price,
    preferred_supplier: p.preferred_supplier,
    rawCategory: p.category,
    rawType: p.type,
    is_archived: p.is_archived ?? false,
    archive_reason: p.archive_reason ?? null,
  };
}

const categoryVariant = {
  hardware: "default",
  software: "info",
  service: "warning",
  license: "success",
} as const;

const categoryLabel = {
  hardware: "Hardver",
  software: "Szoftver",
  service: "Szolgáltatás",
  license: "Licenc",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function PriceListPage() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});

  // Modal states
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<PriceItem | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState<PriceItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Filter and Sorting states
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStock, setFilterStock] = useState<string>("all"); // "all" | "in-stock" | "out-of-stock"
  const [filterSupplier, setFilterSupplier] = useState<string>("");
  const [filterMinPrice, setFilterMinPrice] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name-asc");

  // Edit Item Form
  const [editItemForm, setEditItemForm] = useState({
    name: "",
    category: "",
    type: "product" as "product" | "service" | "labor" | "package",
    unit: "db",
    net_price: 0,
    tax_rate: 27,
    description: "",
    is_active: true,
  });

  // New Item Form
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    type: "product",
    unit: "db",
    net_price: 0,
    tax_rate: 27,
    description: "",
    currency: "HUF",
  });

  // New Purchase Form
  const [newPurchase, setNewPurchase] = useState({
    supplier_id: "",
    supplier_item_number: "",
    net_purchase_price: 0,
    notes: "",
  });

  // Usage History
  const [usageHistory, setUsageHistory] = useState<Record<string, any[]>>({});
  const [loadingUsage, setLoadingUsage] = useState<string | null>(null);

  const loadUsage = async (id: string) => {
    if (usageHistory[id]) return;
    setLoadingUsage(id);
    try {
      const res = await fetch(`/api/price-list/${id}/usage`);
      if (res.ok) {
        const data = await res.json();
        setUsageHistory((prev) => ({ ...prev, [id]: data.offers || [] }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsage(null);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/price-list", { signal: ac.signal });
        if (!r.ok) {
          setLoadError("Az árlista nem elérhető.");
          return;
        }
        const data = (await r.json()) as PriceListItem[];
        setPrices(data.map(mapPriceListItem));

        // Fetch settings for categories
        const rSet = await fetch("/api/settings", { signal: ac.signal });
        if (rSet.ok) {
          const s = (await rSet.json()) as Settings;
          if (s.item_categories) setCategories(s.item_categories);
        }

        const rSup = await fetch("/api/suppliers", { signal: ac.signal });
        if (rSup.ok) {
          const supData = (await rSup.json()) as Supplier[];
          setSuppliers(supData);
        }

        // Fetch stock data
        const rStock = await fetch("/api/warehouse/stock", { signal: ac.signal });
        if (rStock.ok) {
          const stockData = await rStock.json();
          const stockMap: Record<string, number> = {};
          for (const s of stockData) {
            stockMap[s.price_list_item_id] = s.quantity_in_stock;
          }
          setStock(stockMap);
        }
      } catch {
        if (!ac.signal.aborted) {
          setLoadError("Az árlista nem elérhető.");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const uniquePreferredSuppliers = Array.from(
    new Set(prices.map((p) => p.preferred_supplier).filter(Boolean)),
  ) as string[];

  const filtered = prices
    .filter((p) => {
      // Archive filter
      if (!showArchived && p.is_archived) return false;

      // Category filter
      if (filterCategory) {
        if (p.rawCategory !== filterCategory && p.category !== filterCategory) {
          return false;
        }
      }

      // Type filter
      if (filterType && p.rawType !== filterType) return false;

      // Stock filter
      if (filterStock !== "all") {
        const stockQty = stock[p._id] ?? 0;
        if (filterStock === "in-stock" && stockQty <= 0) return false;
        if (filterStock === "out-of-stock" && stockQty > 0) return false;
      }

      // Supplier filter
      if (filterSupplier && p.preferred_supplier !== filterSupplier) return false;

      // Price range filter
      if (filterMinPrice && p.unit_price < Number(filterMinPrice)) return false;
      if (filterMaxPrice && p.unit_price > Number(filterMaxPrice)) return false;

      // Advanced text search: split by space, all terms must match name, code, category label, supplier, or description.
      if (search.trim()) {
        const searchTerms = search.toLowerCase().trim().split(/\s+/);
        const nameText = p.name.toLowerCase();
        const codeText = p.code.toLowerCase();
        const categoryText = (categoryLabel[p.category] || "").toLowerCase();
        const descText = p.description.toLowerCase();
        const supplierText = (p.preferred_supplier || "").toLowerCase();

        return searchTerms.every(
          (term) =>
            nameText.includes(term) ||
            codeText.includes(term) ||
            categoryText.includes(term) ||
            descText.includes(term) ||
            supplierText.includes(term),
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name, "hu-HU");
      }
      if (sortBy === "name-desc") {
        return b.name.localeCompare(a.name, "hu-HU");
      }
      if (sortBy === "price-asc") {
        return a.unit_price - b.unit_price;
      }
      if (sortBy === "price-desc") {
        return b.unit_price - a.unit_price;
      }
      if (sortBy === "code-asc") {
        return a.code.localeCompare(b.code);
      }
      if (sortBy === "stock-desc") {
        const stockA = stock[a._id] ?? 0;
        const stockB = stock[b._id] ?? 0;
        return stockB - stockA;
      }
      return 0;
    });

  const counts = {
    total: prices.filter((p) => !p.is_archived).length,
    active: prices.filter((p) => !p.is_archived && p.status === "active").length,
    services: prices.filter((p) => !p.is_archived && p.category === "service").length,
  };

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const margin = (item: PriceItem) => {
    if (!item.last_purchase_price) return null;
    const pct = Math.round(
      ((item.unit_price - item.last_purchase_price) / item.unit_price) * 100,
    );
    return pct;
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...newItem, description: newItem.description.trim() || null };
      const res = await apiJsonBody("/api/price-list", "POST", payload);
      if (res && typeof res === "object" && "_id" in res) {
        setPrices((prev) => [...prev, mapPriceListItem(res as PriceListItem)]);
        setShowNewItemModal(false);
        setNewItem({
          name: "",
          category: "",
          type: "product",
          unit: "db",
          net_price: 0,
          tax_rate: 27,
          description: "",
          currency: "HUF",
        });
      }
    } catch (e) {
      console.error(e);
      alert("Hiba történt a mentés során.");
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showNewPurchaseModal) return;
    try {
      const selectedSupplier = suppliers.find((s) => s._id === newPurchase.supplier_id);
      const res = await apiJsonBody(
        `/api/price-list/${showNewPurchaseModal}/purchase-records`,
        "POST",
        {
          supplier_name: selectedSupplier?.name ?? newPurchase.supplier_id,
          supplier_item_number: newPurchase.supplier_item_number || null,
          net_purchase_price: newPurchase.net_purchase_price,
          notes: newPurchase.notes || null,
          purchased_at: new Date().toISOString(),
        },
      );
      if (res && typeof res === "object" && "_id" in res) {
        setPrices((prev) =>
          prev.map((p) =>
            p._id === showNewPurchaseModal ? mapPriceListItem(res as PriceListItem) : p,
          ),
        );
        setShowNewPurchaseModal(null);
        setNewPurchase({
          supplier_id: "",
          supplier_item_number: "",
          net_purchase_price: 0,
          notes: "",
        });
      }
    } catch (e) {
      console.error(e);
      alert("Hiba történt a mentés során.");
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      const payload = {
        name: editItemForm.name.trim(),
        category: editItemForm.category,
        type: editItemForm.type,
        unit: editItemForm.unit.trim(),
        net_price: editItemForm.net_price,
        tax_rate: editItemForm.tax_rate,
        description: editItemForm.description.trim() || null,
        is_active: editItemForm.is_active,
      };

      const res = await apiJsonBody(
        `/api/price-list/${showEditModal._id}`,
        "PATCH",
        payload,
      );
      if (res && typeof res === "object" && "_id" in res) {
        setPrices((prev) =>
          prev.map((p) =>
            p._id === showEditModal._id ? mapPriceListItem(res as PriceListItem) : p,
          ),
        );
        setShowEditModal(null);
      }
    } catch (e) {
      console.error(e);
      alert("Hiba történt a mentés során.");
    }
  };

  const handleArchiveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showArchiveModal || !archiveReason.trim()) return;
    try {
      const res = await apiJsonBody(`/api/price-list/${showArchiveModal._id}`, "PATCH", {
        is_archived: true,
        archived_at: new Date().toISOString(),
        archive_reason: archiveReason.trim(),
      });
      if (res && typeof res === "object" && "_id" in res) {
        setPrices((prev) =>
          prev.map((p) =>
            p._id === showArchiveModal._id ? mapPriceListItem(res as PriceListItem) : p,
          ),
        );
        setShowArchiveModal(null);
        setArchiveReason("");
      }
    } catch (e) {
      console.error(e);
      alert("Hiba történt az archiválás során.");
    }
  };

  const handleRestoreItem = async (item: PriceItem) => {
    if (!confirm("Biztosan visszaállítod ezt a tételt az archívumból?")) return;
    try {
      const res = await apiJsonBody(`/api/price-list/${item._id}`, "PATCH", {
        is_archived: false,
        archived_at: null,
        archive_reason: null,
      });
      if (res && typeof res === "object" && "_id" in res) {
        setPrices((prev) =>
          prev.map((p) =>
            p._id === item._id ? mapPriceListItem(res as PriceListItem) : p,
          ),
        );
      }
    } catch (e) {
      console.error(e);
      alert("Hiba történt a visszaállítás során.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Árlista"
        subtitle="Szolgáltatások, hardverek és licencek alapárai ajánlatkészítéshez"
        actions={
          <Button variant="primary" onClick={() => setShowNewItemModal(true)}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új tétel
          </Button>
        }
      />

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      {/* Stat kártyák */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          {
            label: "Összes tétel",
            count: counts.total,
            icon: <Layers size={16} />,
            color: "#6b7280",
            onClick: () => {
              setFilterCategory("");
              setFilterType("");
              setFilterStock("all");
              setFilterSupplier("");
              setFilterMinPrice("");
              setFilterMaxPrice("");
              setShowArchived(false);
            },
          },
          {
            label: "Aktív tételek",
            count: counts.active,
            icon: <Tag size={16} />,
            color: "#22c55e",
            onClick: () => {
              setFilterCategory("");
              setFilterType("");
              setShowArchived(false);
            },
          },
          {
            label: "Szolgáltatások",
            count: counts.services,
            icon: <Server size={16} />,
            color: "#f59e0b",
            onClick: () => {
              setFilterCategory("service");
              setShowArchived(false);
            },
          },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              font: "inherit",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <Card
              className="p-5"
              style={{
                height: "100%",
                transition: "all 0.2s ease-in-out",
                border: "1px solid var(--color-border-default, #222)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = stat.color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 4px 12px ${stat.color}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default, #222)";
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--color-text-muted, #555)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.label}
                </span>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "var(--color-text-primary, #fff)",
                  lineHeight: 1,
                }}
              >
                {stat.count}
              </div>
            </Card>
          </button>
        ))}
      </div>

      {/* Kereső és Szűrők */}
      {(() => {
        const hasActiveFilters =
          !!filterCategory ||
          !!filterType ||
          filterStock !== "all" ||
          !!filterSupplier ||
          !!filterMinPrice ||
          !!filterMaxPrice;
        const activeFiltersCount =
          (filterCategory ? 1 : 0) +
          (filterType ? 1 : 0) +
          (filterStock !== "all" ? 1 : 0) +
          (filterSupplier ? 1 : 0) +
          (filterMinPrice || filterMaxPrice ? 1 : 0);

        return (
          <Card
            className="p-5"
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {/* Keresőmező */}
              <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-muted, #555)",
                    pointerEvents: "none",
                  }}
                />
                <Input
                  label=""
                  placeholder="Keresés cikkszám, megnevezés, leírás vagy beszállító szerint..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                />
              </div>

              {/* Rendezés */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  Rendezés:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border-subtle, #222)",
                    background: "var(--color-bg-input, #111)",
                    color: "inherit",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  <option value="name-asc">Név (A-Z)</option>
                  <option value="name-desc">Név (Z-A)</option>
                  <option value="price-asc">Nettó ár (alacsony → magas)</option>
                  <option value="price-desc">Nettó ár (magas → alacsony)</option>
                  <option value="code-asc">Cikkszám (A-Z)</option>
                  <option value="stock-desc">Készleten lévő (több → kevesebb)</option>
                </select>
              </div>

              {/* Archiváltak kapcsoló */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="checkbox"
                  id="show-archived-toggle"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "var(--color-accent)",
                    cursor: "pointer",
                  }}
                />
                <label
                  htmlFor="show-archived-toggle"
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Archiváltak
                </label>
              </div>

              {/* Szűrők gomb */}
              <Button
                variant={showFilters || hasActiveFilters ? "primary" : "secondary"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={15} style={{ marginRight: "6px" }} />
                Szűrők {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
            </div>

            {/* Szűrő panel kinyitva */}
            {showFilters && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--color-border-subtle, #222)",
                }}
              >
                {/* Kategória szűrő */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Kategória
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle, #222)",
                      background: "var(--color-bg-input, #111)",
                      color: "inherit",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Mindegyik kategória</option>
                    <option value="hardware">Hardver (Alap)</option>
                    <option value="service">Szolgáltatás (Alap)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Típus szűrő */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Típus
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle, #222)",
                      background: "var(--color-bg-input, #111)",
                      color: "inherit",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Mindegyik típus</option>
                    <option value="product">Termék</option>
                    <option value="service">Szolgáltatás</option>
                    <option value="labor">Munkadíj</option>
                    <option value="package">Csomag</option>
                  </select>
                </div>

                {/* Raktárkészlet szűrő */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Készlet állapota
                  </label>
                  <select
                    value={filterStock}
                    onChange={(e) => setFilterStock(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle, #222)",
                      background: "var(--color-bg-input, #111)",
                      color: "inherit",
                      fontSize: "14px",
                    }}
                  >
                    <option value="all">Mindegyik tétel</option>
                    <option value="in-stock">Csak készleten lévő (&gt; 0 db)</option>
                    <option value="out-of-stock">
                      Nincs készleten (0 db vagy virtuális)
                    </option>
                  </select>
                </div>

                {/* Beszállító szűrő */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Preferált beszállító
                  </label>
                  <select
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle, #222)",
                      background: "var(--color-bg-input, #111)",
                      color: "inherit",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">Mindegyik beszállító</option>
                    {uniquePreferredSuppliers.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nettó ár szűrő */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    gridColumn: "span 2",
                  }}
                >
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Nettó eladási ár-tartomány (HUF)
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Input
                      type="number"
                      placeholder="Minimum ár"
                      value={filterMinPrice}
                      onChange={(e) => setFilterMinPrice(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: "var(--color-text-muted)" }}>—</span>
                    <Input
                      type="number"
                      placeholder="Maximum ár"
                      value={filterMaxPrice}
                      onChange={(e) => setFilterMaxPrice(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Aktív szűrők visszajelzése és törlése */}
            {hasActiveFilters && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--color-border-subtle, #222)",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    Aktív szűrők:
                  </span>

                  {filterCategory && (
                    <Badge variant="info">
                      Kategória:{" "}
                      {filterCategory in categoryLabel
                        ? categoryLabel[filterCategory as keyof typeof categoryLabel]
                        : categories.find((c) => c.id === filterCategory)?.name ||
                          filterCategory}
                      <button
                        onClick={() => setFilterCategory("")}
                        style={{
                          marginLeft: "6px",
                          border: "none",
                          background: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  )}

                  {filterType && (
                    <Badge variant="default">
                      Típus:{" "}
                      {filterType === "product"
                        ? "Termék"
                        : filterType === "service"
                          ? "Szolgáltatás"
                          : filterType === "labor"
                            ? "Munkadíj"
                            : filterType === "package"
                              ? "Csomag"
                              : filterType}
                      <button
                        onClick={() => setFilterType("")}
                        style={{
                          marginLeft: "6px",
                          border: "none",
                          background: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  )}

                  {filterStock !== "all" && (
                    <Badge variant="warning">
                      Készlet:{" "}
                      {filterStock === "in-stock" ? "Készleten van" : "Nincs készleten"}
                      <button
                        onClick={() => setFilterStock("all")}
                        style={{
                          marginLeft: "6px",
                          border: "none",
                          background: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  )}

                  {filterSupplier && (
                    <Badge variant="success">
                      Beszállító: {filterSupplier}
                      <button
                        onClick={() => setFilterSupplier("")}
                        style={{
                          marginLeft: "6px",
                          border: "none",
                          background: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  )}

                  {(filterMinPrice || filterMaxPrice) && (
                    <Badge variant="info">
                      Ár: {filterMinPrice ? fmt(Number(filterMinPrice)) : "0 Ft"} —{" "}
                      {filterMaxPrice ? fmt(Number(filterMaxPrice)) : "∞"}
                      <button
                        onClick={() => {
                          setFilterMinPrice("");
                          setFilterMaxPrice("");
                        }}
                        style={{
                          marginLeft: "6px",
                          border: "none",
                          background: "none",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilterCategory("");
                    setFilterType("");
                    setFilterStock("all");
                    setFilterSupplier("");
                    setFilterMinPrice("");
                    setFilterMaxPrice("");
                  }}
                  style={{
                    fontSize: "12px",
                    padding: "4px 8px",
                    color: "var(--color-status-error)",
                  }}
                >
                  Szűrők törlése
                </Button>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Árlista sorok – kattintható, expandable */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Fejléc */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 130px 110px 120px 120px 80px 40px",
            gap: "0 16px",
            padding: "10px 20px",
            background: "var(--color-bg-secondary, #111)",
            borderRadius: "10px 10px 0 0",
            border: "1px solid var(--color-border-default, #222)",
            borderBottom: "none",
          }}
        >
          {[
            "Cikkszám",
            "Megnevezés",
            "Kategória",
            "Mértékegység",
            "Eladási ár (nettó)",
            "Bszerz. ár (nettó)",
            "Készlet",
            "",
          ].map((h) => (
            <span
              key={h}
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--color-text-muted, #555)",
                whiteSpace: "nowrap",
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="p-8 text-center" style={{ borderRadius: "0 0 10px 10px" }}>
            <span style={{ color: "var(--color-text-muted, #555)" }}>
              Nincs találat a keresési feltételekre
            </span>
          </Card>
        )}

        {filtered.map((item, idx) => {
          const isExpanded = expandedId === item._id;
          const isLast = idx === filtered.length - 1;
          const marginPct = margin(item);

          return (
            <div key={item._id}>
              {/* Fő sor */}
              <button
                onClick={() => toggleExpand(item._id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 130px 110px 120px 120px 80px 40px",
                  gap: "0 16px",
                  padding: "18px 20px",
                  background: isExpanded
                    ? "var(--color-bg-card, #1a1a1a)"
                    : "var(--color-bg-card, #1a1a1a)",
                  border: "1px solid var(--color-border-default, #222)",
                  borderTop: "none",
                  borderRadius: isExpanded ? "0" : isLast ? "0 0 10px 10px" : "0",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background 0.12s",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--color-bg-card-hover, #1f1f1f)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--color-bg-card, #1a1a1a)";
                }}
              >
                {/* Cikkszám */}
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.78rem",
                    color: "var(--color-text-muted, #555)",
                  }}
                >
                  {item.code}
                </span>

                {/* Név + leírás */}
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {item.name}
                    {item.is_archived && <Badge variant="error">Archivált</Badge>}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--color-text-muted, #555)",
                      marginTop: "2px",
                    }}
                  >
                    {item.description}
                    {item.preferred_supplier && (
                      <span style={{ color: "var(--color-text-secondary, #a0a0a0)" }}>
                        {" "}
                        ·{" "}
                        <Building2
                          size={10}
                          style={{ display: "inline", verticalAlign: "middle" }}
                        />{" "}
                        {item.preferred_supplier}
                      </span>
                    )}
                  </div>
                </div>

                {/* Kategória */}
                <div>
                  <Badge variant={categoryVariant[item.category]}>
                    {categoryLabel[item.category]}
                  </Badge>
                </div>

                {/* M.egység */}
                <span
                  style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}
                >
                  {item.unit}
                </span>

                {/* Eladási ár */}
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {fmt(item.unit_price)}
                </span>

                {/* Bszerz. ár + margin */}
                <div>
                  {item.last_purchase_price ? (
                    <>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          color: "var(--color-text-secondary, #a0a0a0)",
                        }}
                      >
                        {fmt(item.last_purchase_price)}
                      </div>
                      {marginPct !== null && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color:
                              marginPct >= 40
                                ? "#22c55e"
                                : marginPct >= 20
                                  ? "#f59e0b"
                                  : "#e53935",
                            fontWeight: 600,
                          }}
                        >
                          {marginPct}% marzs
                        </div>
                      )}
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted, #555)",
                      }}
                    >
                      —
                    </span>
                  )}
                </div>

                {/* Készlet */}
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color:
                      stock[item._id] === undefined
                        ? "var(--color-text-muted, #555)"
                        : stock[item._id]! > 0
                          ? "#22c55e"
                          : "#e53935",
                  }}
                >
                  {stock[item._id] !== undefined
                    ? `${stock[item._id]} ${item.unit}`
                    : "—"}
                </span>

                {/* Expand ikon */}
                <div
                  style={{
                    color: "var(--color-text-muted, #555)",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expandált panel: Bszerz. előzmény */}
              {isExpanded && (
                <div
                  style={{
                    border: "1px solid var(--color-border-default, #222)",
                    borderTop: "none",
                    borderRadius: isLast ? "0 0 10px 10px" : "0",
                    background: "var(--color-bg-secondary, #111)",
                    padding: "20px 24px 24px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--color-text-muted, #555)",
                      }}
                    >
                      🔒 Bszerz. előzmény (csak CRM)
                    </h4>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button
                        variant="ghost"
                        style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                        onClick={() => {}}
                      >
                        <ShoppingCart size={13} style={{ marginRight: "5px" }} />
                        Ajánlathoz add
                      </Button>
                      <Button
                        variant="secondary"
                        style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                        onClick={() => setShowNewPurchaseModal(item._id)}
                      >
                        <Plus size={13} style={{ marginRight: "5px" }} />
                        Új bszerz. rögzítése
                      </Button>
                      <Button
                        variant="secondary"
                        style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                        onClick={() => {
                          setEditItemForm({
                            name: item.name,
                            category: item.rawCategory || "",
                            type: (item.rawType as any) || "product",
                            unit: item.unit,
                            net_price: item.unit_price,
                            tax_rate: item.tax_percent,
                            description: item.description,
                            is_active: item.status === "active",
                          });
                          setShowEditModal(item);
                        }}
                      >
                        Szerkesztés
                      </Button>
                      {item.is_archived ? (
                        <Button
                          variant="secondary"
                          style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                          onClick={() => handleRestoreItem(item)}
                        >
                          Visszaállítás
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          style={{
                            fontSize: "0.78rem",
                            padding: "4px 12px",
                            color: "var(--color-status-error)",
                          }}
                          onClick={() => {
                            setArchiveReason("");
                            setShowArchiveModal(item);
                          }}
                        >
                          Archiválás
                        </Button>
                      )}
                    </div>
                  </div>

                  {item.purchase_records.length === 0 ? (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted, #555)",
                        fontStyle: "italic",
                      }}
                    >
                      Még nincs rögzített bszerz. adat ehhez a tételhez.
                    </p>
                  ) : (
                    <div
                      style={{ display: "flex", flexDirection: "column", gap: "10px" }}
                    >
                      {/* Mini fejléc */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 160px 120px 120px",
                          gap: "0 16px",
                          padding: "6px 14px",
                          background: "var(--color-bg-card, #1a1a1a)",
                          borderRadius: "8px",
                        }}
                      >
                        {["Szállító", "Száll. cikkszám", "Nettó bszerz. ár", "Dátum"].map(
                          (h) => (
                            <span
                              key={h}
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: "var(--color-text-muted, #555)",
                              }}
                            >
                              {h}
                            </span>
                          ),
                        )}
                      </div>

                      {item.purchase_records.map((rec) => (
                        <div
                          key={rec._id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 160px 120px 120px",
                            gap: "0 16px",
                            padding: "12px 14px",
                            background: "var(--color-bg-card, #1a1a1a)",
                            borderRadius: "8px",
                            border: "1px solid var(--color-border-subtle, #1a1a1a)",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "8px" }}
                          >
                            <Building2
                              size={14}
                              style={{
                                color: "var(--color-text-muted, #555)",
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                              {rec.supplier_name}
                            </span>
                          </div>
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "6px" }}
                          >
                            <Hash
                              size={13}
                              style={{ color: "var(--color-text-muted, #555)" }}
                            />
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
                                color: "var(--color-text-secondary, #a0a0a0)",
                              }}
                            >
                              {rec.supplier_item_number ?? "—"}
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: "#22c55e",
                            }}
                          >
                            {fmt(rec.net_purchase_price)}
                          </span>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--color-text-muted, #555)",
                            }}
                          >
                            {new Date(rec.purchased_at).toLocaleDateString("hu-HU")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "24px",
                      borderTop: "1px solid var(--color-border-subtle)",
                      paddingTop: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        📄 Felhasználási előzmény
                      </h4>
                      {!usageHistory[item._id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadUsage(item._id)}
                          disabled={loadingUsage === item._id}
                        >
                          {loadingUsage === item._id ? "Betöltés..." : "Hol szerepel?"}
                        </Button>
                      )}
                    </div>

                    {(usageHistory[item._id] ?? []).length === 0 &&
                      usageHistory[item._id] && (
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--color-text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          Ez a tétel még nem szerepel egyetlen elmentett ajánlaton sem.
                        </p>
                      )}

                    {usageHistory[item._id] &&
                      (usageHistory[item._id]?.length ?? 0) > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          {(usageHistory[item._id] ?? []).map((offer: any) => (
                            <div
                              key={offer._id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                background: "var(--color-bg-card)",
                                borderRadius: "8px",
                                border: "1px solid var(--color-border-subtle)",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                                  <a
                                    href={`/offers/${offer._id}`}
                                    style={{
                                      color: "var(--color-accent)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {offer.offer_number}
                                  </a>
                                  <span
                                    style={{
                                      marginLeft: "8px",
                                      color: "var(--color-text-primary)",
                                    }}
                                  >
                                    {offer.title}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--color-text-muted)",
                                    marginTop: "4px",
                                  }}
                                >
                                  Létrehozva:{" "}
                                  {new Date(offer.created_at).toLocaleDateString("hu-HU")}
                                </div>
                              </div>
                              <Badge
                                variant={
                                  offer.status === "accepted"
                                    ? "success"
                                    : offer.status === "rejected"
                                      ? "error"
                                      : "info"
                                }
                              >
                                {offer.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal - Új tétel */}
      {showNewItemModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Card style={{ padding: "24px", width: "100%", maxWidth: "500px" }}>
            <h2 style={{ margin: "0 0 16px 0" }}>Új árlista tétel rögzítése</h2>
            <form
              onSubmit={handleCreateItem}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px" }}>Név</label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
              </div>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Kategória</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="input-base"
                    required
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--color-bg-input)",
                      color: "inherit",
                    }}
                  >
                    <option value="">Válassz kategóriát</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.prefix})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Típus</label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    className="input-base"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--color-bg-input)",
                      color: "inherit",
                    }}
                  >
                    <option value="product">Termék (Hardver)</option>
                    <option value="service">Szolgáltatás</option>
                    <option value="labor">Munkadíj</option>
                    <option value="package">Csomag</option>
                  </select>
                </div>
              </div>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Eladási ár (Nettó)</label>
                  <Input
                    type="number"
                    value={newItem.net_price.toString()}
                    onChange={(e) =>
                      setNewItem({ ...newItem, net_price: Number(e.target.value) })
                    }
                    required
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Mértékegység</label>
                  <Input
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px" }}>Leírás (Opcionális)</label>
                <Input
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewItemModal(false)}
                >
                  Mégse
                </Button>
                <Button type="submit" variant="primary">
                  Mentés
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal - Új beszerzés */}
      {showNewPurchaseModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Card style={{ padding: "24px", width: "100%", maxWidth: "500px" }}>
            <h2 style={{ margin: "0 0 16px 0" }}>Új beszerzés rögzítése</h2>
            <form
              onSubmit={handleCreatePurchase}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Beszállító</label>
                  <select
                    value={newPurchase.supplier_id}
                    onChange={(e) =>
                      setNewPurchase({ ...newPurchase, supplier_id: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-primary)",
                      fontSize: "14px",
                    }}
                  >
                    <option value="">— Válassz —</option>
                    {[...suppliers]
                      .sort((a, b) => a.name.localeCompare(b.name, "hu"))
                      .map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                  {suppliers.length === 0 && (
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      <a href="/suppliers/new" style={{ color: "var(--color-accent)" }}>
                        Adj hozzá beszállítót
                      </a>
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Beszállítói Cikkszám</label>
                  <Input
                    value={newPurchase.supplier_item_number}
                    onChange={(e) =>
                      setNewPurchase({
                        ...newPurchase,
                        supplier_item_number: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px" }}>Nettó beszerzési ár</label>
                <Input
                  type="number"
                  value={newPurchase.net_purchase_price.toString()}
                  onChange={(e) =>
                    setNewPurchase({
                      ...newPurchase,
                      net_purchase_price: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px" }}>Megjegyzés</label>
                <Input
                  value={newPurchase.notes}
                  onChange={(e) =>
                    setNewPurchase({ ...newPurchase, notes: e.target.value })
                  }
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewPurchaseModal(null)}
                >
                  Mégse
                </Button>
                <Button type="submit" variant="primary">
                  Rögzítés
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal - Szerkesztés */}
      {showEditModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Card style={{ padding: "24px", width: "100%", maxWidth: "550px" }}>
            <h2 style={{ margin: "0 0 16px 0" }}>
              Tétel szerkesztése ({showEditModal.code})
            </h2>
            <form
              onSubmit={handleEditItem}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px" }}>Név</label>
                <Input
                  value={editItemForm.name}
                  onChange={(e) =>
                    setEditItemForm({ ...editItemForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Kategória</label>
                  <select
                    value={editItemForm.category}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, category: e.target.value })
                    }
                    className="input-base"
                    required
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--color-bg-input)",
                      color: "inherit",
                    }}
                  >
                    <option value="">Válassz kategóriát</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.prefix})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Típus</label>
                  <select
                    value={editItemForm.type}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, type: e.target.value as any })
                    }
                    className="input-base"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--color-bg-input)",
                      color: "inherit",
                    }}
                  >
                    <option value="product">Termék (Hardver)</option>
                    <option value="service">Szolgáltatás</option>
                    <option value="labor">Munkadíj</option>
                    <option value="package">Csomag</option>
                  </select>
                </div>
              </div>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Eladási ár (Nettó)</label>
                  <Input
                    type="number"
                    value={editItemForm.net_price.toString()}
                    onChange={(e) =>
                      setEditItemForm({
                        ...editItemForm,
                        net_price: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Mértékegység</label>
                  <Input
                    value={editItemForm.unit}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, unit: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>ÁFA kulcs (%)</label>
                  <Input
                    type="number"
                    value={editItemForm.tax_rate.toString()}
                    onChange={(e) =>
                      setEditItemForm({
                        ...editItemForm,
                        tax_rate: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "14px" }}>Állapot</label>
                  <select
                    value={editItemForm.is_active ? "true" : "false"}
                    onChange={(e) =>
                      setEditItemForm({
                        ...editItemForm,
                        is_active: e.target.value === "true",
                      })
                    }
                    className="input-base"
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--color-bg-input)",
                      color: "inherit",
                    }}
                  >
                    <option value="true">Aktív</option>
                    <option value="false">Inaktív</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px" }}>Leírás (Opcionális)</label>
                <Input
                  value={editItemForm.description}
                  onChange={(e) =>
                    setEditItemForm({ ...editItemForm, description: e.target.value })
                  }
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditModal(null)}
                >
                  Mégse
                </Button>
                <Button type="submit" variant="primary">
                  Mentés
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal - Archiválás */}
      {showArchiveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Card style={{ padding: "24px", width: "100%", maxWidth: "450px" }}>
            <h2 style={{ margin: "0 0 16px 0" }}>Tétel archiválása</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
              }}
            >
              Biztosan archiválni szeretnéd a következő tételt:{" "}
              <strong>{showArchiveModal.name}</strong> ({showArchiveModal.code})?
              <br />
              Kérjük, add meg az archiválás indokát.
            </p>
            <form
              onSubmit={handleArchiveItem}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px" }}>Archiválás oka *</label>
                <Input
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Pl. Már nem forgalmazott termék, elavult típus..."
                  required
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowArchiveModal(null)}
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{
                    backgroundColor: "var(--color-status-error)",
                    borderColor: "var(--color-status-error)",
                  }}
                >
                  Archiválás
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
