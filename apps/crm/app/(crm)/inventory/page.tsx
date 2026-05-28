"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader, Card, Badge, Button, InputControl, Label } from "@crm/ui";
import {
  Search,
  Package,
  Plus,
  AlertTriangle,
  MapPin,
  ClipboardList,
  Edit2,
  Sliders,
  X,
  History,
  Building2,
} from "lucide-react";
import type {
  StockItemWithProduct,
  WarehouseLocation,
  StockTransaction,
  PriceListItem,
  Supplier,
  ItemCategory,
  Settings,
} from "@crm/types";

/** API-enriched transaction with product info */
interface StockTransactionWithProduct extends StockTransaction {
  product: { name: string; item_number: string; unit: string } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "locations" | "transactions">(
    "stock",
  );

  // Data States
  const [stockItems, setStockItems] = useState<StockItemWithProduct[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [transactions, setTransactions] = useState<StockTransactionWithProduct[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);

  // Filtering & Loading
  const [search, setSearch] = useState("");
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Modals visibility
  const [showManualReceiptModal, setShowManualReceiptModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<StockItemWithProduct | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState<StockItemWithProduct | null>(null);
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);

  // Form States - Manual Receipt
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [receiptQty, setReceiptQty] = useState(1);
  const [receiptLoc, setReceiptLoc] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  // Form States - Inline New Product registration
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodUnit, setProdUnit] = useState("db");
  const [prodSellingPrice, setProdSellingPrice] = useState(0);
  const [prodPurchasePrice, setProdPurchasePrice] = useState(0);
  const [prodSupplier, setProdSupplier] = useState("");

  // Form States - Adjust
  const [newQuantity, setNewQuantity] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState("");

  // Form States - Edit metadata
  const [editLocation, setEditLocation] = useState("");
  const [editThreshold, setEditThreshold] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState("");

