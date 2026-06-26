"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@crm/ui";
import { X, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import type {
  ServicePriceListItem,
  ServiceCategory,
  ServiceSubCategory,
  UnitBasedTier,
} from "@crm/types";

interface ServicePriceListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: ServicePriceListItem | null; // Null ha újat hozunk létre
  isAdmin: boolean; // Ha true, láthatja és szerkesztheti az internal_base_price-t
}

const hourlyRateCategories = [
  { value: "it_operations", label: "IT üzemeltetés, hálózat, helpdesk" },
  { value: "it_development", label: "IT fejlesztés, programozás" },
  { value: "security_tech_installer", label: "Biztonságtechnika szerelő" },
  { value: "security_tech_planner", label: "Biztonságtechnika tervező, PM" },
  { value: "fire_protection_installer", label: "Tűzvédelem szerelő" },
  { value: "fire_protection_planner", label: "Tűzvédelem tervező, dokumentáló" },
  { value: "electrical_general", label: "Villanyszerelő általános" },
  { value: "electrical_industrial", label: "Villanyszerelő ipari / EV töltő" },
  { value: "project_management", label: "Projektmenedzsment, koordináció" },
  { value: "consulting", label: "Tanácsadás, audit, tréning" },
];

export default function ServicePriceListSheet({
  isOpen,
  onClose,
  item,
  isAdmin,
}: ServicePriceListSheetProps) {
  const queryClient = useQueryClient();

  // Form states
  const [category_id, setCategoryId] = useState("");
  const [subcategory_id, setSubcategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("db");
  const [pricing_type, setPricingType] = useState<
    "fixed" | "hourly" | "custom" | "unit_based"
  >("fixed");
  const [internal_base_price, setInternalBasePrice] = useState<number | "">("");
  const [hourly_rate_category, setHourlyRateCategory] = useState("");
  const [unit_based_tiers, setUnitBasedTiers] = useState<UnitBasedTier[]>([]);
  const [notes, setNotes] = useState("");
  const [client_note, setClientNote] = useState("");
  const [sort_order, setSortOrder] = useState(0);

  // Queries for cats & subs
  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const res = await fetch("/api/service-categories");
      return res.json();
    },
  });

  const { data: subcategories = [] } = useQuery<ServiceSubCategory[]>({
    queryKey: ["service-subcategories"],
    queryFn: async () => {
      const res = await fetch("/api/service-subcategories");
      return res.json();
    },
  });

  const filteredSubs = subcategories.filter(
    (s: ServiceSubCategory) => s.category_id === category_id,
  );

  // Initial fill
  useEffect(() => {
    if (item) {
      setCategoryId(item.category_id);
      setSubcategoryId(item.subcategory_id ?? "");
      setName(item.name);
      setDescription(item.description ?? "");
      setUnit(item.unit);
      setPricingType(item.pricing_type);
      setInternalBasePrice(item.internal_base_price ?? "");
      setHourlyRateCategory(item.hourly_rate_category ?? "");
      setUnitBasedTiers(item.unit_based_tiers ?? []);
      setNotes(item.notes ?? "");
      setClientNote(item.client_note ?? "");
      setSortOrder(item.sort_order);
    } else {
      setCategoryId("");
      setSubcategoryId("");
      setName("");
      setDescription("");
      setUnit("db");
      setPricingType("fixed");
      setInternalBasePrice("");
      setHourlyRateCategory("");
      setUnitBasedTiers([]);
      setNotes("");
      setClientNote("");
      setSortOrder(0);
    }
  }, [item, isOpen]);

  // Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id,
        subcategory_id: subcategory_id || null,
        name,
        description: description || null,
        unit,
        pricing_type,
        internal_base_price:
          pricing_type === "fixed" && internal_base_price !== ""
            ? Number(internal_base_price)
            : null,
        hourly_rate_category: pricing_type === "hourly" ? hourly_rate_category : null,
        unit_based_tiers: pricing_type === "unit_based" ? unit_based_tiers : [],
        notes: notes || null,
        client_note: client_note || null,
        sort_order,
      };

      const url = item
        ? `/api/service-price-list/${item._id}`
        : "/api/service-price-list";
      const method = item ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Hiba a mentés során");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-price-list"] });
      toast.success(item ? "Tétel sikeresen frissítve" : "Tétel sikeresen létrehozva");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const addTier = () => {
    setUnitBasedTiers((prev) => [
      ...prev,
      {
        label: `${prev.length + 1}. sáv`,
        min_units: 0,
        max_units: undefined,
        base_price: 0,
      },
    ]);
  };

  const removeTier = (index: number) => {
    setUnitBasedTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof UnitBasedTier, val: any) => {
    setUnitBasedTiers((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        return { ...t, [field]: val };
      }),
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl">
      {/* Fejléc */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {item ? `Tétel Szerkesztése (${item.sku})` : "Új Szolgáltatás Tétel"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adj meg minden szükséges árképzési paramétert.
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X size={18} />
        </button>
      </div>

      {/* Görgethető tartalom */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {/* Kategória & Alkategória */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Kategória *
            </label>
            <select
              value={category_id}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId(""); // reset subcategory on change
              }}
              disabled={!!item} // Kategória nem váltható ha már létrehoztuk a SKU miatt
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            >
              <option value="">Válassz...</option>
              {categories
                .filter((c: ServiceCategory) => c.is_active)
                .map((c: ServiceCategory) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.sku_prefix})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Alkategória
            </label>
            <select
              value={subcategory_id}
              onChange={(e) => setSubcategoryId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Nincs (Fő kategóriában)</option>
              {filteredSubs.map((s: ServiceSubCategory) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Név & Egység */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Input
              label="Szolgáltatás Megnevezése *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Riasztó központ programozás"
            />
          </div>
          <div>
            <Input
              label="Elszámolási egység *"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="pl. óra, db, alkalom"
            />
          </div>
        </div>

        <Input
          label="Rövid leírás"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A tétel részletes kifejtése"
        />

        {/* Árképzés Típusa */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Árképzés Típusa *
          </label>
          <select
            value={pricing_type}
            onChange={(e: any) => setPricingType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="fixed">Fix belső alapár (Fixed)</option>
            <option value="hourly">Belső óradíj alapú (Hourly)</option>
            <option value="unit_based">Rendszeregység sávos (Unit based)</option>
            <option value="custom">Egyedi kalkuláció (Custom)</option>
          </select>
        </div>

        {/* Dinamikus mezők árképzés típus alapján */}
        {pricing_type === "fixed" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h4 className="text-sm font-semibold mb-2">Fix belső alapár paraméterei</h4>
            {isAdmin ? (
              <Input
                label="Belső alapár (Floor ár) * (Ft)"
                type="number"
                value={internal_base_price}
                onChange={(e) =>
                  setInternalBasePrice(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="pl. 12000"
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                <Info size={14} />
                Nincs jogosultságod a belső alapár megtekintésére vagy módosítására.
              </div>
            )}
          </div>
        )}

        {pricing_type === "hourly" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
            <h4 className="text-sm font-semibold">Belső óradíj kategória</h4>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Válaszd ki az óradíjat
              </label>
              <select
                value={hourly_rate_category}
                onChange={(e) => setHourlyRateCategory(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Válassz...</option>
                {hourlyRateCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              A végár kiszámításakor a rendszer ezt az óradíjat szorozza meg a globális
              overhead szorzóval és a partner egyedi szorzójával.
            </p>
          </div>
        )}

        {pricing_type === "unit_based" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Rendszeregység sávos árazás</h4>
              <Button size="sm" variant="secondary" onClick={addTier}>
                <Plus size={12} className="mr-1" /> Új sáv
              </Button>
            </div>

            {unit_based_tiers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nincsenek sávok hozzáadva. Kattints az Új sáv gombra.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {unit_based_tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 border-b border-border pb-2 last:border-0"
                  >
                    <Input
                      label=""
                      placeholder="Sáv neve (pl. 1-10 db)"
                      value={tier.label}
                      onChange={(e) => updateTier(idx, "label", e.target.value)}
                      className="w-32"
                    />
                    <Input
                      label=""
                      type="number"
                      placeholder="Min"
                      value={tier.min_units}
                      onChange={(e) =>
                        updateTier(idx, "min_units", parseInt(e.target.value) || 0)
                      }
                      className="w-16"
                    />
                    <Input
                      label=""
                      type="number"
                      placeholder="Max"
                      value={tier.max_units ?? ""}
                      onChange={(e) =>
                        updateTier(
                          idx,
                          "max_units",
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="w-16"
                    />
                    {isAdmin ? (
                      <Input
                        label=""
                        type="number"
                        placeholder="Alapár (Ft)"
                        value={tier.base_price}
                        onChange={(e) =>
                          updateTier(idx, "base_price", Number(e.target.value) || 0)
                        }
                        className="w-24 flex-1"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic px-2">
                        Rejtett ár
                      </span>
                    )}
                    <button
                      onClick={() => removeTier(idx)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {pricing_type === "custom" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h4 className="text-sm font-semibold mb-1">Egyedi árazás</h4>
            <p className="text-xs text-muted-foreground">
              Ennél a típusnál nincs automatikus kalkuláció. Az árat az ajánlaton vagy
              munkalapon manuálisan kell megadni.
            </p>
          </div>
        )}

        {/* Megjegyzések */}
        <Input
          label="Belső megjegyzés (csak munkatársak látják)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Belső kalkulációs megjegyzések"
        />

        <Input
          label="Ügyfél megjegyzés (ajánlaton/munkalapon megjelenik)"
          value={client_note}
          onChange={(e) => setClientNote(e.target.value)}
          placeholder="pl. Tartalmazza a kiszállási díjat"
        />

        {/* Rendezettség */}
        <Input
          label="Sorrendi pozíció (Sort order)"
          type="number"
          value={sort_order}
          onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Műveleti gombok (Sticky footer) */}
      <div className="border-t border-border bg-muted/30 px-6 py-4 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={saveMutation.isPending}>
          Mégse
        </Button>
        <Button
          variant="primary"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !category_id || !name}
        >
          {saveMutation.isPending ? "Mentés..." : "Mentés"}
        </Button>
      </div>
    </div>
  );
}
