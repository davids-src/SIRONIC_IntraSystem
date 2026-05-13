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
import type { PriceListItem } from "@crm/types";

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
      } catch {
        if (!ac.signal.aborted) {
          setLoadError("Az árlista nem elérhető.");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = prices.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      categoryLabel[p.category].toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: prices.length,
    active: prices.filter((p) => p.status === "active").length,
    services: prices.filter((p) => p.category === "service").length,
  };

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const margin = (item: PriceItem) => {
    if (!item.last_purchase_price) return null;
    const pct = Math.round(
      ((item.unit_price - item.last_purchase_price) / item.unit_price) * 100,
    );
    return pct;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Árlista"
        subtitle="Szolgáltatások, hardverek és licencek alapárai ajánlatkészítéshez"
        actions={
          <Button variant="primary">
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
          },
          {
            label: "Aktív tételek",
            count: counts.active,
            icon: <Tag size={16} />,
            color: "#22c55e",
          },
          {
            label: "Szolgáltatások",
            count: counts.services,
            icon: <Server size={16} />,
            color: "#f59e0b",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
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
        ))}
      </div>

      {/* Kereső */}
      <Card className="p-5">
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
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
              placeholder="Keresés cikkszám vagy megnevezés alapján..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
          <Button variant="secondary">
            <Filter size={15} style={{ marginRight: "6px" }} />
            Szűrők
          </Button>
        </div>
      </Card>

      {/* Árlista sorok – kattintható, expandable */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Fejléc */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 130px 110px 120px 120px 40px",
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
                  gridTemplateColumns: "120px 1fr 130px 110px 120px 120px 40px",
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
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{item.name}</div>
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
                      >
                        <ShoppingCart size={13} style={{ marginRight: "5px" }} />
                        Ajánlathoz add
                      </Button>
                      <Button
                        variant="secondary"
                        style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                      >
                        <Plus size={13} style={{ marginRight: "5px" }} />
                        Új bszerz. rögzítése
                      </Button>
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
