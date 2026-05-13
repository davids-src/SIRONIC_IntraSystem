"use client";

import { PageHeader, Card, Badge, Button, Input, Textarea } from "@crm/ui";
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
import { useState } from "react";

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
}

interface CartItem {
  item: PriceItem;
  qty: number;
  custom_price: number | null; // ha felül akarják bírálni az egységárat
}

// -------------------------------------------------------
// Mock árlista adatok
// -------------------------------------------------------
const priceList: PriceItem[] = [
  {
    _id: "p1",
    code: "SRV-INST-01",
    name: "Szerver fizikai telepítése",
    category: "service",
    unit: "óra",
    unit_price: 25000,
    tax_percent: 27,
    description: "Szerver beépítése, kábelezése, alapvető tesztek",
    preferred_supplier: null,
  },
  {
    _id: "p2",
    code: "NET-CONF-01",
    name: "Hálózati switch konfiguráció (L2/L3)",
    category: "service",
    unit: "óra",
    unit_price: 30000,
    tax_percent: 27,
    description: "VLAN-ok, útválasztás, port security beállítása",
    preferred_supplier: null,
  },
  {
    _id: "p3",
    code: "CAM-HIK-2MP",
    name: "Hikvision DS-2CD2123G2-I 2MP kamera",
    category: "hardware",
    unit: "db",
    unit_price: 18000,
    tax_percent: 27,
    description: "2MP IP kamera, IR, H.265+, PoE",
    preferred_supplier: "Power Biztonságtechnika",
  },
  {
    _id: "p4",
    code: "HW-SRV-STD",
    name: "Standard 1U Rack Szerver (Alapkonfig)",
    category: "hardware",
    unit: "db",
    unit_price: 850000,
    tax_percent: 27,
    description: "1U szerver, 32GB RAM, 2x 1TB SSD, 1x CPU",
    preferred_supplier: "Acer Hungary Kft.",
  },
  {
    _id: "p5",
    code: "SW-MS-365",
    name: "Microsoft 365 Business Standard",
    category: "license",
    unit: "felh/hó",
    unit_price: 4500,
    tax_percent: 27,
    description: "Havi előfizetés felhasználónként",
    preferred_supplier: null,
  },
  {
    _id: "p6",
    code: "NET-CABLE-CAT6",
    name: "Cat6 UTP kábel telepítése",
    category: "service",
    unit: "fm",
    unit_price: 1200,
    tax_percent: 27,
    description: "Strukturált hálózat kiépítése Cat6-os kábellel",
    preferred_supplier: null,
  },
  {
    _id: "p7",
    code: "SEC-KESZULEK-01",
    name: "Riasztóközpont csere",
    category: "hardware",
    unit: "db",
    unit_price: 65000,
    tax_percent: 27,
    description: "Honeywell Galaxy Flex3 12 zónás vezérlő",
    preferred_supplier: null,
  },
];

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
  const [header, setHeader] = useState({
    contact: "",
    title: "",
    valid_days: "30",
    notes: "",
  });

  // -------------------------------------------------------
  // Cart helpers
  // -------------------------------------------------------
  const addItem = (item: PriceItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item._id === item._id);
      if (existing) {
        return prev.map((c) => (c.item._id === item._id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { item, qty: 1, custom_price: null }];
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.item._id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item._id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    );
  };

  const isInCart = (id: string) => cart.some((c) => c.item._id === id);

  const totalNet = cart.reduce(
    (sum, c) => sum + (c.custom_price ?? c.item.unit_price) * c.qty,
    0,
  );
  const totalVat = cart.reduce(
    (sum, c) =>
      sum + (c.custom_price ?? c.item.unit_price) * c.qty * (c.item.tax_percent / 100),
    0,
  );
  const totalGross = totalNet + totalVat;

  const filtered = priceList.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      categoryLabel[p.category].toLowerCase().includes(search.toLowerCase()),
  );

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Új ajánlat készítése"
        subtitle="Kattintsd össze az ajánlat tételeit az árlistából"
        actions={
          <Button variant="secondary" onClick={() => router.push("/offers")}>
            Vissza
          </Button>
        }
      />

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
            <Input
              label="Ügyfél neve *"
              placeholder="pl. Tech Solutions Kft."
              value={header.contact}
              onChange={(e) => setHeader({ ...header, contact: e.target.value })}
            />
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
              style={{ opacity: !header.contact || !header.title ? 0.5 : 1 }}
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
            <Card className="p-5">
              <div style={{ position: "relative" }}>
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
            </Card>

            {/* Termék kártyák */}
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
                            style={{ display: "flex", alignItems: "center", gap: "3px" }}
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
                  {cart.map((c) => (
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
                        <div
                          style={{ display: "flex", alignItems: "center", gap: "6px" }}
                        >
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
                          {fmt((c.custom_price ?? c.item.unit_price) * c.qty)}
                        </span>
                      </div>
                    </div>
                  ))}

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
                { label: "Ügyfél", value: header.contact },
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
            <Button variant="secondary">
              <FileText size={16} style={{ marginRight: "6px" }} />
              Mentés piszkozatként
            </Button>
            <Button variant="primary">
              <Send size={16} style={{ marginRight: "6px" }} />
              Ajánlat véglegesítése
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