  // Form States - New Location
  const [locCode, setLocCode] = useState("");
  const [locName, setLocName] = useState("");
  const [locDesc, setLocDesc] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Loaders
  const loadStock = useCallback(async () => {
    setLoadingStock(true);
    try {
      const res = await fetch("/api/warehouse/stock");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setStockItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStock(false);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const res = await fetch("/api/warehouse/locations");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLocations(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const res = await fetch("/api/warehouse/transactions");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTransactions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const loadMetadataOptions = useCallback(async () => {
    try {
      const [rPrice, rSup, rSet] = await Promise.all([
        fetch("/api/price-list"),
        fetch("/api/suppliers"),
        fetch("/api/settings"),
      ]);
      if (rPrice.ok) {
        const data = await rPrice.json();
        setPriceListItems(data.filter((p: PriceListItem) => p.is_active));
      }
      if (rSup.ok) {
        setSuppliers(await rSup.json());
      }
      if (rSet.ok) {
        const sData: Settings = await rSet.json();
        if (sData.item_categories) setCategories(sData.item_categories);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    void loadStock();
    void loadLocations();
    void loadMetadataOptions();
  }, [loadStock, loadLocations, loadMetadataOptions]);

  // Tab change triggers loaders
  useEffect(() => {
    if (activeTab === "stock") {
      void loadStock();
    } else if (activeTab === "locations") {
      void loadLocations();
    } else if (activeTab === "transactions") {
      void loadTransactions();
    }
  }, [activeTab, loadStock, loadLocations, loadTransactions]);

  // Handle Manual Stock-In Submission
  const handleManualReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let price_list_item_id = selectedProductId;

      if (isNewProduct) {
        // Step 1: Create Price List Item first
        const pr = prodSupplier
          ? [
              {
                supplier_name: prodSupplier,
                supplier_item_number: null,
                net_purchase_price: prodPurchasePrice,
                purchased_at: new Date().toISOString(),
                notes: "Kezdő raktári felvétel",
              },
            ]
          : [];

        const prodRes = await fetch("/api/price-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "product",
            name: prodName.trim(),
            category: prodCategory,
            unit: prodUnit.trim(),
            net_price: prodSellingPrice,
            currency: "HUF",
            tax_rate: 27,
            is_active: true,
            last_purchase_price: prodPurchasePrice || null,
            preferred_supplier: prodSupplier || null,
            purchase_records: pr,
          }),
        });

        if (!prodRes.ok) {
          const errData = await prodRes.json().catch(() => ({}));
          throw new Error(errData.error || "Hiba történt a termék regisztrálása során.");
        }

        const createdProd = await prodRes.json();
        price_list_item_id = createdProd._id;
      }

      if (!price_list_item_id) {
        throw new Error("Válassz ki egy terméket!");
      }

      // Step 2: Post to Stock receipt
      const res = await fetch("/api/warehouse/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_list_item_id,
          quantity: receiptQty,
          warehouse_location: receiptLoc || null,
          notes: receiptNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Nem sikerült bevételezni a készletet.");
      }

      alert("Sikeres bevételezés!");
      setShowManualReceiptModal(false);

      // Reset form
      setIsNewProduct(false);
      setSelectedProductId("");
      setReceiptQty(1);
      setReceiptLoc("");
      setReceiptNotes("");
      setProdName("");
      setProdCategory("");
      setProdUnit("db");
      setProdSellingPrice(0);
      setProdPurchasePrice(0);
      setProdSupplier("");

      // Reload
      void loadStock();
      void loadMetadataOptions();
    } catch (err: any) {
      alert(err.message || "Hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Adjustment Submission
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/warehouse/stock/${showAdjustModal.price_list_item_id}/adjust`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            new_quantity: newQuantity,
            notes: adjustNotes.trim() || null,
          }),
        },
      );

      if (!res.ok) throw new Error();
      alert("Leltári korrekció rögzítve!");
      setShowAdjustModal(null);
      void loadStock();
    } catch {
      alert("Hiba történt a korrekció során.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Metadata Submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/warehouse/stock/${showEditModal.price_list_item_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouse_location: editLocation || null,
            low_stock_threshold: editThreshold === "" ? null : Number(editThreshold),
            notes: editNotes.trim() || null,
          }),
        },
      );

      if (!res.ok) throw new Error();
      alert("Beállítások mentve!");
      setShowEditModal(null);
      void loadStock();
    } catch {
      alert("Hiba történt a mentés során.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle New Location Submission
  const handleNewLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouse/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: locCode.trim(),
          name: locName.trim(),
          description: locDesc.trim() || null,
        }),
      });

      if (res.status === 409) {
        throw new Error("Ez a tárhely kód már létezik!");
      }
      if (!res.ok) throw new Error("Sikertelen mentés.");

      alert("Raktárhely rögzítve!");
      setShowNewLocationModal(false);
      setLocCode("");
      setLocName("");
      setLocDesc("");
      void loadLocations();
    } catch (err: any) {
      alert(err.message || "Hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Stock Items
  const filteredStock = stockItems.filter(
    (s) =>
      !search ||
      s.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.product?.item_number.toLowerCase().includes(search.toLowerCase()) ||
      s.warehouse_location?.toLowerCase().includes(search.toLowerCase()),
  );

  // Filtered Locations
  const filteredLocations = locations.filter(
    (l) =>
      !search ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Filtered Transactions
  const filteredTransactions = transactions.filter(
    (t) =>
      !search ||
      t.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      t.product?.item_number.toLowerCase().includes(search.toLowerCase()) ||
      t.notes?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference_type.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    totalItems: stockItems.length,
    lowStock: stockItems.filter(
      (s) =>
        s.low_stock_threshold !== null && s.quantity_in_stock <= s.low_stock_threshold,
    ).length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Raktár"
        subtitle="Raktárhelyek, készlet és termékbevételezések CRM kezelése"
        actions={
          <div className="flex gap-2">
            {activeTab === "locations" ? (
              <Button variant="primary" onClick={() => setShowNewLocationModal(true)}>
                <Plus size={16} className="mr-2" /> Új raktárhely
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setShowManualReceiptModal(true)}>
                <Plus size={16} className="mr-2" /> Manuális bevét
              </Button>
            )}
          </div>
        }
      />

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="p-5 flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500">
            <Package size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-bold text-white">{stats.totalItems}</span>
            <span className="text-sm text-gray-400">Raktáron lévő cikkek</span>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500">
            <AlertTriangle size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xl font-bold text-white">{stats.lowStock}</span>
            <span className="text-sm text-gray-400">
              Figyelmeztetési határérték alatti cikk
            </span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 border-b overflow-x-auto pb-px"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {[
          { id: "stock", label: "Készlet", icon: <Package size={15} /> },
          { id: "locations", label: "Raktárhelyek", icon: <MapPin size={15} /> },
          { id: "transactions", label: "Tranzakciók", icon: <ClipboardList size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              borderBottom: `2px solid ${activeTab === tab.id ? "var(--color-accent-primary)" : "transparent"}`,
              color:
                activeTab === tab.id
                  ? "var(--color-accent-primary)"
                  : "var(--color-text-muted)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Filter */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400"
          />
          <InputControl
            placeholder="Keresés..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Tab Contents */}
      {activeTab === "stock" && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: "13px" }}>
              <thead>
                <tr
                  className="border-b"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                >
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Cikkszám
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Megnevezés
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Raktárhely
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Készlet
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Állapot
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Akciók
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingStock ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      Nincs találat.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((s) => {
                    const isLow =
                      s.low_stock_threshold !== null &&
                      s.quantity_in_stock <= s.low_stock_threshold;
                    return (
                      <tr
                        key={s._id}
                        className="border-b border-gray-800/40 hover:bg-gray-800/20"
                      >
                        <td className="px-4 py-3 text-gray-400 font-mono">
                          {s.product?.item_number || "—"}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          <div>{s.product?.name || "Ismeretlen cikk"}</div>
                          {s.notes && (
                            <div className="text-xs text-gray-500 font-normal mt-0.5">
                              {s.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {s.warehouse_location ? (
                            <Badge variant="default">
                              <MapPin size={10} className="mr-1 inline" />{" "}
                              {s.warehouse_location}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-right text-white">
                          {s.quantity_in_stock}{" "}
                          <span className="text-gray-500 font-normal text-xs">
                            {s.product?.unit || "db"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <Badge variant="error">
                              Alacsony készlet ({s.low_stock_threshold})
                            </Badge>
                          ) : (
                            <Badge variant="success">Rendben</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              title="Leltár korrekció"
                              onClick={() => {
                                setNewQuantity(s.quantity_in_stock);
                                setAdjustNotes("");
                                setShowAdjustModal(s);
                              }}
                            >
                              <Sliders size={13} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              title="Beállítások módosítása"
                              onClick={() => {
                                setEditLocation(s.warehouse_location || "");
                                setEditThreshold(s.low_stock_threshold ?? "");
                                setEditNotes(s.notes || "");
                                setShowEditModal(s);
                              }}
                            >
                              <Edit2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "locations" && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: "13px" }}>
              <thead>
                <tr
                  className="border-b"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                >
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Raktárhely kódja
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Megnevezés
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Leírás
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Létrehozva
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingLocations ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                      Nincs rögzített tárhely.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((l) => (
                    <tr
                      key={l._id}
                      className="border-b border-gray-800/40 hover:bg-gray-800/20"
                    >
                      <td className="px-4 py-3 text-white font-bold font-mono">
                        <span style={{ color: "var(--color-accent-primary)" }}>
                          {l.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{l.name}</td>
                      <td className="px-4 py-3 text-gray-400">{l.description || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(l.created_at).toLocaleDateString("hu-HU")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "transactions" && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: "13px" }}>
              <thead>
                <tr
                  className="border-b"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                >
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Dátum
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Cikk
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Típus
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Mennyiség
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Forrás / Megjegyzés
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingTransactions ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      Nincs tranzakció naplózva.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => {
                    const isPlus =
                      t.type === "in" || (t.type === "adjustment" && t.quantity >= 0);
                    return (
                      <tr
                        key={t._id}
                        className="border-b border-gray-800/40 hover:bg-gray-800/20"
                      >
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(t.created_at).toLocaleString("hu-HU")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">
                            {t.product?.name || "Ismeretlen cikk"}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {t.product?.item_number || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.type === "in" && <Badge variant="success">Bevétel</Badge>}
                          {t.type === "out" && <Badge variant="error">Kivétel</Badge>}
                          {t.type === "adjustment" && (
                            <Badge variant="info">Korrekció</Badge>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold text-right ${isPlus ? "text-green-400" : "text-red-400"}`}
                        >
                          {isPlus ? "+" : ""}
                          {t.quantity}{" "}
                          <span className="text-gray-500 font-normal text-xs">
                            {t.product?.unit || "db"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white text-sm">
                            <span className="text-gray-500 mr-2 uppercase text-xs font-semibold">
                              [{t.reference_type}]
                            </span>
                            {t.notes || "—"}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL: MANUAL RECEIPT */}
      {showManualReceiptModal && (
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
            padding: "16px",
          }}
        >
          <Card className="p-6 w-full max-w-xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">
                Manuális Raktári Bevételezés
              </h2>
              <button
                onClick={() => setShowManualReceiptModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualReceipt} className="flex flex-col gap-4">
              {/* Selector: New vs Existing */}
              <div className="flex border-b border-gray-800 pb-2 mb-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsNewProduct(false)}
                  className={`text-sm font-semibold pb-1 border-b-2 ${!isNewProduct ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400"}`}
                >
                  Meglévő Árlistaelem bevételezése
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewProduct(true)}
                  className={`text-sm font-semibold pb-1 border-b-2 ${isNewProduct ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400"}`}
                >
                  Új termék rögzítése és bevételezése
                </button>
              </div>

              {!isNewProduct ? (
                <div>
                  <Label htmlFor="price-item-select">Termék kiválasztása *</Label>
                  <select
                    id="price-item-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required={!isNewProduct}
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
                    <option value="">— Válassz a terméktörzsből —</option>
                    {priceListItems
                      .filter((p) => p.type === "product")
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.item_number})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-4 p-4 rounded-lg bg-gray-900/30 border border-gray-800">
                  <h3 className="text-xs uppercase font-bold text-blue-400 tracking-wider mb-1">
                    Új termék árlistás adatai
                  </h3>

                  <div>
                    <Label htmlFor="prod-name">Termék neve *</Label>
                    <InputControl
                      id="prod-name"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      required={isNewProduct}
                      placeholder="Pl. Hikvision IP Kamera..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="prod-cat">Kategória *</Label>
                      <select
                        id="prod-cat"
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        required={isNewProduct}
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
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.prefix})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="prod-unit">Egység *</Label>
                      <InputControl
                        id="prod-unit"
                        value={prodUnit}
                        onChange={(e) => setProdUnit(e.target.value)}
                        required={isNewProduct}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prod-selling">Nettó eladási ár (HUF) *</Label>
                    <InputControl
                      id="prod-selling"
                      type="number"
                      min={0}
                      value={String(prodSellingPrice)}
                      onChange={(e) => setProdSellingPrice(Number(e.target.value))}
                      required={isNewProduct}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-800 pt-3 mt-1">
                    <div>
                      <Label htmlFor="prod-purchase">Nettó beszerzési ár *</Label>
                      <InputControl
                        id="prod-purchase"
                        type="number"
                        min={0}
                        value={String(prodPurchasePrice)}
                        onChange={(e) => setProdPurchasePrice(Number(e.target.value))}
                        required={isNewProduct}
                      />
                    </div>
                    <div>
                      <Label htmlFor="prod-supplier">Beszállító *</Label>
                      <select
                        id="prod-supplier"
                        value={prodSupplier}
                        onChange={(e) => setProdSupplier(e.target.value)}
                        required={isNewProduct}
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
                        <option value="">— Válassz beszállítót —</option>
                        {suppliers.map((s) => (
                          <option key={s._id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Commmon Stock fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="receipt-qty">Mennyiség *</Label>
                  <InputControl
                    id="receipt-qty"
                    type="number"
                    min={1}
                    value={String(receiptQty)}
                    onChange={(e) => setReceiptQty(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="receipt-loc">Raktárhely</Label>
                  <select
                    id="receipt-loc"
                    value={receiptLoc}
                    onChange={(e) => setReceiptLoc(e.target.value)}
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
                    <option value="">— Válassz tárhelyet —</option>
                    {locations.map((l) => (
                      <option key={l._id} value={l.code}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="receipt-notes">Megjegyzés</Label>
                <InputControl
                  id="receipt-notes"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Pl. Beszerzési bizonylat, bevételezési indok..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowManualReceiptModal(false)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Mentés..." : "Készlet bevételezése"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {showAdjustModal && (
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
            padding: "16px",
          }}
        >
          <Card className="p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Leltári korrekció</h2>
              <button
                onClick={() => setShowAdjustModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Cikk:{" "}
              <strong className="text-white">{showAdjustModal.product?.name}</strong>
              <br />
              Jelenlegi raktári készlet:{" "}
              <strong className="text-white">
                {showAdjustModal.quantity_in_stock} {showAdjustModal.product?.unit}
              </strong>
            </p>

            <form onSubmit={handleAdjustmentSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="new-qty">Új készlet mennyiség *</Label>
                <InputControl
                  id="new-qty"
                  type="number"
                  min={0}
                  value={String(newQuantity)}
                  onChange={(e) => setNewQuantity(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="adjust-notes">Módosítás indoka / megjegyzés</Label>
                <InputControl
                  id="adjust-notes"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Leltári hiány, plusz tétel, stb..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdjustModal(null)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Rögzítés
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: EDIT STOCK METADATA */}
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
            padding: "16px",
          }}
        >
          <Card className="p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Beállítások módosítása</h2>
              <button
                onClick={() => setShowEditModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Termék:{" "}
              <strong className="text-white">{showEditModal.product?.name}</strong>
            </p>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="edit-loc">Raktárhely</Label>
                <select
                  id="edit-loc"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
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
                  <option value="">— Nincs megadva (Keresztül) —</option>
                  {locations.map((l) => (
                    <option key={l._id} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="edit-threshold">
                  Minimális készlet (értesítési határérték)
                </Label>
                <InputControl
                  id="edit-threshold"
                  type="number"
                  min={0}
                  value={String(editThreshold)}
                  onChange={(e) =>
                    setEditThreshold(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Hagyd üresen, ha nincs limit"
                />
              </div>

              <div>
                <Label htmlFor="edit-notes">Belső megjegyzés</Label>
                <InputControl
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Figyelmeztetések, belső infók..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditModal(null)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Mentés
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: NEW LOCATION */}
      {showNewLocationModal && (
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
            padding: "16px",
          }}
        >
          <Card className="p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Új raktárhely létrehozása</h2>
              <button
                onClick={() => setShowNewLocationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleNewLocationSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="loc-code">Hely kódja *</Label>
                <InputControl
                  id="loc-code"
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  placeholder="Pl: A-1-B"
                  required
                />
              </div>

              <div>
                <Label htmlFor="loc-name">Név / Megnevezés *</Label>
                <InputControl
                  id="loc-name"
                  value={locName}
                  placeholder="Pl: Fő polcrendszer alsó polc"
                  onChange={(e) => setLocName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="loc-desc">Leírás (opcionális)</Label>
                <InputControl
                  id="loc-desc"
                  value={locDesc}
                  placeholder="Pl: Csak biztonságtechnikai kábeleknek..."
                  onChange={(e) => setLocDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewLocationModal(false)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Rögzítés
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
