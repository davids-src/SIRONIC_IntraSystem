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
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, use, useCallback } from "react";
import type { Contact, PriceListItem, Offer } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

function mapPriceListItem(p: PriceListItem): PriceItem {
  const category =
    p.category ||
    (p.type === "product" || p.type === "package" ? "Hardver" : "Szolgáltatás");
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

interface PriceItem {
  _id: string;
  code: string;
  name: string;
  category: string;
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
  custom_price: number | null;
  discount_percent: number;
  price_snapshot?: any | null;
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

const STEPS = ["Fejléc", "Tételek", "Összesítő"];

export default function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [priceList, setPriceList] = useState<PriceItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

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
  const [serviceSubcategories, setServiceSubcategories] = useState<any[]>([]);
  const [serviceCalculatedPrices, setServiceCalculatedPrices] = useState<
    Record<string, number>
  >({});
  const [pickerTab, setPickerTab] = useState<"product" | "service">("product");

  useEffect(() => {
    if (!header.contact_id || servicePriceList.length === 0) {
      setServiceCalculatedPrices({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          servicePriceList.map(async (s: any) => {
            try {
              const res = await apiJson<any>(
                `/api/service-price-list/${s._id}/calculated-price?contact_id=${header.contact_id}`,
              );
              return [
                s._id,
                res.final_price ?? res.calculated_price ?? s.internal_base_price ?? 0,
              ];
            } catch {
              return [s._id, s.internal_base_price ?? 0];
            }
          }),
        );
        if (!cancelled) {
          setServiceCalculatedPrices(Object.fromEntries(entries));
        }
      } catch (e) {
        console.error("Error fetching service calculated prices", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [header.contact_id, servicePriceList]);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("__all__");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("__all__");
  const [itemCategories, setItemCategories] = useState<any[]>([]);

  const getItemCategoryName = useCallback(
    (catId: string) => {
      if (!catId) return "Hardver";
      const found = itemCategories.find(
        (c: any) => c.id === catId || c._id === catId || c.name === catId,
      );
      if (found && found.name) return found.name;
      if ((categoryLabel as any)[catId]) return (categoryLabel as any)[catId];
      if (catId.length > 20 && !catId.includes(" ")) return "Termék";
      return catId;
    },
    [itemCategories],
  );

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [pl, cr, spl, sc, ssc, doc, st] = await Promise.all([
          apiJson<unknown[]>("/api/price-list", { signal: ac.signal }),
          apiJson<unknown[]>("/api/contacts", { signal: ac.signal }),
          apiJson<unknown[]>("/api/service-price-list", { signal: ac.signal }),
          apiJson<unknown[]>("/api/service-categories", { signal: ac.signal }),
          apiJson<unknown[]>("/api/service-subcategories", { signal: ac.signal }),
          apiJson<Offer>(`/api/offers/${id}`, { signal: ac.signal }),
          apiJson<any>("/api/settings", { signal: ac.signal }).catch(() => null),
        ]);

        setPriceList(pl.map((r) => mapPriceListItem(r as PriceListItem)));
        setContacts(cr as Contact[]);
        setServicePriceList(spl);
        setServiceCategories(sc);
        setServiceSubcategories(ssc);
        if (st && st.item_categories) {
          setItemCategories(st.item_categories);
        }

        const validUntilDate = doc.valid_until ? new Date(doc.valid_until) : new Date();
        const createdAtDate = doc.created_at ? new Date(doc.created_at) : new Date();
        const validDaysDiff = Math.max(
          1,
          Math.round(
            (validUntilDate.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        setHeader({
          contact_id: doc.contact_id,
          title: doc.title,
          valid_days: String(validDaysDiff),
          notes: doc.notes ?? "",
        });

        const mappedCart: CartItem[] = doc.lines.map((line) => {
          const isService = !!line.service_price_list_item_id;
          const itemId = line.price_list_item_id || line.service_price_list_item_id || "";
          const priceItem: PriceItem = {
            _id: itemId,
            code: "",
            name: line.description,
            category: isService ? "service" : "hardware",
            unit: line.unit,
            unit_price: line.net_unit_price,
            tax_percent: line.tax_rate,
            description: "",
            preferred_supplier: null,
            service_price_list_item_id: line.service_price_list_item_id || undefined,
          };
          return {
            item: priceItem,
            qty: line.quantity,
            custom_price: line.net_unit_price,
            discount_percent: line.discount_percent ?? 0,
            price_snapshot: line.price_snapshot,
          };
        });
        setCart(mappedCart);
        setLoading(false);
      } catch (err) {
        setLoadErr("Nem sikerült betölteni az ajánlatot.");
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id, router]);

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

  const saveOffer = async (forcedStatus?: "draft" | "sent") => {
    if (!header.contact_id || !header.title.trim() || cart.length === 0) return;
    setSaving(true);
    setLoadErr(null);
    try {
      // Keep existing offer status if not forced
      const statusToSave = forcedStatus ?? "draft";
      await apiJsonBody(`/api/offers/${id}`, "PATCH", buildPayload(statusToSave));
      router.push(`/offers/${id}`);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const addToCart = (item: PriceItem) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.item._id === item._id);
      if (existing) {
        return prev.map((x) => (x.item._id === item._id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [...prev, { item, qty: 1, custom_price: null, discount_percent: 0 }];
    });
  };

  const addServiceItem = async (service: any) => {
    try {
      const queryParams = header.contact_id
        ? `?contact_id=${encodeURIComponent(header.contact_id)}`
        : "";
      const res = await apiJson<any>(
        `/api/service-price-list/${service._id}/calculated-price${queryParams}`,
      );
      const calculatedPrice =
        res.final_price ?? res.calculated_price ?? service.internal_base_price ?? 0;
      const snapshot = {
        internal_base_price: res.internal_base_price ?? 0,
        client_multiplier: res.client_multiplier ?? 1,
        multiplier_key: res.multiplier_key ?? "",
        calculated_price: calculatedPrice,
        urgency_multiplier: res.urgency_multiplier ?? 1,
        pricing_settings_captured_at:
          res.pricing_settings_captured_at ?? new Date().toISOString(),
      };

      const priceItem: PriceItem = {
        _id: service._id,
        code: service.sku || "SRV-CALC",
        name: service.name,
        category: "service",
        unit: service.unit || "db",
        unit_price: calculatedPrice,
        tax_percent: service.tax_rate ?? 27,
        description: service.description ?? "",
        preferred_supplier: null,
        service_price_list_item_id: service._id,
      };

      setCart((prev) => {
        const existing = prev.find(
          (x) => x.item.service_price_list_item_id === service._id,
        );
        if (existing) {
          return prev.map((x) =>
            x.item.service_price_list_item_id === service._id
              ? { ...x, qty: x.qty + 1 }
              : x,
          );
        }
        return [
          ...prev,
          {
            item: priceItem,
            qty: 1,
            custom_price: calculatedPrice,
            discount_percent: 0,
            price_snapshot: snapshot,
          },
        ];
      });
    } catch (e) {
      alert("Hiba a szolgáltatás kalkulációja során.");
    }
  };

  const updateQty = (itemId: string, diff: number) => {
    setCart((prev) =>
      prev
        .map((x) => (x.item._id === itemId ? { ...x, qty: x.qty + diff } : x))
        .filter((x) => x.qty > 0),
    );
  };

  const updateCustomPrice = (itemId: string, priceStr: string) => {
    const val = priceStr.trim() === "" ? null : Number.parseFloat(priceStr) || 0;
    setCart((prev) =>
      prev.map((x) => (x.item._id === itemId ? { ...x, custom_price: val } : x)),
    );
  };

  const updateDiscount = (itemId: string, discountStr: string) => {
    const val = Math.min(100, Math.max(0, Number.parseInt(discountStr, 10) || 0));
    setCart((prev) =>
      prev.map((x) => (x.item._id === itemId ? { ...x, discount_percent: val } : x)),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((x) => x.item._id !== itemId));
  };

  const addCustomItemToCart = () => {
    if (!customItem.name.trim()) return;
    const item: PriceItem = {
      _id: `custom-${Date.now()}`,
      code: "EGYÉB",
      name: customItem.name.trim(),
      category: customItem.category,
      unit: customItem.unit,
      unit_price: customItem.net_price,
      tax_percent: customItem.tax_rate,
      description: "Egyedi tétel",
      preferred_supplier: null,
    };
    addToCart(item);
    setCreatingCustom(false);
    setCustomItem({
      name: "",
      category: "service",
      unit: "db",
      net_price: 0,
      tax_rate: 27,
    });
  };

  const filtered = priceList.filter(
    (p) =>
      (productCategoryFilter === "__all__" || p.category === productCategoryFilter) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        getItemCategoryName(p.category).toLowerCase().includes(search.toLowerCase())),
  );

  const productCategories: { id: string; label: string; count: number }[] = (() => {
    return Array.from(new Set(priceList.map((p) => p.category)))
      .map((cat) => ({
        id: cat,
        label: getItemCategoryName(cat),
        count: priceList.filter((p) => p.category === cat).length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "hu"));
  })();

  const filteredServices = servicePriceList.filter((s: any) => {
    let matchCat = true;
    if (serviceCategoryFilter !== "__all__") {
      if (serviceCategoryFilter.startsWith("cat:")) {
        matchCat = s.category_id === serviceCategoryFilter.replace("cat:", "");
      } else if (serviceCategoryFilter.startsWith("sub:")) {
        matchCat = s.subcategory_id === serviceCategoryFilter.replace("sub:", "");
      }
    }
    const q = search.toLowerCase();
    const matchSearch =
      !q || s.name.toLowerCase().includes(q) || (s.sku ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (loading) return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ajánlat szerkesztése"
        subtitle={`Ajánlat módosítása`}
        actions={
          <Button variant="secondary" onClick={() => router.push(`/offers/${id}`)}>
            Mégse
          </Button>
        }
      />

      {loadErr && (
        <div className="text-red-400 p-4 rounded-lg bg-red-950/30">{loadErr}</div>
      )}

      {/* Steps bar */}
      <div className="flex items-center gap-4 border-b border-[#222] pb-4">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                step === i
                  ? "bg-[var(--color-accent-primary)] text-white"
                  : "bg-[#111] text-gray-500"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={
                step === i ? "text-white font-medium text-sm" : "text-gray-500 text-sm"
              }
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 0: Fejléc */}
      {step === 0 && (
        <Card className="p-6 flex flex-col gap-5 max-w-xl">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-contact">Partner (Ügyfél) *</Label>
            <Select
              value={header.contact_id || "__empty__"}
              onValueChange={(v) =>
                setHeader((prev) => ({ ...prev, contact_id: v === "__empty__" ? "" : v }))
              }
            >
              <SelectTrigger id="offer-contact" className="w-full">
                <SelectValue placeholder="Válassz partnert…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__empty__">Válassz partnert…</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Ajánlat címe *"
            placeholder="Pl. Iroda felújítási munkálatok, Riasztó szerelés..."
            value={header.title}
            onChange={(e) => setHeader((prev) => ({ ...prev, title: e.target.value }))}
          />

          <Input
            label="Érvényességi idő (nap) *"
            type="number"
            value={header.valid_days}
            onChange={(e) =>
              setHeader((prev) => ({ ...prev, valid_days: e.target.value }))
            }
          />

          <Textarea
            label="Megjegyzés az ajánlathoz"
            placeholder="Az ajánlat kísérőszövege, fizetési feltételek..."
            rows={4}
            value={header.notes}
            onChange={(e) => setHeader((prev) => ({ ...prev, notes: e.target.value }))}
          />

          <div className="flex justify-end pt-4 border-t border-[#222]">
            <Button
              variant="primary"
              disabled={!header.contact_id || !header.title.trim()}
              onClick={() => setStep(1)}
            >
              Tovább a tételekre <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: Tételek */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Picker */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <Card className="p-4 flex flex-col gap-4">
              <div className="flex gap-2">
                <Button
                  variant={pickerTab === "product" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setPickerTab("product")}
                >
                  Termékek
                </Button>
                <Button
                  variant={pickerTab === "service" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setPickerTab("service")}
                >
                  Szolgáltatások
                </Button>
              </div>

              {pickerTab === "product" ? (
                <>
                  <Input
                    placeholder="Keresés az árlistában..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    {/* Category sidebar */}
                    <div
                      style={{
                        width: "140px",
                        flexShrink: 0,
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
                          color: "var(--color-text-muted)",
                          padding: "0 4px",
                          marginBottom: "4px",
                        }}
                      >
                        Kategóriák
                      </p>
                      <button
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "5px 8px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: productCategoryFilter === "__all__" ? 600 : 400,
                          background:
                            productCategoryFilter === "__all__"
                              ? "var(--color-accent-badge-bg)"
                              : "transparent",
                          color:
                            productCategoryFilter === "__all__"
                              ? "var(--color-accent-primary)"
                              : "var(--color-text-muted)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                        onClick={() => setProductCategoryFilter("__all__")}
                      >
                        <span>Összes</span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            background: "var(--color-border-default)",
                            padding: "1px 5px",
                            borderRadius: "999px",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {priceList.length}
                        </span>
                      </button>
                      {productCategories.map((cat) => (
                        <button
                          key={cat.id}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "5px 8px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: productCategoryFilter === cat.id ? 600 : 400,
                            background:
                              productCategoryFilter === cat.id
                                ? "var(--color-accent-badge-bg)"
                                : "transparent",
                            color:
                              productCategoryFilter === cat.id
                                ? "var(--color-accent-primary)"
                                : "var(--color-text-muted)",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                          onClick={() => setProductCategoryFilter(cat.id)}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                          >
                            {cat.label}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "var(--color-border-default)",
                              padding: "1px 5px",
                              borderRadius: "999px",
                              color: "var(--color-text-secondary)",
                              flexShrink: 0,
                            }}
                          >
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Product list */}
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 flex-1">
                      {filtered.map((p) => (
                        <div
                          key={p._id}
                          className="flex justify-between items-center p-3 rounded-md bg-[#111] hover:bg-[#1a1a1a] border border-[#222]"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">
                                {p.name}
                              </span>
                              <Badge
                                variant={(categoryVariant as any)[p.category] || "info"}
                              >
                                {getItemCategoryName(p.category)}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-400 block mt-0.5">
                              Kód: {p.code || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-red-500">
                              {fmt(p.unit_price)}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => addToCart(p)}
                            >
                              <Plus size={14} /> Add
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex gap-4">
                  {/* Service Sidebar */}
                  <div
                    style={{
                      width: "180px",
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      borderRight: "1px solid var(--color-border-subtle)",
                      paddingRight: "12px",
                      maxHeight: "450px",
                      overflowY: "auto",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--color-text-muted)",
                        padding: "0 4px",
                        marginBottom: "6px",
                      }}
                    >
                      Szolgáltatások
                    </p>
                    <button
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: serviceCategoryFilter === "__all__" ? 600 : 400,
                        background:
                          serviceCategoryFilter === "__all__"
                            ? "var(--color-accent-badge-bg)"
                            : "transparent",
                        color:
                          serviceCategoryFilter === "__all__"
                            ? "var(--color-accent-primary)"
                            : "var(--color-text-muted)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onClick={() => setServiceCategoryFilter("__all__")}
                    >
                      <span>Összes</span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          background: "var(--color-border-default)",
                          padding: "1px 6px",
                          borderRadius: "999px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {servicePriceList.length}
                      </span>
                    </button>
                    {serviceCategories.map((cat: any) => {
                      const catSubs = serviceSubcategories.filter(
                        (sc: any) => sc.category_id === cat._id,
                      );
                      const catServicesCount = servicePriceList.filter(
                        (s: any) => s.category_id === cat._id,
                      ).length;
                      const isCatSelected = serviceCategoryFilter === `cat:${cat._id}`;
                      return (
                        <div
                          key={cat._id}
                          style={{ display: "flex", flexDirection: "column", gap: "2px" }}
                        >
                          <button
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.8125rem",
                              fontWeight: isCatSelected ? 700 : 600,
                              background: isCatSelected
                                ? "var(--color-accent-badge-bg)"
                                : "transparent",
                              color: isCatSelected
                                ? "var(--color-accent-primary)"
                                : "var(--color-text-primary)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: "4px",
                            }}
                            onClick={() => setServiceCategoryFilter(`cat:${cat._id}`)}
                          >
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {cat.name}
                            </span>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                background: "var(--color-border-default)",
                                padding: "1px 6px",
                                borderRadius: "999px",
                                color: "var(--color-text-secondary)",
                                flexShrink: 0,
                              }}
                            >
                              {catServicesCount}
                            </span>
                          </button>
                          {catSubs.map((sub: any) => {
                            const subServicesCount = servicePriceList.filter(
                              (s: any) => s.subcategory_id === sub._id,
                            ).length;
                            const isSubSelected =
                              serviceCategoryFilter === `sub:${sub._id}`;
                            return (
                              <button
                                key={sub._id}
                                style={{
                                  width: "calc(100% - 10px)",
                                  marginLeft: "10px",
                                  textAlign: "left",
                                  padding: "4px 6px",
                                  borderRadius: "4px",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: isSubSelected ? 600 : 400,
                                  background: isSubSelected
                                    ? "var(--color-accent-badge-bg)"
                                    : "transparent",
                                  color: isSubSelected
                                    ? "var(--color-accent-primary)"
                                    : "var(--color-text-muted)",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                                onClick={() => setServiceCategoryFilter(`sub:${sub._id}`)}
                              >
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                  }}
                                >
                                  • {sub.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    background: "var(--color-border-subtle)",
                                    padding: "1px 5px",
                                    borderRadius: "999px",
                                    color: "var(--color-text-muted)",
                                    flexShrink: 0,
                                  }}
                                >
                                  {subServicesCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Service item list */}
                  <div className="max-h-[450px] overflow-y-auto space-y-2 pr-1 flex-1">
                    {filteredServices.map((s: any) => {
                      const subCat = serviceSubcategories.find(
                        (sc: any) => sc._id === s.subcategory_id,
                      );
                      const mainCat = serviceCategories.find(
                        (c: any) => c._id === s.category_id,
                      );
                      const badgeText = subCat
                        ? subCat.name
                        : mainCat
                          ? mainCat.name
                          : "Szolgáltatás";
                      return (
                        <div
                          key={s._id}
                          className="flex justify-between items-center p-3 rounded-md bg-[#111] hover:bg-[#1a1a1a] border border-[#222]"
                        >
                          <div className="flex-1 pr-3 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">
                                {s.name}
                              </span>
                              <Badge variant="info">{badgeText}</Badge>
                            </div>
                            <span className="text-xs text-gray-400 block mt-0.5">
                              Kód: {s.sku || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-red-500">
                              {fmt(
                                serviceCalculatedPrices[s._id] ??
                                  s.internal_base_price ??
                                  0,
                              )}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void addServiceItem(s)}
                            >
                              <Plus size={14} className="mr-1" /> Hozzáadás
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-[#222] pt-3 mt-1 flex justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCreatingCustom(true)}
                >
                  + Egyedi tétel felvétele
                </Button>
              </div>
            </Card>

            {creatingCustom && (
              <Card className="p-4 flex flex-col gap-3">
                <h4 className="text-sm font-bold">Egyedi tétel rögzítése</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Input
                      label="Megnevezés"
                      value={customItem.name}
                      onChange={(e) =>
                        setCustomItem((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <Input
                    type="number"
                    label="Nettó egységár"
                    value={customItem.net_price}
                    onChange={(e) =>
                      setCustomItem((prev) => ({
                        ...prev,
                        net_price: Number(e.target.value),
                      }))
                    }
                  />
                  <Input
                    label="Egység (pl. db, óra)"
                    value={customItem.unit}
                    onChange={(e) =>
                      setCustomItem((prev) => ({ ...prev, unit: e.target.value }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreatingCustom(false)}
                  >
                    Mégse
                  </Button>
                  <Button variant="primary" size="sm" onClick={addCustomItemToCart}>
                    Hozzáadás
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Cart sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <Card className="p-4 flex flex-col gap-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShoppingCart size={18} className="text-red-500" /> Kiválasztott tételek (
                {cart.length})
              </h3>

              {cart.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  Nincsenek tételek az ajánlatban.
                </div>
              ) : (
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {cart.map((c) => {
                    const price = c.custom_price ?? c.item.unit_price;
                    const discountedPrice = price * (1 - c.discount_percent / 100);
                    return (
                      <div
                        key={c.item._id}
                        className="border-b border-[#222] pb-3 last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-semibold text-xs text-white block truncate">
                              {c.item.name}
                            </span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              {c.qty} {c.item.unit} x {fmt(price)}
                            </span>
                          </div>
                          <button
                            onClick={() => removeFromCart(c.item._id)}
                            className="text-gray-500 hover:text-red-500 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                          <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] px-2 py-1 rounded">
                            <button
                              type="button"
                              className="text-gray-400 hover:text-white"
                              onClick={() => updateQty(c.item._id, -1)}
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              className="w-10 bg-transparent text-xs font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
                              value={c.qty}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setCart((prev) =>
                                  prev.map((x) =>
                                    x.item._id === c.item._id ? { ...x, qty: val } : x,
                                  ),
                                );
                              }}
                            />
                            <button
                              type="button"
                              className="text-gray-400 hover:text-white"
                              onClick={() => updateQty(c.item._id, 1)}
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="flex flex-col justify-center">
                            <input
                              type="number"
                              className="w-full bg-[#111] text-xs text-right px-2 py-1 rounded border border-[#222] text-white focus:outline-none focus:border-red-600"
                              placeholder="Egyedi ár..."
                              value={c.custom_price ?? ""}
                              onChange={(e) =>
                                updateCustomPrice(c.item._id, e.target.value)
                              }
                            />
                          </div>

                          <div className="flex items-center gap-1 bg-[#111] rounded border border-[#222] px-1 py-0.5">
                            <input
                              type="number"
                              className="w-8 bg-transparent text-xs text-center border-none focus:outline-none text-white font-bold"
                              value={c.discount_percent || ""}
                              placeholder="0"
                              min="0"
                              max="100"
                              onChange={(e) => updateDiscount(c.item._id, e.target.value)}
                            />
                            <span className="text-[10px] text-gray-400 font-bold">
                              % kedv.
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-xs font-bold text-red-500 mt-1">
                          Összesen: {fmt(discountedPrice * c.qty)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-[#222] pt-4 mt-2 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Nettó összesen:</span>
                  <span>{fmt(totalNet)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>ÁFA összesen:</span>
                  <span>{fmt(totalVat)}</span>
                </div>
                <div className="flex justify-between font-bold text-base mt-2">
                  <span>Bruttó összesen:</span>
                  <span className="text-red-500">{fmt(totalGross)}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-between mt-2 border-t border-[#222] pt-4">
                <Button variant="secondary" onClick={() => setStep(0)}>
                  Vissza
                </Button>
                <Button
                  variant="primary"
                  disabled={cart.length === 0}
                  onClick={() => setStep(2)}
                >
                  Tovább az összesítésre <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Összesítő */}
      {step === 2 && (
        <Card className="p-6 flex flex-col gap-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-lg mb-2">Ajánlat áttekintése</h3>
            <p className="text-sm text-gray-400">
              Kérlek ellenőrizd az adatokat a végleges mentés előtt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-[#111] p-4 rounded-lg border border-[#222]">
            <div>
              <span className="text-gray-500 block text-xs uppercase mb-1">Partner</span>
              <span className="font-semibold flex items-center gap-1.5">
                <Building2 size={13} className="text-red-500" /> {contactLabel}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase mb-1">
                Cím / Megnevezés
              </span>
              <span className="font-semibold flex items-center gap-1.5">
                <FileText size={13} className="text-red-500" /> {header.title}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase mb-1">
                Érvényesség
              </span>
              <span className="font-semibold">{header.valid_days} nap</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase mb-1">
                Bruttó összeg
              </span>
              <span className="font-bold text-red-500 text-base">{fmt(totalGross)}</span>
            </div>
          </div>

          <div className="flex justify-between border-t border-[#222] pt-6">
            <Button variant="secondary" disabled={saving} onClick={() => setStep(1)}>
              Vissza a tételekhez
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => saveOffer()}>
              {saving ? "Mentés..." : "Változtatások mentése"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
