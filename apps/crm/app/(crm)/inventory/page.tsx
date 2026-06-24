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
  TrendingUp,
  RefreshCw,
  FileText,
  CheckCircle,
  ShieldAlert,
  DollarSign,
  MoveRight,
  User,
} from "lucide-react";
import type {
  StockItemWithProduct,
  WarehouseLocation,
  StockTransaction,
  PriceListItem,
  Supplier,
  ItemCategory,
  Settings,
  InventoryTaking,
  RmaCase,
  Contact,
} from "@crm/types";

interface StockTransactionWithProduct extends StockTransaction {
  product: { name: string; item_number: string; unit: string } | null;
}

interface EnrichedRmaCase extends RmaCase {
  product: PriceListItem | null;
  contact: Contact | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "stock" | "locations" | "transactions" | "inventory-taking" | "rma"
  >("dashboard");

  // Data States
  const [stockItems, setStockItems] = useState<StockItemWithProduct[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [transactions, setTransactions] = useState<StockTransactionWithProduct[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<{
    kpis: {
      totalValuation: number;
      lowStockCount: number;
      activeRmaCount: number;
      totalLocations: number;
    };
    distribution: Array<{
      code: string;
      name: string;
      type: string;
      count: number;
      value: number;
    }>;
    criticalStock: StockItemWithProduct[];
    deadStock: StockItemWithProduct[];
    recentTransactions: StockTransactionWithProduct[];
  } | null>(null);

  // Inventory Audits and RMAs State
  const [audits, setAudits] = useState<InventoryTaking[]>([]);
  const [rmaCases, setRmaCases] = useState<EnrichedRmaCase[]>([]);

  // Filtering & Loading
  const [search, setSearch] = useState("");
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingInventoryTaking, setLoadingInventoryTaking] = useState(false);
  const [loadingRma, setLoadingRma] = useState(false);

  // Modals Visibility
  const [showManualReceiptModal, setShowManualReceiptModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<StockItemWithProduct | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState<StockItemWithProduct | null>(null);
  const [showNewLocationModal, setShowNewLocationModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState<StockItemWithProduct | null>(
    null,
  );
  const [showAllocateModal, setShowAllocateModal] = useState<StockItemWithProduct | null>(
    null,
  );
  const [showNewRmaModal, setShowNewRmaModal] = useState(false);
  const [showRmaStatusModal, setShowRmaStatusModal] = useState<EnrichedRmaCase | null>(
    null,
  );
  const [showNewInventoryModal, setShowNewInventoryModal] = useState(false);

  // Form States - Manual Receipt
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [receiptQty, setReceiptQty] = useState(1);
  const [receiptLoc, setReceiptLoc] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptSerialsText, setReceiptSerialsText] = useState("");

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
  const [adjustSerialsText, setAdjustSerialsText] = useState("");

  // Form States - Edit metadata
  const [editLocation, setEditLocation] = useState("");
  const [editThreshold, setEditThreshold] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState("");

  // Form States - New Location
  const [locCode, setLocCode] = useState("");
  const [locName, setLocName] = useState("");
  const [locType, setLocType] = useState<"main" | "car" | "scrap" | "shelf">("shelf");
  const [locDesc, setLocDesc] = useState("");

  // Form States - Transfer
  const [transferToLoc, setTransferToLoc] = useState("");
  const [transferQty, setTransferQty] = useState(1);
  const [transferSerialsText, setTransferSerialsText] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  // Form States - Allocate
  const [allocateQty, setAllocateQty] = useState(0);
  const [allocateNotes, setAllocateNotes] = useState("");

  // Form States - RMA
  const [rmaProductId, setRmaProductId] = useState("");
  const [rmaContactId, setRmaContactId] = useState("");
  const [rmaSerial, setRmaSerial] = useState("");
  const [rmaQty, setRmaQty] = useState(1);
  const [rmaSupplier, setRmaSupplier] = useState("");
  const [rmaNotes, setRmaNotes] = useState("");

  // Form States - RMA Status Update
  const [rmaStatus, setRmaStatus] = useState<RmaCase["status"]>("received");
  const [rmaStatusNotes, setRmaStatusNotes] = useState("");

  // Form States - Inventory Taking Audit Sheet
  const [inventoryLoc, setInventoryLoc] = useState("");
  const [inventoryItems, setInventoryItems] = useState<
    Array<{
      price_list_item_id: string;
      product_name: string;
      product_number: string;
      unit: string;
      expected_qty: number;
      physical_qty: number;
      diff_qty: number;
      serial_numbers: string[];
      notes: string;
    }>
  >([]);
  const [loadingInventorySheet, setLoadingInventorySheet] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Loaders
  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const res = await fetch("/api/warehouse/dashboard");
      if (res.ok) {
        setDashboardData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

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

  const loadInventoryTaking = useCallback(async () => {
    setLoadingInventoryTaking(true);
    try {
      const res = await fetch("/api/warehouse/inventory-taking");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAudits(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInventoryTaking(false);
    }
  }, []);

  const loadRma = useCallback(async () => {
    setLoadingRma(true);
    try {
      const res = await fetch("/api/warehouse/rma");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRmaCases(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRma(false);
    }
  }, []);

  const loadMetadataOptions = useCallback(async () => {
    try {
      const [rPrice, rSup, rSet, rContacts] = await Promise.all([
        fetch("/api/price-list"),
        fetch("/api/suppliers"),
        fetch("/api/settings"),
        fetch("/api/contacts"),
      ]);
      if (rPrice.ok) {
        const data = await rPrice.json();
        setPriceListItems(data.filter((p: PriceListItem) => p.is_active));
      }
      if (rSup.ok) {
        setSuppliers(await rSup.json());
      }
      if (rContacts.ok) {
        setContacts(await rContacts.json());
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
    void loadDashboard();
    void loadMetadataOptions();
  }, [loadDashboard, loadMetadataOptions]);

  // Tab change triggers loaders
  useEffect(() => {
    if (activeTab === "dashboard") {
      void loadDashboard();
    } else if (activeTab === "stock") {
      void loadStock();
      void loadLocations();
    } else if (activeTab === "locations") {
      void loadLocations();
    } else if (activeTab === "transactions") {
      void loadTransactions();
    } else if (activeTab === "inventory-taking") {
      void loadInventoryTaking();
      void loadLocations();
    } else if (activeTab === "rma") {
      void loadRma();
    }
  }, [
    activeTab,
    loadDashboard,
    loadStock,
    loadLocations,
    loadTransactions,
    loadInventoryTaking,
    loadRma,
  ]);

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

      const serials = receiptSerialsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const qty = serials.length > 0 ? serials.length : receiptQty;

      // Step 2: Post to Stock receipt
      const res = await fetch("/api/warehouse/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_list_item_id,
          quantity: qty,
          warehouse_location: receiptLoc || null,
          notes: receiptNotes.trim() || null,
          serial_numbers: serials,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Nem sikerült bevételezni a készletet.");
      }

      alert("Sikeres bevételezés!");
      setShowManualReceiptModal(false);

      // Reset form
      setIsNewProduct(false);
      setSelectedProductId("");
      setReceiptQty(1);
      setReceiptLoc("");
      setReceiptNotes("");
      setReceiptSerialsText("");
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
      const serials = adjustSerialsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch(`/api/warehouse/stock/${showAdjustModal._id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_quantity: serials.length > 0 ? serials.length : newQuantity,
          notes: adjustNotes.trim() || null,
          serial_numbers: serials.length > 0 ? serials : undefined,
        }),
      });

      if (!res.ok) throw new Error();
      alert("Leltári korrekció rögzítve!");
      setShowAdjustModal(null);
      setAdjustSerialsText("");
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
      const res = await fetch(`/api/warehouse/stock/${showEditModal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse_location: editLocation || null,
          low_stock_threshold: editThreshold === "" ? null : Number(editThreshold),
          notes: editNotes.trim() || null,
        }),
      });

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
          type: locType,
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
      setLocType("shelf");
      setLocDesc("");
      void loadLocations();
    } catch (err: any) {
      alert(err.message || "Hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Stock Transfer Submission
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTransferModal) return;
    setSubmitting(true);
    try {
      const serials = transferSerialsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const qty = serials.length > 0 ? serials.length : transferQty;

      const res = await fetch("/api/warehouse/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_list_item_id: showTransferModal.price_list_item_id,
          from_location: showTransferModal.warehouse_location,
          to_location: transferToLoc,
          quantity: qty,
          serial_numbers: serials.length > 0 ? serials : undefined,
          notes: transferNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Hiba az átmozgatás során.");
      }

      alert("Sikeres raktárközi átmozgatás!");
      setShowTransferModal(null);
      setTransferToLoc("");
      setTransferQty(1);
      setTransferSerialsText("");
      setTransferNotes("");
      void loadStock();
    } catch (err: any) {
      alert(err.message || "Hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Stock Allocation Submission
  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAllocateModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/warehouse/stock/${showAllocateModal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity_allocated: allocateQty,
          notes: allocateNotes
            ? `${showAllocateModal.notes || ""}\n[Foglalás: ${allocateQty} db - ${allocateNotes.trim()}]`
            : showAllocateModal.notes,
        }),
      });

      if (!res.ok) throw new Error();
      alert("Készletfoglalás sikeresen rögzítve!");
      setShowAllocateModal(null);
      setAllocateQty(0);
      setAllocateNotes("");
      void loadStock();
    } catch {
      alert("Hiba történt a foglalás során.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle RMA Case Submission
  const handleRmaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouse/rma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_list_item_id: rmaProductId,
          contact_id: rmaContactId,
          serial_number: rmaSerial.trim() || null,
          quantity: rmaQty,
          supplier_name: rmaSupplier.trim() || null,
          notes: rmaNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Sikertelen mentés.");
      }

      alert("Garanciális eset rögzítve!");
      setShowNewRmaModal(false);
      setRmaProductId("");
      setRmaContactId("");
      setRmaSerial("");
      setRmaQty(1);
      setRmaSupplier("");
      setRmaNotes("");
      void loadRma();
    } catch (err: any) {
      alert(err.message || "Hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle RMA Status Update
  const handleRmaStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRmaStatusModal) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouse/rma", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showRmaStatusModal._id,
          status: rmaStatus,
          notes: rmaStatusNotes.trim()
            ? `${showRmaStatusModal.notes || ""}\n[Státuszváltás -> ${rmaStatus}: ${rmaStatusNotes.trim()}]`
            : showRmaStatusModal.notes,
        }),
      });

