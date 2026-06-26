"use client";

import {
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import {
  Plus,
  Minus,
  Search,
  Trash2,
  ChevronRight,
  ShoppingCart,
  CheckCircle2,
  Building2,
  FileText,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Contact, PriceListItem } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

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
    preferred_supplier: p.preferred_supplier,
  };
}

// -------------------------------------------------------
// Típusok
// -------------------------------------------------------
interface PriceItem {
  _id: string;
  code: string;
  name: string;
  category: "hardware" | "software" | "service" | "license";
  unit: string;
  unit_price: number;
  tax_percent: number;
  description: string;
  preferred_supplier: string | null;
  service_price_list_item_id?: string;
}

interface CartItem {
  item: PriceItem;
  qty: number;
  custom_price: number | null; // ha felül akarják bírálni az egységárat
  discount_percent: number; // tételenkénti kedvezmény % (0-100)
  price_snapshot?: any | null;
}

// -------------------------------------------------------
// Árlista: API-ból
// -------------------------------------------------------

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

// -------------------------------------------------------
// WIZARD LÉPÉSEK
// -------------------------------------------------------
const STEPS = ["Fejléc", "Tételek", "Összesítő"];

export default function NewOfferPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [priceList, setPriceList] = useState<PriceItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState({
    contact_id: "",
    title: "",
    valid_days: "30",
    notes: "",
  });

  const [creatingCustom, setCreatingCustom] = useState(false);
  const [customItem, setCustomItem] = useState({
    name: "",
    category: "service" as "hardware" | "software" | "service" | "license",
    unit: "db",
    net_price: 0,
    tax_rate: 27,
  });

  const [servicePriceList, setServicePriceList] = useState<any[]>([]);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [pickerTab, setPickerTab] = useState<"product" | "service">("product");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [pl, cr, spl, sc] = await Promise.all([
          apiJson<unknown[]>("/api/price-list", { signal: ac.signal }),
          apiJson<unknown[]>("/api/contacts", { signal: ac.signal }),
          apiJson<unknown[]>("/api/service-price-list", { signal: ac.signal }),
          apiJson<unknown[]>("/api/service-categories", { signal: ac.signal }),
        ]);
        setPriceList(pl.map((r) => mapPriceListItem(r as PriceListItem)));
        setContacts(
          cr.map((r) => {
            const x = r as Record<string, unknown>;
            return {
              ...(x as unknown as Contact),
              created_at: new Date(String(x["created_at"])),
              updated_at: new Date(String(x["updated_at"])),
            };
          }),
        );
        setServicePriceList(spl);
        setServiceCategories(sc);
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) {
          setLoadErr("Az árlista vagy ügyfelek nem tölthetők be.");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  // -------------------------------------------------------
  // Cart helpers
  // -------------------------------------------------------
  const addItem = (item: PriceItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item._id === item._id);
      if (existing) {
        return prev.map((c) => (c.item._id === item._id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { item, qty: 1, custom_price: null, discount_percent: 0 }];
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.item._id !== id));
  };

  const handleCreateCustomItem = async () => {
    if (!customItem.name) {
      alert("A megnevezés kötelező!");
      return;
    }

    // Simulate what the server would expect for a price list item
    const payload = {
      name: customItem.name,
      type: customItem.category === "hardware" ? "product" : "service",
      category: customItem.category,
      unit: customItem.unit,
      net_price: customItem.net_price,
      currency: "HUF",
      tax_rate: customItem.tax_rate,
      is_active: false, // Archivált
    };

    try {
      const res = await fetch("/api/price-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Hiba történt a tétel létrehozásakor");

      const newItem = await res.json();
      const mapped = mapPriceListItem(newItem);

      // Update local catalog so it shows up if they search it
      setPriceList((prev) => [mapped, ...prev]);

      // Automatically add to cart
      setCart((prev) => {
        const idx = prev.findIndex((c) => c.item._id === mapped._id);
        if (idx >= 0) return prev;
        return [
          ...prev,
          { item: mapped, qty: 1, custom_price: null, discount_percent: 0 },
        ];
      });

      setCreatingCustom(false);
      setCustomItem({
        name: "",
        category: "service",
        unit: "db",
        net_price: 0,
        tax_rate: 27,
      });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const recalculateServiceCartItems = async (
    contactId: string,
    currentCart: CartItem[],
  ) => {
    if (!contactId) return currentCart;
    const updated = await Promise.all(
      currentCart.map(async (c) => {
        if (c.item.service_price_list_item_id) {
          try {
            const res = await apiJson<any>(
              `/api/service-price-list/${c.item.service_price_list_item_id}/calculated-price?contact_id=${contactId}`,
            );
            return {
              ...c,
              item: {
                ...c.item,
                unit_price: res.total_price,
              },
              price_snapshot: {
                internal_base_price: res.internal_base_price,
                client_multiplier: res.client_multiplier,
                multiplier_key: res.multiplier_key,
                calculated_price: res.total_price,
                urgency_multiplier: res.urgency_multiplier,
                pricing_settings_captured_at: res.pricing_settings_captured_at,
              },
            };
          } catch (e) {
            console.error("Error calculating price for item", c.item._id, e);
            return c;
          }
        }
        return c;
      }),
    );
    return updated;
  };

  const handleContactChange = async (contactId: string) => {
    setHeader((prev) => ({ ...prev, contact_id: contactId }));
    const updatedCart = await recalculateServiceCartItems(contactId, cart);
    setCart(updatedCart);
  };

  const addServiceItem = async (srv: any) => {
    let unitPrice = 0;
    let snapshot: any = null;
    if (header.contact_id) {
      try {
        const res = await apiJson<any>(
          `/api/service-price-list/${srv._id}/calculated-price?contact_id=${header.contact_id}`,
        );
        unitPrice = res.total_price;
        snapshot = {
          internal_base_price: res.internal_base_price,
          client_multiplier: res.client_multiplier,
          multiplier_key: res.multiplier_key,
          calculated_price: res.total_price,
          urgency_multiplier: res.urgency_multiplier,
          pricing_settings_captured_at: res.pricing_settings_captured_at,
        };
      } catch (e) {
        console.error("Error calculating price", e);
        unitPrice = srv.internal_base_price ?? 0;
      }
    } else {
      unitPrice = srv.internal_base_price ?? 0;
    }

    const priceItem: PriceItem = {
      _id: `srv-${srv._id}`,
      code: srv.sku,
      name: srv.name,
      category: "service",
      unit: srv.unit ?? "óra",
      unit_price: unitPrice,
      tax_percent: 27,
      description: srv.description ?? "",
      preferred_supplier: null,
      service_price_list_item_id: srv._id,
    };

    setCart((prev) => {
      const existing = prev.find((c) => c.item.service_price_list_item_id === srv._id);
      if (existing) {
        return prev.map((c) =>
          c.item.service_price_list_item_id === srv._id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          item: priceItem,
          qty: 1,
          custom_price: null,
          discount_percent: 0,
          price_snapshot: snapshot,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item._id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    );
  };

  const isInCart = (id: string) =>
    cart.some((c) => c.item._id === id || c.item.service_price_list_item_id === id);

  const totalNet = cart.reduce((sum, c) => {
    const base = (c.custom_price ?? c.item.unit_price) * (1 - c.discount_percent / 100);
    return sum + base * c.qty;
  }, 0);
  const totalVat = cart.reduce((sum, c) => {
    const base = (c.custom_price ?? c.item.unit_price) * (1 - c.discount_percent / 100);
    return sum + base * c.qty * (c.item.tax_percent / 100);
  }, 0);
  const totalGross = totalNet + totalVat;

  const contactLabel = contacts.find((c) => c._id === header.contact_id)?.name ?? "";

  const buildPayload = (status: "draft" | "sent") => {
    const days = Number.parseInt(header.valid_days, 10) || 30;
    const valid_until = new Date();
    valid_until.setDate(valid_until.getDate() + days);
    const lines = cart.map((c) => ({
      price_list_item_id: c.item.service_price_list_item_id ? null : c.item._id,
      service_price_list_item_id: c.item.service_price_list_item_id ?? null,
      description: c.item.name,
      quantity: c.qty,
      unit: c.item.unit,
      net_unit_price: c.custom_price ?? c.item.unit_price,
      tax_rate: c.item.tax_percent,
      discount_percent: c.discount_percent,
      price_snapshot: c.price_snapshot ?? null,
    }));
    return {
      title: header.title.trim(),
      contact_id: header.contact_id,
      status,
      valid_until,
      notes: header.notes.trim() || null,
      lines,
    };
  };

  const saveOffer = async (status: "draft" | "sent") => {
    if (!header.contact_id || !header.title.trim() || cart.length === 0) return;
    setSaving(true);
    setLoadErr(null);
    try {
      await apiJsonBody("/api/offers", "POST", buildPayload(status));
      router.push("/offers");
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const productCartItems = cart.filter((c) => !c.item.service_price_list_item_id);
  const serviceCartItems = cart.filter((c) => !!c.item.service_price_list_item_id);

  const filtered = priceList.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      categoryLabel[p.category].toLowerCase().includes(search.toLowerCase()),
  );

  const filteredServices = servicePriceList.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const groupedServices = serviceCategories
    .map((cat) => ({
      category: cat,
      items: filteredServices.filter((s) => s.category_id === cat._id),
    }))
    .filter((g) => g.items.length > 0);

  const renderCartItem = (c: CartItem) => (
    <div
      key={c.item._id}
      style={{
        padding: "12px 14px",
        background: "var(--color-bg-secondary, #111)",
        borderRadius: "8px",
        border: "1px solid var(--color-border-subtle, #1a1a1a)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "8px",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.82rem",
              lineHeight: 1.3,
            }}
          >
            {c.item.name}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--color-text-muted, #555)",
              marginTop: "2px",
            }}
          >
            {fmt(c.custom_price ?? c.item.unit_price)} / {c.item.unit}
            {c.discount_percent > 0 && (
              <span
                style={{
                  marginLeft: "6px",
                  color: "var(--color-status-success, #22c55e)",
                  fontWeight: 700,
                }}
              >
                (-{c.discount_percent}%)
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => removeItem(c.item._id)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted, #555)",
            padding: "2px",
            borderRadius: "4px",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Qty controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => updateQty(c.item._id, -1)}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              background: "var(--color-bg-card, #1a1a1a)",
              border: "1px solid var(--color-border-default, #222)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-muted, #555)",
            }}
          >
            <Minus size={12} />
          </button>
          <span
            style={{
              fontWeight: 700,
              fontSize: "0.9rem",
              minWidth: "28px",
              textAlign: "center",
            }}
          >
            {c.qty}
          </span>
          <button
            onClick={() => updateQty(c.item._id, 1)}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              background: "var(--color-bg-card, #1a1a1a)",
              border: "1px solid var(--color-border-default, #222)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-muted, #555)",
            }}
          >
            <Plus size={12} />
          </button>
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--color-text-muted, #555)",
              marginLeft: "4px",
            }}
          >
            {c.item.unit}
          </span>
        </div>
        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>
          {fmt(
            (c.custom_price ?? c.item.unit_price) *
              (1 - c.discount_percent / 100) *
              c.qty,
          )}
        </span>
      </div>

      {/* Discount input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "8px",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--color-text-muted, #555)",
            whiteSpace: "nowrap",
          }}
        >
          Kedvezmény:
        </span>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={c.discount_percent}
          onChange={(e) => {
            const val = Math.min(100, Math.max(0, Number(e.target.value)));
            setCart((prev) =>
              prev.map((ci) =>
                ci.item._id === c.item._id ? { ...ci, discount_percent: val } : ci,
              ),
            );
          }}
          style={{
            width: "52px",
            padding: "2px 6px",
            borderRadius: "5px",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-input)",
            color: "inherit",
            fontSize: "0.78rem",
            textAlign: "center",
          }}
        />
        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>%</span>
      </div>
    </div>
  );

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Új ajánlat készítése"
        subtitle="Kattintsd össze az ajánlat tételeit az árlistából"
        actions={
          <Button variant="secondary" onClick={() => router.push("/offers")}>
            Vissza
          </Button>
        }
      />

      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)] px-1" role="alert">
          {loadErr}
        </p>
      )}

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < STEPS.length - 1 ? 1 : "unset",
            }}
          >
            <button
              onClick={() => i <= step && setStep(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: "none",
                cursor: i <= step ? "pointer" : "default",
                color:
                  i === step
                    ? "var(--color-accent-primary, #e53935)"
                    : i < step
                      ? "var(--color-status-success, #22c55e)"
                      : "var(--color-text-muted, #555)",
                fontWeight: i === step ? 700 : 500,
                fontSize: "0.875rem",
                padding: "6px 0",
              }}
            >
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background:
                    i === step
                      ? "var(--color-accent-primary, #e53935)"
                      : i < step
                        ? "var(--color-status-success, #22c55e)"
                        : "var(--color-border-default, #222)",
                  color:
                    i >= step && i !== step ? "var(--color-text-muted, #555)" : "#fff",
                  flexShrink: 0,
                }}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background:
                    i < step
                      ? "var(--color-status-success, #22c55e)"
                      : "var(--color-border-default, #222)",
                  margin: "0 12px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ============================================================
          STEP 0 – Fejléc adatok
      ============================================================ */}
      {step === 0 && (
        <Card className="p-8">
          <h2
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--color-text-muted, #555)",
              marginBottom: "24px",
            }}
          >
            Ajánlat alapadatok
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxWidth: "560px",
            }}
          >
            <div className="flex flex-col gap-1.5 max-w-[560px]">
              <Label>Ügyfél *</Label>
              <Select
                value={header.contact_id || undefined}
                onValueChange={handleContactChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Válassz ügyfelet" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Ajánlat tárgya *"
              placeholder="pl. Irodaház kamerarendszer bővítése"
              value={header.title}
              onChange={(e) => setHeader({ ...header, title: e.target.value })}
            />
            <Input
              label="Érvényességi idő (nap)"
              placeholder="30"
              value={header.valid_days}
              onChange={(e) => setHeader({ ...header, valid_days: e.target.value })}
            />
            <Textarea
              label="Megjegyzések (opcionális)"
              placeholder="Pl. Az ár tartalmazza a kiszállást és a telepítést."
              value={header.notes}
              onChange={(e) => setHeader({ ...header, notes: e.target.value })}
              rows={3}
            />
          </div>
          <div style={{ marginTop: "28px" }}>
            <Button
              variant="primary"
              onClick={() => setStep(1)}
              style={{ opacity: !header.contact_id || !header.title ? 0.5 : 1 }}
            >
              Tovább: Tételek hozzáadása
              <ChevronRight size={16} style={{ marginLeft: "6px" }} />
            </Button>
          </div>
        </Card>
      )}

      {/* ============================================================
          STEP 1 – Tételek picker + kosár
      ============================================================ */}
      {step === 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {/* Bal: Árlista picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                background: "var(--color-bg-secondary, #111)",
                padding: "4px",
                borderRadius: "8px",
              }}
            >
              <button
                onClick={() => setPickerTab("product")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: pickerTab === "product" ? 600 : 500,
                  background:
                    pickerTab === "product"
                      ? "var(--color-bg-card, #1a1a1a)"
                      : "transparent",
                  color:
                    pickerTab === "product" ? "#fff" : "var(--color-text-muted, #555)",
                  border:
                    pickerTab === "product"
                      ? "1px solid var(--color-border-subtle)"
                      : "1px solid transparent",
                  boxShadow:
                    pickerTab === "product" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Fizikai termékek
              </button>
              <button
                onClick={() => setPickerTab("service")}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: pickerTab === "service" ? 600 : 500,
                  background:
                    pickerTab === "service"
                      ? "var(--color-bg-card, #1a1a1a)"
                      : "transparent",
                  color:
                    pickerTab === "service" ? "#fff" : "var(--color-text-muted, #555)",
                  border:
                    pickerTab === "service"
                      ? "1px solid var(--color-border-subtle)"
                      : "1px solid transparent",
                  boxShadow:
                    pickerTab === "service" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Szolgáltatások
              </button>
            </div>
            <Card className="p-5">
              <div style={{ position: "relative", display: "flex", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1 }}>
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
                    placeholder="Szűrés: megnevezés, cikkszám, kategória..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: "36px" }}
                  />
                </div>
                {pickerTab === "product" && (
                  <Button
                    variant="secondary"
                    onClick={() => setCreatingCustom(!creatingCustom)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {creatingCustom ? "Mégsem" : "+ Új egyedi tétel"}
                  </Button>
                )}
              </div>

              {pickerTab === "product" && creatingCustom && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "16px",
                    background: "var(--color-bg-secondary)",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                    Új egyedi / archivált tétel rögzítése
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: "12px",
                      marginBottom: "12px",
                    }}
                  >
                    <Input
                      label="Megnevezés *"
                      value={customItem.name}
                      onChange={(e) =>
                        setCustomItem({ ...customItem, name: e.target.value })
                      }
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <Label>Kategória *</Label>
                        <Select
                          value={customItem.category}
                          onValueChange={(v: any) =>
                            setCustomItem({ ...customItem, category: v })
                          }
                        >
                          <SelectTrigger className="w-full h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hardware">Hardver</SelectItem>
                            <SelectItem value="software">Szoftver</SelectItem>
                            <SelectItem value="service">Szolgáltatás</SelectItem>
                            <SelectItem value="license">Licenc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        label="Egység *"
                        value={customItem.unit}
                        onChange={(e) =>
                          setCustomItem({ ...customItem, unit: e.target.value })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <Input
                        type="number"
                        label="Nettó egységár *"
                        value={String(customItem.net_price)}
                        onChange={(e) =>
                          setCustomItem({
                            ...customItem,
                            net_price: Number(e.target.value),
                          })
                        }
                        className="h-9 text-sm"
                      />
                      <Input
                        type="number"
                        label="ÁFA (%) *"
                        value={String(customItem.tax_rate)}
                        onChange={(e) =>
                          setCustomItem({
                            ...customItem,
                            tax_rate: Number(e.target.value),
                          })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleCreateCustomItem}>
                    Tétel mentése és hozzáadása
                  </Button>
                </div>
              )}
            </Card>

            {/* Termék kártyák */}
            {pickerTab === "product" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {filtered.map((item) => {
                  const inCart = isInCart(item._id);
                  return (
                    <button
                      key={item._id}
                      onClick={() => addItem(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "16px 20px",
                        background: inCart
                          ? "rgba(34,197,94,0.06)"
                          : "var(--color-bg-card, #1a1a1a)",
                        border: inCart
                          ? "1px solid rgba(34,197,94,0.3)"
                          : "1px solid var(--color-border-default, #222)",
                        borderRadius: "10px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.12s",
                        width: "100%",
                      }}
                      onMouseEnter={(e) => {
                        if (!inCart)
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "var(--color-accent-primary, #e53935)";
                      }}
                      onMouseLeave={(e) => {
                        if (!inCart)
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "var(--color-border-default, #222)";
                      }}
                    >
                      {/* Zöld pipa ha már kosárban van */}
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          background: inCart
                            ? "rgba(34,197,94,0.15)"
                            : "var(--color-bg-secondary, #111)",
                          color: inCart ? "#22c55e" : "var(--color-text-muted, #555)",
                          transition: "all 0.12s",
                        }}
                      >
                        {inCart ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                      </div>

                      {/* Név + leírás */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "3px",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                            {item.name}
                          </span>
                          <Badge variant={categoryVariant[item.category]}>
                            {categoryLabel[item.category]}
                          </Badge>
                          {inCart && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                color: "#22c55e",
                              }}
                            >
                              Kosárban
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--color-text-muted, #555)",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              color: "var(--color-text-secondary, #a0a0a0)",
                            }}
                          >
                            {item.code}
                          </span>
                          {item.preferred_supplier && (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <Building2 size={10} />
                              {item.preferred_supplier}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ár */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {fmt(item.unit_price)}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-muted, #555)",
                          }}
                        >
                          / {item.unit} · nettó
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Szolgáltatás kártyák */}
            {pickerTab === "service" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {groupedServices.map((group) => (
                  <div key={group.category._id}>
                    <h3
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase",
                        marginBottom: "8px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {group.category.name}
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {group.items.map((item) => {
                        const inCart = isInCart(item._id);
                        return (
                          <button
                            key={item._id}
                            onClick={() => addServiceItem(item)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              padding: "16px 20px",
                              background: inCart
                                ? "rgba(34,197,94,0.06)"
                                : "var(--color-bg-card, #1a1a1a)",
                              border: inCart
                                ? "1px solid rgba(34,197,94,0.3)"
                                : "1px solid var(--color-border-default, #222)",
                              borderRadius: "10px",
                              textAlign: "left",
                              cursor: "pointer",
                              transition: "all 0.12s",
                              width: "100%",
                            }}
                            onMouseEnter={(e) => {
                              if (!inCart)
                                (e.currentTarget as HTMLElement).style.borderColor =
                                  "var(--color-accent-primary, #e53935)";
                            }}
                            onMouseLeave={(e) => {
                              if (!inCart)
                                (e.currentTarget as HTMLElement).style.borderColor =
                                  "var(--color-border-default, #222)";
                            }}
                          >
                            {/* Zöld pipa ha már kosárban van */}
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                background: inCart
                                  ? "rgba(34,197,94,0.15)"
                                  : "var(--color-bg-secondary, #111)",
                                color: inCart
                                  ? "#22c55e"
                                  : "var(--color-text-muted, #555)",
                                transition: "all 0.12s",
                              }}
                            >
                              {inCart ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                            </div>

                            {/* Név + leírás */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  marginBottom: "3px",
                                }}
                              >
                                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                                  {item.name}
                                </span>
                                <Badge variant="warning">Szolgáltatás</Badge>
                                {inCart && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      color: "#22c55e",
                                    }}
                                  >
                                    Kosárban
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--color-text-muted, #555)",
                                  display: "flex",
                                  gap: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    color: "var(--color-text-secondary, #a0a0a0)",
                                  }}
                                >
                                  {item.sku}
                                </span>
                              </div>
                            </div>

                            {/* Ár */}
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                                Auto-kalkulált
                              </div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--color-text-muted, #555)",
                                }}
                              >
                                / {item.unit || "óra"} · nettó
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {groupedServices.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--color-text-muted)",
                      padding: "20px",
                    }}
                  >
                    Nincs találat a szolgáltatások között.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Jobb: Kosár */}
          <div style={{ position: "sticky", top: "20px" }}>
            <Card className="p-6">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                <ShoppingCart
                  size={18}
                  style={{ color: "var(--color-accent-primary, #e53935)" }}
                />
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Ajánlat tételei</h3>
                {cart.length > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: "var(--color-accent-badge-bg, #3b0a0a)",
                      color: "var(--color-accent-primary, #e53935)",
                      padding: "2px 8px",
                      borderRadius: "999px",
                    }}
                  >
                    {cart.length} tétel
                  </span>
                )}
              </div>

              {cart.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                    color: "var(--color-text-muted, #555)",
                    fontSize: "0.85rem",
                  }}
                >
                  <ShoppingCart
                    size={36}
                    style={{ opacity: 0.3, marginBottom: "12px" }}
                  />
                  <p>Kattints egy tételre a bal oldalon a hozzáadáshoz</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {productCartItems.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginBottom: "8px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "var(--color-text-muted)",
                          textTransform: "uppercase",
                          marginLeft: "4px",
                        }}
                      >
                        Fizikai termékek
                      </h4>
                      {productCartItems.map(renderCartItem)}
                    </div>
                  )}
                  {serviceCartItems.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginBottom: "8px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: "var(--color-text-muted)",
                          textTransform: "uppercase",
                          marginLeft: "4px",
                          marginTop: "8px",
                        }}
                      >
                        Szolgáltatások
                      </h4>
                      {serviceCartItems.map(renderCartItem)}
                    </div>
                  )}

                  {/* Összesítő */}
                  <div
                    style={{
                      borderTop: "1px solid var(--color-border-default, #222)",
                      paddingTop: "14px",
                      marginTop: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary, #a0a0a0)",
                      }}
                    >
                      <span>Nettó összesen</span>
                      <span>{fmt(totalNet)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary, #a0a0a0)",
                      }}
                    >
                      <span>ÁFA (27%)</span>
                      <span>{fmt(totalVat)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 700,
                        fontSize: "1rem",
                        marginTop: "4px",
                      }}
                    >
                      <span>Bruttó összesen</span>
                      <span style={{ color: "var(--color-accent-primary, #e53935)" }}>
                        {fmt(totalGross)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {cart.length > 0 && (
                <Button
                  variant="primary"
                  style={{ width: "100%", marginTop: "16px" }}
                  onClick={() => setStep(2)}
                >
                  Tovább: Ellenőrzés
                  <ChevronRight size={16} style={{ marginLeft: "6px" }} />
                </Button>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================
          STEP 2 – Összesítő / Előnézet
      ============================================================ */}
      {step === 2 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "760px",
          }}
        >
          <Card className="p-8">
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--color-text-muted, #555)",
                marginBottom: "20px",
              }}
            >
              Ajánlat előnézet
            </h2>

            {/* Fejléc info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                padding: "16px",
                background: "var(--color-bg-secondary, #111)",
                borderRadius: "10px",
                marginBottom: "24px",
              }}
            >
              {[
                { label: "Ügyfél", value: contactLabel || "—" },
                { label: "Tárgy", value: header.title },
                { label: "Érvényes", value: `${header.valid_days} nap` },
                {
                  label: "Dátum",
                  value: new Date().toLocaleDateString("hu-HU"),
                },
              ].map((f) => (
                <div key={f.label}>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--color-text-muted, #555)",
                      marginBottom: "4px",
                    }}
                  >
                    {f.label}
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto border border-t-0 border-[var(--color-border-subtle)] rounded-b-lg mt-[-24px]">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Megnevezés
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[80px]">
                      Menny.
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] text-right w-[110px]">
                      Egységár
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] text-right w-[120px]">
                      Összesen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)] text-sm">
                  {cart.map((c) => (
                    <tr
                      key={c.item._id}
                      className="bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {c.item.name}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {c.item.code}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.qty}{" "}
                        <span className="text-[var(--color-text-muted)] text-xs">
                          {c.item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">
                        {fmt(c.custom_price ?? c.item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-primary)]">
                        {fmt((c.custom_price ?? c.item.unit_price) * c.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Végösszeg */}
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "40px",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary, #a0a0a0)",
                }}
              >
                <span>Nettó összesen</span>
                <span>{fmt(totalNet)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "40px",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary, #a0a0a0)",
                }}
              >
                <span>ÁFA (27%)</span>
                <span>{fmt(totalVat)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "40px",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  borderTop: "1px solid var(--color-border-default, #222)",
                  paddingTop: "10px",
                  marginTop: "4px",
                }}
              >
                <span>Bruttó összesen</span>
                <span style={{ color: "var(--color-accent-primary, #e53935)" }}>
                  {fmt(totalGross)}
                </span>
              </div>
            </div>

            {header.notes && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "14px",
                  background: "var(--color-bg-secondary, #111)",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary, #a0a0a0)",
                  borderLeft: "3px solid var(--color-border-default, #222)",
                }}
              >
                <strong
                  style={{
                    color: "var(--color-text-muted, #555)",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                  }}
                >
                  Megjegyzés
                </strong>
                <p style={{ marginTop: "4px" }}>{header.notes}</p>
              </div>
            )}
          </Card>

          {/* Action gombok */}
          <div style={{ display: "flex", gap: "12px" }}>
            <Button variant="secondary" onClick={() => setStep(1)}>
              Vissza szerkeszteni
            </Button>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => void saveOffer("draft")}
            >
              <FileText size={16} style={{ marginRight: "6px" }} />
              Mentés piszkozatként
            </Button>
            <Button
              variant="primary"
              disabled={saving}
              onClick={() => void saveOffer("sent")}
            >
              <Send size={16} style={{ marginRight: "6px" }} />
              {saving ? "Mentés…" : "Mentés véglegesként"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
