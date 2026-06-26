"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, Input, Button } from "@crm/ui";
import type { PricingSettings } from "@crm/types";

// ─── API helpers ─────────────────────────────────────────────────────────────
async function fetchPricingSettings(): Promise<PricingSettings> {
  const res = await fetch("/api/settings/pricing");
  if (!res.ok) throw new Error("Nem sikerült betölteni az árképzési beállításokat");
  return res.json();
}

async function savePricingSettings(
  data: Partial<PricingSettings>,
): Promise<PricingSettings> {
  const res = await fetch("/api/settings/pricing", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Mentés sikertelen");
  }
  return res.json();
}

// ─── Helper for Field with Suffix and HelpText ───────────────────────────────
function SettingInput({
  label,
  value,
  onChange,
  suffix,
  helpText,
  highlight,
  readOnly,
  type = "number",
  step,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  suffix?: string;
  helpText?: string;
  highlight?: boolean;
  readOnly?: boolean;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 ${highlight ? "border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded p-3" : ""}`}
    >
      <Input
        label={label}
        type={type}
        step={step}
        min={min}
        max={max}
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
        className={readOnly ? "opacity-50" : ""}
      />
      {suffix && (
        <div className="text-xs font-semibold text-muted-foreground mt-0.5">
          Egység: {suffix}
        </div>
      )}
      {helpText && <p className="text-xs text-muted-foreground mt-0.5">{helpText}</p>}
    </div>
  );
}

// ─── Fő oldal ─────────────────────────────────────────────────────────────────
export default function PricingSettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<PricingSettings>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["pricing-settings"],
    queryFn: fetchPricingSettings,
  });

  const mutation = useMutation({
    mutationFn: savePricingSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-settings"] });
      toast.success("Árképzési beállítások mentve");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (data) setFormData(data);
  }, [data]);

  // Derived values
  const overheadMultiplier = formData.overhead_multiplier ?? 1.45;
  const monthlyCost = formData.monthly_fixed_cost ?? 500000;
  const productiveHours = formData.monthly_productive_hours ?? 160;
  const calculatedOverheadPerHour =
    productiveHours > 0 ? Math.round(monthlyCost / productiveHours) : 0;

  const hourlyRates = formData.hourly_rates ?? {};
  const clientMultipliers = formData.client_multipliers ?? {};
  const materialSurcharges = formData.material_surcharges ?? {};
  const urgencyMultipliers = formData.urgency_multipliers ?? {};

  const handleSave = () => {
    mutation.mutate(formData);
  };

  const hasChanges = data && JSON.stringify(data) !== JSON.stringify(formData);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
        Hiba: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 pb-32">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Árképzési Beállítások</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Szorzók, óradíjak és overhead beállítása – ezek alapján számolódnak a
          szolgáltatás árlista végárai
        </p>
      </div>

      {/* Card 1: Overhead és Rezsi */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Overhead és Rezsi</h2>
          <p className="text-sm text-muted-foreground">
            A termelő munkára rakódó rezsiköltség aránya
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SettingInput
            label="Overhead szorzó"
            value={overheadMultiplier}
            onChange={(v) => setFormData({ ...formData, overhead_multiplier: v })}
            step="0.01"
            min="1.0"
            max="5.0"
            suffix="×"
            helpText="pl. 1.45 = minden termelő órára 45% rezsi rakódik rá. Ez az érték szorzódik a belső óradíjakra."
          />
          <SettingInput
            label="Fix havi rezsiköltség"
            value={monthlyCost}
            onChange={(v) => setFormData({ ...formData, monthly_fixed_cost: v })}
            suffix="Ft / hó"
            helpText="Bérek + iroda + szoftverek + járművek összesen"
          />
          <SettingInput
            label="Havi termelő munkaórák"
            value={productiveHours}
            onChange={(v) => setFormData({ ...formData, monthly_productive_hours: v })}
            suffix="óra / hó"
            helpText="A cégben összes termelő munkaóra havonta"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Számított rezsi / óra</span>
            <div className="bg-muted rounded px-3 py-2 text-sm font-mono flex items-center h-10 border border-input opacity-70">
              {calculatedOverheadPerHour} Ft / óra
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tájékoztató – automatikusan számított, nem szerkeszthető
            </p>
          </div>
        </div>
      </Card>

      {/* Card 2: Belső Óradíjak */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Belső Óradíjak</h2>
          <p className="text-sm text-muted-foreground">
            Munkavállalói bérköltség + járulékok / óra. Ezek az adatok SOHA nem kerülnek
            ki ügyfelek felé.
          </p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 border border-yellow-300 rounded px-3 py-2 text-xs mb-4">
          Bizalmas belső adatok – ügyfeleknek nem látható
        </div>
        <div className="hidden sm:grid grid-cols-3 gap-4 mb-2 text-sm font-semibold text-muted-foreground border-b border-border pb-2">
          <div>Szerepkör</div>
          <div>Belső óradíj (Ft/óra)</div>
          <div>Kalkulált listaár (Ft/óra)</div>
        </div>
        <div className="flex flex-col gap-4">
          {(
            [
              ["it_operations", "IT – Üzemeltetés, hálózat, helpdesk"],
              ["it_development", "IT – Szoftver, fejlesztés, architektúra"],
              ["security_tech_installer", "Biztonságtechnika – Szerelő"],
              ["security_tech_planner", "Biztonságtechnika – Tervező / PM"],
              ["fire_protection_installer", "Tűzvédelem – Szerelő"],
              ["fire_protection_planner", "Tűzvédelem – Tervező, dokumentáló"],
              ["electrical_general", "Villanyszerelő – általános"],
              ["electrical_industrial", "Villanyszerelő – ipari / EV töltő"],
              ["project_management", "Projektmenedzsment / koordináció"],
              ["consulting", "Tanácsadás / audit / tréning"],
            ] as [keyof PricingSettings["hourly_rates"], string][]
          ).map(([key, label]) => {
            const rawRate = (hourlyRates as any)?.[key] ?? 0;
            const calcRate = Math.round((rawRate * overheadMultiplier) / 100) * 100;
            return (
              <div
                key={key}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="text-sm font-medium mb-1.5 sm:mb-0 sm:pb-3">{label}</div>
                <SettingInput
                  label="Belső óradíj"
                  value={rawRate}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      hourly_rates: { ...hourlyRates, [key]: v } as any,
                    })
                  }
                  suffix="Ft/óra"
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium sm:hidden">Kalkulált listaár</span>
                  <div className="bg-muted rounded px-3 py-2 text-sm font-mono flex items-center h-10 border border-input opacity-70">
                    {calcRate} Ft/óra
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Kalkulált listaár = belső óradíj × overhead szorzó – automatikusan frissül
        </p>
      </Card>

      {/* Card 3: Ügyfél Kategória Szorzók */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Ügyfél Kategória Szorzók</h2>
          <p className="text-sm text-muted-foreground">
            Az alap kalkulált listaárra kerül rá. Az 1 éves KKV szerződés a referenciapont
            (×1,00).
          </p>
        </div>
        <div className="hidden sm:grid grid-cols-3 gap-4 mb-2 text-sm font-semibold text-muted-foreground border-b border-border pb-2">
          <div>Partner típus / Szerződés</div>
          <div>Szorzó</div>
          <div>Megjegyzés</div>
        </div>
        <div className="flex flex-col gap-4">
          {(
            [
              ["individual", "Magánszemély (B2C)", "Alap listaár", false],
              [
                "smb_occasional",
                "KKV – Eseti (nincs keretszerz.)",
                "Rugalmassági felár",
                false,
              ],
              ["smb_6month", "KKV – 6 hónapos szerz.", "", false],
              ["smb_1year", "KKV – 1 éves szerz.", "REFERENCIA", true],
              ["smb_2year", "KKV – 2 éves szerz.", "Hűségkedvezmény", false],
              [
                "enterprise",
                "Nagyvállalat / intézmény",
                "Admin + ciklus kompenzáció",
                false,
              ],
              [
                "subcontractor_presence",
                "Alvállalkozói megbízó – napibéres jelenlét",
                "Ti dolgoztok náluk",
                false,
              ],
              [
                "subcontractor_project",
                "Alvállalkozói megbízó – projekt alapú",
                "",
                false,
              ],
              [
                "pm_external",
                "Projekt megbízott / külső PM",
                "Szellemi munka felár",
                false,
              ],
            ] as [keyof PricingSettings["client_multipliers"], string, string, boolean][]
          ).map(([key, label, note, isRef]) => (
            <div
              key={key}
              className={`grid grid-cols-1 sm:grid-cols-3 gap-4 items-center border-b border-border pb-3 last:border-0 last:pb-0 ${isRef ? "border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded p-2" : ""}`}
            >
              <div className="text-sm font-medium mb-1.5 sm:mb-0 sm:pb-3">{label}</div>
              <SettingInput
                label="Szorzó"
                value={(clientMultipliers as any)?.[key] ?? 1}
                onChange={(v) =>
                  setFormData({
                    ...formData,
                    client_multipliers: { ...clientMultipliers, [key]: v } as any,
                  })
                }
                step="0.01"
                suffix="×"
              />
              <div className="text-xs text-muted-foreground mt-1.5 sm:mt-0 sm:pb-3">
                {note}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Card 4: Anyagköltség Kezelési Pótlék */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Anyagköltség Kezelési Pótlék</h2>
          <p className="text-sm text-muted-foreground">
            Az anyagár %-a – fedezi a finanszírozási kockázatot és a logisztikát
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["occasional", "Eseti munka"],
              ["contracted", "Keretszerz. ügyfél (6 hó / 1 év)"],
              ["enterprise", "Nagyvállalat / prémium"],
              ["subcontractor", "Alvállalkozói munka"],
            ] as [keyof PricingSettings["material_surcharges"], string][]
          ).map(([key, label]) => (
            <SettingInput
              key={key}
              label={label}
              value={(materialSurcharges as any)?.[key] ?? 0}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  material_surcharges: { ...materialSurcharges, [key]: v } as any,
                })
              }
              step="0.01"
              suffix="%"
            />
          ))}
        </div>
      </Card>

      {/* Card 5: Sürgősségi Szorzók */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Sürgősségi Szorzók</h2>
          <p className="text-sm text-muted-foreground">
            Munkaidőn kívüli vagy soron kívüli munkák esetén alkalmazandó szorzók
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["same_day", "Soron kívüli (munkaidőn belül, aznap)"],
              ["after_hours", "Munkaidőn túl (este / reggel)"],
              ["weekend", "Hétvége / ünnepnap"],
              ["night", "Éjszakai kiszállás"],
            ] as [keyof PricingSettings["urgency_multipliers"], string][]
          ).map(([key, label]) => (
            <SettingInput
              key={key}
              label={label}
              value={(urgencyMultipliers as any)?.[key] ?? 1}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  urgency_multipliers: { ...urgencyMultipliers, [key]: v } as any,
                })
              }
              step="0.05"
              suffix="×"
            />
          ))}
        </div>
      </Card>

      {/* Card 6: ÁFA és Egyéb */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">ÁFA és Egyéb</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SettingInput
            label="ÁFA kulcs"
            value={(formData.vat_rate ?? 0.27) * 100}
            onChange={(v) => setFormData({ ...formData, vat_rate: v / 100 })}
            suffix="%"
            helpText="Magyar általános ÁFA kulcs"
          />
          <SettingInput
            label="Minimális kiszállási díj"
            value={formData.min_callout_fee ?? 8000}
            onChange={(v) => setFormData({ ...formData, min_callout_fee: v })}
            suffix="Ft"
            helpText="Kiszállás + 1 óra minimum egység"
          />
          <SettingInput
            label="Minimális projekt díj"
            value={formData.min_project_fee ?? 25000}
            onChange={(v) => setFormData({ ...formData, min_project_fee: v })}
            suffix="Ft"
            helpText="Legkisebb számlázható projekt összeg"
          />
        </div>
      </Card>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-6 py-4 backdrop-blur shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-end">
          <Button
            variant="primary"
            disabled={!hasChanges || mutation.isPending}
            onClick={handleSave}
            className="w-full sm:w-auto px-8"
          >
            {mutation.isPending ? "Mentés..." : "Beállítások mentése"}
          </Button>
        </div>
      </div>
    </div>
  );
}