      if (!res.ok) throw new Error("Sikertelen státusz frissítés.");

      alert("RMA státusz frissítve!");
      setShowRmaStatusModal(null);
      setRmaStatusNotes("");
      void loadRma();
    } catch (err: any) {
      alert(err.message || "Hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Load Inventory Taking Sheet for Wizard
  const loadInventorySheetData = async (locCode: string) => {
    if (!locCode) return;
    setLoadingInventorySheet(true);
    try {
      const res = await fetch(`/api/warehouse/inventory-taking?location=${locCode}`);
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInventorySheet(false);
    }
  };

  // Handle Inventory Taking Submission
  const handleInventoryTakingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inventoryItems.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouse/inventory-taking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse_location: inventoryLoc,
          status: "completed",
          items: inventoryItems.map((item) => ({
            price_list_item_id: item.price_list_item_id,
            expected_qty: item.expected_qty,
            physical_qty: Number(item.physical_qty),
            diff_qty: Number(item.physical_qty) - item.expected_qty,
            notes: item.notes,
          })),
        }),
      });

      if (!res.ok) throw new Error("Leltár lezárása sikertelen.");

      alert("Leltár sikeresen lezárva és készletek korrigálva!");
      setShowNewInventoryModal(false);
      setInventoryLoc("");
      setInventoryItems([]);
      void loadInventoryTaking();
    } catch (err: any) {
      alert(err.message || "Hiba történt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredStock = stockItems.filter(
    (s) =>
      !search ||
      s.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.product?.item_number.toLowerCase().includes(search.toLowerCase()) ||
      s.warehouse_location?.toLowerCase().includes(search.toLowerCase()) ||
      s.serial_numbers?.some((sn) => sn.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredLocations = locations.filter(
    (l) =>
      !search ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.type.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredTransactions = transactions.filter(
    (t) =>
      !search ||
      t.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      t.product?.item_number.toLowerCase().includes(search.toLowerCase()) ||
      t.notes?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference_type.toLowerCase().includes(search.toLowerCase()) ||
      t.to_warehouse_location?.toLowerCase().includes(search.toLowerCase()) ||
      t.serial_numbers?.some((sn) => sn.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredRma = rmaCases.filter(
    (c) =>
      !search ||
      c.rma_number.toLowerCase().includes(search.toLowerCase()) ||
      c.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.notes?.toLowerCase().includes(search.toLowerCase()),
  );

  const getRmaStatusBadge = (status: RmaCase["status"]) => {
    switch (status) {
      case "received":
        return <Badge variant="info">Beérkezett</Badge>;
      case "sent_to_supplier":
        return <Badge variant="warning">Beszállítónál</Badge>;
      case "replaced":
        return <Badge variant="success">Cserélve</Badge>;
      case "repaired":
        return <Badge variant="success">Javítva</Badge>;
      case "scrapped":
        return <Badge variant="error">Selejtezve (RMA)</Badge>;
      case "returned_to_client":
        return <Badge variant="default">Ügyfélnek visszaadva</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getLocTypeLabel = (type: string) => {
    switch (type) {
      case "main":
        return "Fő Raktár";
      case "car":
        return "Szerelőautó";
      case "scrap":
        return "Selejtező";
      case "shelf":
        return "Polc / Tárhely";
      default:
        return "Egyéb";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title="Raktár"
        subtitle="Raktárhelyek, készlet, leltározás és garanciális RMA ügyek kezelése"
        actions={
          <div className="flex gap-2">
            {activeTab === "locations" && (
              <Button variant="primary" onClick={() => setShowNewLocationModal(true)}>
                <Plus size={16} className="mr-2" /> Új raktárhely
              </Button>
            )}
            {activeTab === "stock" && (
              <Button variant="primary" onClick={() => setShowManualReceiptModal(true)}>
                <Plus size={16} className="mr-2" /> Manuális bevét
              </Button>
            )}
            {activeTab === "inventory-taking" && (
              <Button variant="primary" onClick={() => setShowNewInventoryModal(true)}>
                <Plus size={16} className="mr-2" /> Új leltár indítása
              </Button>
            )}
            {activeTab === "rma" && (
              <Button variant="primary" onClick={() => setShowNewRmaModal(true)}>
                <Plus size={16} className="mr-2" /> Új RMA rögzítése
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div
        className="flex gap-1 border-b overflow-x-auto pb-px"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {[
          { id: "dashboard", label: "Irányítópult", icon: <TrendingUp size={15} /> },
          { id: "stock", label: "Készlet", icon: <Package size={15} /> },
          { id: "locations", label: "Raktárhelyek", icon: <MapPin size={15} /> },
          { id: "transactions", label: "Tranzakciók", icon: <ClipboardList size={15} /> },
          { id: "inventory-taking", label: "Leltározás", icon: <FileText size={15} /> },
          { id: "rma", label: "Garanciális (RMA)", icon: <ShieldAlert size={15} /> },
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

      {/* Search Filter (only for management tabs) */}
      {activeTab !== "dashboard" && (
        <Card className="p-4">
          <div className="relative max-w-md">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400"
            />
            <InputControl
              placeholder="Gyorskeresés (név, kód, megjegyzés)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>
      )}

      {/* TAB 1: DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          {loadingDashboard ? (
            <div className="py-20 text-center text-gray-400">Dashboard betöltése...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-gray-900 to-gray-900/50">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">
                      Bruttó készletérték
                    </div>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {fmt(dashboardData?.kpis.totalValuation || 0)}
                    </div>
                  </div>
                </Card>

                <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-gray-900 to-gray-900/50">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">
                      Alacsony készletszint
                    </div>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {dashboardData?.kpis.lowStockCount || 0} cikk
                    </div>
                  </div>
                </Card>

                <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-gray-900 to-gray-900/50">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">
                      Aktív RMA ügyek
                    </div>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {dashboardData?.kpis.activeRmaCount || 0} folyamatban
                    </div>
                  </div>
                </Card>

                <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-gray-900 to-gray-900/50">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-400">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">
                      Aktív raktárhelyek
                    </div>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {dashboardData?.kpis.totalLocations || 0} lokáció
                    </div>
                  </div>
                </Card>
              </div>

              {/* Middle Section: Location Value Bars & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Location Distribution */}
                <Card className="p-6 lg:col-span-2 flex flex-col gap-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building2 size={18} className="text-blue-400" /> Raktárak Értékbeli
                    Megoszlása
                  </h3>
                  <div className="flex flex-col gap-4 mt-2">
                    {dashboardData?.distribution.map((d) => {
                      const maxVal = Math.max(
                        ...(dashboardData?.distribution.map((dist) => dist.value) || [1]),
                      );
                      const percentage = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
                      return (
                        <div key={d.code} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-gray-300 flex items-center gap-1.5">
                              <span className="font-mono text-blue-400">[{d.code}]</span>{" "}
                              {d.name}
                              <span className="scale-90 origin-left">
                                <Badge variant="default">{getLocTypeLabel(d.type)}</Badge>
                              </span>
                            </span>
                            <span className="text-white">
                              {fmt(d.value)}{" "}
                              <span className="text-gray-500 font-normal">
                                ({d.count} db)
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Activity Feed */}
                <Card className="p-6 flex flex-col gap-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History size={18} className="text-blue-400" /> Legutóbbi Mozgások
                  </h3>
                  <div className="flex flex-col gap-3 mt-2 overflow-y-auto max-h-[300px]">
                    {dashboardData?.recentTransactions.length === 0 ? (
                      <div className="text-gray-500 text-sm py-4 text-center">
                        Nincs legutóbbi mozgás
                      </div>
                    ) : (
                      dashboardData?.recentTransactions.map((t) => {
                        const isPlus =
                          t.type === "in" || (t.type === "adjustment" && t.quantity >= 0);
                        return (
                          <div
                            key={t._id}
                            className="flex justify-between items-start gap-2 border-b border-gray-800/40 pb-2"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                                {t.product?.name || "Ismeretlen cikk"}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                <span>{new Date(t.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="uppercase">{t.reference_type}</span>
                              </span>
                            </div>
                            <span
                              className={`text-xs font-bold whitespace-nowrap ${isPlus ? "text-emerald-400" : "text-rose-400"}`}
                            >
                              {isPlus ? "+" : ""}
                              {t.quantity} {t.product?.unit || "db"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </div>

              {/* Bottom Section: Low Stock & Dead Stock Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Warnings */}
                <Card className="p-6 flex flex-col gap-4">
                  <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                    <AlertTriangle size={18} /> Kritikus Készletszint Riasztások
                  </h3>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                          <th className="pb-2">Cikk</th>
                          <th className="pb-2">Hely</th>
                          <th className="pb-2 text-right">Készlet</th>
                          <th className="pb-2 text-right">Minimális</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData?.criticalStock.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-gray-500">
                              Minden készletszint megfelelő
                            </td>
                          </tr>
                        ) : (
                          dashboardData?.criticalStock.map((s) => (
                            <tr
                              key={s._id}
                              className="border-b border-gray-800/20 hover:bg-gray-800/10"
                            >
                              <td className="py-2.5 font-medium text-white">
                                <div>{s.product?.name}</div>
                                <div className="text-[10px] text-gray-500 font-mono">
                                  {s.product?.item_number}
                                </div>
                              </td>
                              <td className="py-2.5 text-gray-400">
                                {s.warehouse_location || "—"}
                              </td>
                              <td className="py-2.5 text-right font-bold text-rose-400">
                                {s.quantity_in_stock}
                              </td>
                              <td className="py-2.5 text-right text-gray-400 font-semibold">
                                {s.low_stock_threshold}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Dead Stock Warning */}
                <Card className="p-6 flex flex-col gap-4">
                  <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                    <ShieldAlert size={18} /> Holt Készlet (Elmúlt 90 napban nincs mozgás)
                  </h3>
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                          <th className="pb-2">Cikk</th>
                          <th className="pb-2">Hely</th>
                          <th className="pb-2 text-right">Készlet</th>
                          <th className="pb-2 text-right">Készletérték</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData?.deadStock.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-gray-500">
                              Nincs holtkészlet
                            </td>
                          </tr>
                        ) : (
                          dashboardData?.deadStock.map((s) => (
                            <tr
                              key={s._id}
                              className="border-b border-gray-800/20 hover:bg-gray-800/10"
                            >
                              <td className="py-2.5 font-medium text-white">
                                <div>{s.product?.name}</div>
                                <div className="text-[10px] text-gray-500 font-mono">
                                  {s.product?.item_number}
                                </div>
                              </td>
                              <td className="py-2.5 text-gray-400">
                                {s.warehouse_location || "—"}
                              </td>
                              <td className="py-2.5 text-right font-bold text-gray-300">
                                {s.quantity_in_stock}
                              </td>
                              <td className="py-2.5 text-right text-amber-400 font-semibold">
                                {fmt(
                                  s.quantity_in_stock *
                                    (s.product?.last_purchase_price || 0),
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: STOCK */}
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
                    Szabad / Összes készlet
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Gyári számok
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
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      Nincs találat.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((s) => {
                    const isLow =
                      s.low_stock_threshold !== null &&
                      s.quantity_in_stock <= s.low_stock_threshold;
                    const freeStock = s.quantity_in_stock - (s.quantity_allocated || 0);

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
                            <div className="text-xs text-gray-500 font-normal mt-0.5 max-w-sm truncate">
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
                          <span className="text-emerald-400">{freeStock}</span> /{" "}
                          {s.quantity_in_stock}{" "}
                          <span className="text-gray-500 font-normal text-xs">
                            {s.product?.unit || "db"}
                          </span>
                          {(s.quantity_allocated || 0) > 0 && (
                            <div className="text-[10px] text-amber-500 font-normal">
                              ({s.quantity_allocated} db foglalt)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                          {s.serial_numbers && s.serial_numbers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {s.serial_numbers.map((sn) => (
                                <span
                                  key={sn}
                                  className="bg-gray-900 border border-gray-800 text-[10px] px-1.5 py-0.5 rounded text-gray-300"
                                >
                                  {sn}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLow ? (
                            <Badge variant="error">
                              Alacsony ({s.low_stock_threshold})
                            </Badge>
                          ) : (
                            <Badge variant="success">Rendben</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              title="Leltár korrekció"
                              onClick={() => {
                                setNewQuantity(s.quantity_in_stock);
                                setAdjustNotes("");
                                setAdjustSerialsText(s.serial_numbers?.join("\n") || "");
                                setShowAdjustModal(s);
                              }}
                            >
                              <Sliders size={13} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              title="Átmozgatás (Transzfer)"
                              onClick={() => {
                                setTransferQty(1);
                                setTransferNotes("");
                                setTransferSerialsText("");
                                setShowTransferModal(s);
                              }}
                            >
                              <MoveRight size={13} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              title="Készletfoglalás (Projekt)"
                              onClick={() => {
                                setAllocateQty(0);
                                setAllocateNotes("");
                                setShowAllocateModal(s);
                              }}
                            >
                              <User size={13} />
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

      {/* TAB 3: LOCATIONS */}
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
                    Típus
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
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
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
                      <td className="px-4 py-3">
                        <Badge variant="default">{getLocTypeLabel(l.type)}</Badge>
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

      {/* TAB 4: TRANSACTIONS */}
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
                    Gyári számok
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Célhely / Megjegyzés
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingTransactions ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
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
                          {t.type === "transfer" && (
                            <Badge variant="default">Átmozgatás</Badge>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold text-right ${isPlus ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          {isPlus ? "+" : ""}
                          {t.quantity}{" "}
                          <span className="text-gray-500 font-normal text-xs">
                            {t.product?.unit || "db"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                          {t.serial_numbers && t.serial_numbers.length > 0
                            ? t.serial_numbers.join(", ")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white text-sm">
                            <span className="text-gray-500 mr-2 uppercase text-xs font-semibold">
                              [{t.reference_type}]
                            </span>
                            {t.to_warehouse_location && (
                              <span className="text-blue-400 font-semibold mr-2 font-mono">
                                ➔ {t.to_warehouse_location}
                              </span>
                            )}
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

      {/* TAB 5: INVENTORY TAKING */}
      {activeTab === "inventory-taking" && (
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
                    Raktárhely
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Státusz
                  </th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Tételek száma
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Rögzítette
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Lezárás dátuma
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingInventoryTaking ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : audits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      Nincsenek korábbi leltárak.
                    </td>
                  </tr>
                ) : (
                  audits.map((a) => (
                    <tr
                      key={a._id}
                      className="border-b border-gray-800/40 hover:bg-gray-800/20"
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(a.created_at).toLocaleString("hu-HU")}
                      </td>
                      <td className="px-4 py-3 text-white font-mono font-bold">
                        {a.warehouse_location}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.status === "completed" ? (
                          <Badge variant="success">Lezárt</Badge>
                        ) : (
                          <Badge variant="warning">Tervezet</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-bold">
                        {a.items?.length || 0} db
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {a.created_by || "Rendszer"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {a.completed_at
                          ? new Date(a.completed_at).toLocaleString("hu-HU")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 6: RMA CASES */}
      {activeTab === "rma" && (
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
                    RMA szám
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Cikk
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Szériaszám
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Ügyfél (Partner)
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Státusz
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Beszállító
                  </th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Megjegyzés
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider px-4 py-3 text-gray-400">
                    Akció
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingRma ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      Betöltés...
                    </td>
                  </tr>
                ) : filteredRma.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      Nincs rögzített RMA eset.
                    </td>
                  </tr>
                ) : (
                  filteredRma.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-gray-800/40 hover:bg-gray-800/20"
                    >
                      <td className="px-4 py-3 text-white font-bold font-mono">
                        {c.rma_number}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {c.product?.name || "Ismeretlen termék"}
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                        {c.serial_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {c.contact?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getRmaStatusBadge(c.status)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {c.supplier_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                        {c.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setRmaStatus(c.status);
                            setRmaStatusNotes("");
                            setShowRmaStatusModal(c);
                          }}
                        >
                          Módosítás
                        </Button>
                      </td>
                    </tr>
                  ))
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

              {/* Common Stock fields */}
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
                <Label htmlFor="receipt-serials">
                  Gyári számok (Opcionális - vesszővel vagy új sorral elválasztva)
                </Label>
                <textarea
                  id="receipt-serials"
                  value={receiptSerialsText}
                  onChange={(e) => setReceiptSerialsText(e.target.value)}
                  placeholder="Pl. SN123456, SN123457..."
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-primary)",
                    minHeight: "80px",
                  }}
                />
                <span className="text-[10px] text-gray-500">
                  Ha megadsz gyári számokat, a mennyiség automatikusan igazodik hozzájuk.
                </span>
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
                <Label htmlFor="adjust-serials">Gyári számok listája (Soronként)</Label>
                <textarea
                  id="adjust-serials"
                  value={adjustSerialsText}
                  onChange={(e) => setAdjustSerialsText(e.target.value)}
                  placeholder="Gyári számok szerkesztése..."
                  className="w-full p-2.5 rounded-lg border text-sm font-mono"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-primary)",
                    minHeight: "100px",
                  }}
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
                <Label htmlFor="loc-type">Tárhely típusa *</Label>
                <select
                  id="loc-type"
                  value={locType}
                  onChange={(e) => setLocType(e.target.value as any)}
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
                  <option value="shelf">Polc / Tárhely</option>
                  <option value="main">Fő Raktár</option>
                  <option value="car">Szerelőautó</option>
                  <option value="scrap">Selejtező</option>
                </select>
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

      {/* MODAL: TRANSFER STOCK */}
      {showTransferModal && (
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
              <h2 className="text-lg font-bold text-white">Raktárközi Átmozgatás</h2>
              <button
                onClick={() => setShowTransferModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Cikk:{" "}
              <strong className="text-white">{showTransferModal.product?.name}</strong>
              <br />
              Forráshely:{" "}
              <strong className="text-white">
                {showTransferModal.warehouse_location || "—"}
              </strong>
            </p>

            <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="transfer-to">Cél raktárhely *</Label>
                <select
                  id="transfer-to"
                  value={transferToLoc}
                  onChange={(e) => setTransferToLoc(e.target.value)}
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
                  <option value="">— Válassz célhelyet —</option>
                  {locations
                    .filter((l) => l.code !== showTransferModal.warehouse_location)
                    .map((l) => (
                      <option key={l._id} value={l.code}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label htmlFor="transfer-qty">Átmozgatandó Mennyiség *</Label>
                <InputControl
                  id="transfer-qty"
                  type="number"
                  min={1}
                  max={showTransferModal.quantity_in_stock}
                  value={String(transferQty)}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  required
                />
              </div>

              {showTransferModal.serial_numbers &&
                showTransferModal.serial_numbers.length > 0 && (
                  <div>
                    <Label htmlFor="transfer-serials">
                      Átmozgatandó Gyári számok (Vesszővel vagy új sorral)
                    </Label>
                    <textarea
                      id="transfer-serials"
                      value={transferSerialsText}
                      onChange={(e) => setTransferSerialsText(e.target.value)}
                      placeholder="Másold be a mozgatni kívánt gyári számokat..."
                      className="w-full p-2.5 rounded-lg border text-sm font-mono"
                      style={{
                        borderColor: "var(--color-border-subtle)",
                        background: "var(--color-bg-secondary)",
                        color: "var(--color-text-primary)",
                        minHeight: "80px",
                      }}
                    />
                    <span className="text-[10px] text-gray-500">
                      Csak a megadott gyári számok kerülnek át. A mennyiség ehhez
                      igazodik.
                    </span>
                  </div>
                )}

              <div>
                <Label htmlFor="transfer-notes">Megjegyzés</Label>
                <InputControl
                  id="transfer-notes"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Átmozgatás oka..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTransferModal(null)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Átmozgatás indítása
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: ALLOCATE STOCK */}
      {showAllocateModal && (
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
              <h2 className="text-lg font-bold text-white">Készletfoglalás Projektnek</h2>
              <button
                onClick={() => setShowAllocateModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Cikk:{" "}
              <strong className="text-white">{showAllocateModal.product?.name}</strong>
              <br />
              Elérhető raktári készlet:{" "}
              <strong className="text-white">
                {showAllocateModal.quantity_in_stock -
                  (showAllocateModal.quantity_allocated || 0)}{" "}
                {showAllocateModal.product?.unit || "db"}
              </strong>
            </p>

            <form onSubmit={handleAllocateSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="allocate-qty">Lefoglalandó mennyiség *</Label>
                <InputControl
                  id="allocate-qty"
                  type="number"
                  min={1}
                  max={
                    showAllocateModal.quantity_in_stock -
                    (showAllocateModal.quantity_allocated || 0)
                  }
                  value={String(allocateQty || "")}
                  onChange={(e) => setAllocateQty(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="allocate-notes">Projekt / Megjegyzés *</Label>
                <InputControl
                  id="allocate-notes"
                  value={allocateNotes}
                  onChange={(e) => setAllocateNotes(e.target.value)}
                  placeholder="Pl. PRJ-2026-003, SF Biztonsági Kamera kiépítés..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAllocateModal(null)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Foglalás rögzítése
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: NEW RMA CASE */}
      {showNewRmaModal && (
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
          <Card className="p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">
                Új RMA (Garanciális eset) Rögzítése
              </h2>
              <button
                onClick={() => setShowNewRmaModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRmaSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="rma-prod">Termék kiválasztása *</Label>
                <select
                  id="rma-prod"
                  value={rmaProductId}
                  onChange={(e) => setRmaProductId(e.target.value)}
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
                  <option value="">— Válassz terméket —</option>
                  {priceListItems
                    .filter((p) => p.type === "product")
                    .map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.item_number})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label htmlFor="rma-contact">Ügyfél (Partner) *</Label>
                <select
                  id="rma-contact"
                  value={rmaContactId}
                  onChange={(e) => setRmaContactId(e.target.value)}
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
                  <option value="">— Válassz partnert —</option>
                  {contacts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.email ? `(${c.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rma-serial">Gyári szám</Label>
                  <InputControl
                    id="rma-serial"
                    value={rmaSerial}
                    onChange={(e) => setRmaSerial(e.target.value)}
                    placeholder="Pl. SN123456"
                  />
                </div>
                <div>
                  <Label htmlFor="rma-qty">Mennyiség *</Label>
                  <InputControl
                    id="rma-qty"
                    type="number"
                    min={1}
                    value={String(rmaQty)}
                    onChange={(e) => setRmaQty(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rma-sup">Beszállító név (Ha van / garanciához)</Label>
                <InputControl
                  id="rma-sup"
                  value={rmaSupplier}
                  onChange={(e) => setRmaSupplier(e.target.value)}
                  placeholder="Pl: SF Security"
                />
              </div>

              <div>
                <Label htmlFor="rma-notes">Hiba leírása / Jegyzetek</Label>
                <textarea
                  id="rma-notes"
                  value={rmaNotes}
                  onChange={(e) => setRmaNotes(e.target.value)}
                  placeholder="Pl. Nem kapcsol be, ügyfél állítása szerint villámcsapás..."
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-primary)",
                    minHeight: "70px",
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewRmaModal(false)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  RMA Rögzítése
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: RMA STATUS UPDATE */}
      {showRmaStatusModal && (
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
              <h2 className="text-lg font-bold text-white">RMA Státusz Frissítése</h2>
              <button
                onClick={() => setShowRmaStatusModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              RMA: <strong className="text-white">{showRmaStatusModal.rma_number}</strong>
              <br />
              Termék:{" "}
              <strong className="text-white">{showRmaStatusModal.product?.name}</strong>
            </p>

            <form onSubmit={handleRmaStatusSubmit} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="rma-new-status">Új Státusz *</Label>
                <select
                  id="rma-new-status"
                  value={rmaStatus}
                  onChange={(e) => setRmaStatus(e.target.value as any)}
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
                  <option value="received">Beérkezett</option>
                  <option value="sent_to_supplier">Beszállítónak elküldve</option>
                  <option value="replaced">Cserélve (Garancia)</option>
                  <option value="repaired">Javítva (Garancia)</option>
                  <option value="scrapped">Selejtezve</option>
                  <option value="returned_to_client">Ügyfélnek visszaadva</option>
                </select>
              </div>

              <div>
                <Label htmlFor="rma-status-notes">Státuszváltás indoka / Jegyzet</Label>
                <InputControl
                  id="rma-status-notes"
                  value={rmaStatusNotes}
                  onChange={(e) => setRmaStatusNotes(e.target.value)}
                  placeholder="Pl. Beszállító elfogadta a cserét..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowRmaStatusModal(null)}
                >
                  Mégsem
                </Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  Státusz Mentése
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL: NEW INVENTORY AUDIT WIZARD */}
      {showNewInventoryModal && (
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
          <Card className="p-6 w-full max-w-4xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">
                Új Leltár Ív Indítása és Lezárása
              </h2>
              <button
                onClick={() => {
                  setShowNewInventoryModal(false);
                  setInventoryLoc("");
                  setInventoryItems([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="inv-loc-select">Leltározandó raktárhely *</Label>
                  <select
                    id="inv-loc-select"
                    value={inventoryLoc}
                    onChange={(e) => {
                      setInventoryLoc(e.target.value);
                      void loadInventorySheetData(e.target.value);
                    }}
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
                    <option value="">— Válassz raktárhelyet —</option>
                    {locations.map((l) => (
                      <option key={l._id} value={l.code}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="secondary"
                  disabled={!inventoryLoc || loadingInventorySheet}
                  onClick={() => void loadInventorySheetData(inventoryLoc)}
                >
                  <RefreshCw
                    size={15}
                    className={`mr-2 ${loadingInventorySheet ? "animate-spin" : ""}`}
                  />{" "}
                  Készlet Betöltése
                </Button>
              </div>

              {inventoryLoc && (
                <div className="border border-gray-800 rounded-lg overflow-hidden mt-2">
                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-900 text-gray-400 uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="p-3">Cikk</th>
                          <th className="p-3 text-right">Rendszer szerinti készlet</th>
                          <th className="p-3 text-center" style={{ width: "120px" }}>
                            Fizikai darabszám
                          </th>
                          <th className="p-3 text-right">Eltérés</th>
                          <th className="p-3">Jegyzet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingInventorySheet ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500">
                              Cikkek betöltése...
                            </td>
                          </tr>
                        ) : inventoryItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-500">
                              Ezen a tárhelyen jelenleg nincs cikk a rendszerben
                            </td>
                          </tr>
                        ) : (
                          inventoryItems.map((item, idx) => {
                            const diff = Number(item.physical_qty) - item.expected_qty;
                            return (
                              <tr
                                key={item.price_list_item_id}
                                className="border-b border-gray-800/40 hover:bg-gray-800/10"
                              >
                                <td className="p-3 font-medium text-white">
                                  <div>{item.product_name}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">
                                    {item.product_number}
                                  </div>
                                </td>
                                <td className="p-3 text-right font-bold text-gray-300">
                                  {item.expected_qty} {item.unit}
                                </td>
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.physical_qty}
                                    onChange={(e) => {
                                      const updated = [...inventoryItems];
                                      const it = updated[idx];
                                      if (it) {
                                        it.physical_qty = Number(e.target.value);
                                        it.diff_qty =
                                          Number(e.target.value) - item.expected_qty;
                                        setInventoryItems(updated);
                                      }
                                    }}
                                    className="w-20 p-1.5 text-center bg-gray-900 border border-gray-800 text-white rounded text-xs font-bold"
                                  />
                                </td>
                                <td
                                  className={`p-3 text-right font-bold ${diff === 0 ? "text-gray-400" : diff > 0 ? "text-emerald-400" : "text-rose-400"}`}
                                >
                                  {diff > 0 ? "+" : ""}
                                  {diff} {item.unit}
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={item.notes}
                                    placeholder="Eltérés oka..."
                                    onChange={(e) => {
                                      const updated = [...inventoryItems];
                                      const it = updated[idx];
                                      if (it) {
                                        it.notes = e.target.value;
                                        setInventoryItems(updated);
                                      }
                                    }}
                                    className="w-full p-1.5 bg-gray-900 border border-gray-800 text-white rounded text-xs"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {inventoryItems.length > 0 && (
                <div className="flex justify-end gap-3 mt-4 border-t border-gray-850 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowNewInventoryModal(false);
                      setInventoryLoc("");
                      setInventoryItems([]);
                    }}
                  >
                    Mégsem
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={submitting}
                    onClick={handleInventoryTakingSubmit}
                  >
                    {submitting ? "Mentés..." : "Leltár Lezárása és Készlet Frissítése"}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
