"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import type { MaintenancePlan, Contact } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import {
  Plus,
  Edit,
  Trash2,
  Activity,
  Calendar,
  ArrowLeft,
  Save,
  Clock,
  RefreshCw,
} from "lucide-react";

const PRIORITY_LABELS: Record<
  string,
  { label: string; variant: "default" | "info" | "warning" | "error" | "success" }
> = {
  low: { label: "Alacsony", variant: "default" },
  medium: { label: "Közepes", variant: "info" },
  high: { label: "Magas", variant: "warning" },
  critical: { label: "Kritikus", variant: "error" },
};

const FREQ_OPTIONS = [
  { value: "1", label: "Havonta" },
  { value: "3", label: "3 havonta" },
  { value: "6", label: "Félévente" },
  { value: "12", label: "Évente" },
];

const empty = (): Partial<MaintenancePlan> => ({
  title: "",
  contact_id: "",
  frequency_months: 12,
  next_due_date: new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0],
  is_active: true,
  template_title: "",
  template_description: "",
  template_category: "Preventív karbantartás",
  template_priority: "medium",
  template_assigned_to: "",
  advance_days: 14,
});

export default function MaintenancePage() {
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<MaintenancePlan> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const [data, cList] = await Promise.all([
        apiJson<MaintenancePlan[]>("/api/maintenance-plans?active=false"),
        apiJson<Contact[]>("/api/contacts"),
      ]);
      setPlans(data);
      setContacts(cList);
    } catch {
      setError("Nem sikerült betölteni a karbantartási terveket.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (
      !editing.title?.trim() ||
      !editing.contact_id ||
      !editing.template_title?.trim()
    ) {
      alert("A cím, partner és sablon cím megadása kötelező.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: editing.title,
        contact_id: editing.contact_id,
        project_id: editing.project_id ?? null,
        frequency_months: Number(editing.frequency_months) || 12,
        next_due_date: editing.next_due_date,
        is_active: editing.is_active ?? true,
        template_title: editing.template_title,
        template_description: editing.template_description ?? null,
        template_category: editing.template_category ?? "Preventív karbantartás",
        template_priority: editing.template_priority ?? "medium",
        template_assigned_to: editing.template_assigned_to ?? null,
        advance_days: Number(editing.advance_days) || 14,
      };
      if (editing._id) {
        await apiJsonBody(`/api/maintenance-plans/${editing._id}`, "PATCH", payload);
      } else {
        await apiJsonBody("/api/maintenance-plans", "POST", payload);
      }
      setEditing(null);
      fetchPlans();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Sikertelen mentés.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (plan: MaintenancePlan) => {
    try {
      await apiJsonBody(`/api/maintenance-plans/${plan._id}`, "PATCH", {
        is_active: !plan.is_active,
      });
      fetchPlans();
    } catch {
      alert("Hiba történt.");
    }
  };

  const getContactName = (id: string) => contacts.find((c) => c._id === id)?.name ?? id;

  const daysUntil = (d: Date | string) => {
    const diff = new Date(d).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setEditing(null)}
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer p-0 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Mégse
          </button>
          <h1 className="text-xl font-bold text-white">
            {editing._id ? "Terv szerkesztése" : "Új karbantartási terv"}
          </h1>
        </div>

        <Card className="p-6 flex flex-col gap-5 bg-[var(--color-bg-card)] border-[var(--color-border-subtle)]">
          {/* Plan basics */}
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Ütemezési adatok
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-title">Terv neve *</Label>
              <Input
                id="mp-title"
                value={editing.title || ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Pl. Éves tűzjelző karbantartás"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-contact">Partner *</Label>
              <Select
                value={editing.contact_id || "__empty__"}
                onValueChange={(v) =>
                  setEditing({ ...editing, contact_id: v === "__empty__" ? "" : v })
                }
              >
                <SelectTrigger id="mp-contact" className="w-full">
                  <SelectValue placeholder="-- Partner --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Partner --</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-freq">Ismétlési gyakoriság</Label>
              <Select
                value={String(editing.frequency_months ?? 12)}
                onValueChange={(v) =>
                  setEditing({ ...editing, frequency_months: Number(v) })
                }
              >
                <SelectTrigger id="mp-freq" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQ_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-due">Következő esedékesség *</Label>
              <Input
                id="mp-due"
                type="date"
                value={String(editing.next_due_date ?? "").slice(0, 10)}
                onChange={(e) =>
                  setEditing({ ...editing, next_due_date: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-advance">Előzetes értesítés (nap)</Label>
              <Input
                id="mp-advance"
                type="number"
                min={1}
                max={90}
                value={editing.advance_days ?? 14}
                onChange={(e) =>
                  setEditing({ ...editing, advance_days: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {/* Ticket template */}
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 mt-2">
            Generált ticket sablon
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-tt">Ticket cím *</Label>
              <Input
                id="mp-tt"
                value={editing.template_title || ""}
                onChange={(e) =>
                  setEditing({ ...editing, template_title: e.target.value })
                }
                placeholder="Pl. Karbantartás elvégzése"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-cat">Kategória</Label>
              <Input
                id="mp-cat"
                value={editing.template_category || ""}
                onChange={(e) =>
                  setEditing({ ...editing, template_category: e.target.value })
                }
                placeholder="Preventív karbantartás"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-prio">Prioritás</Label>
              <Select
                value={editing.template_priority ?? "medium"}
                onValueChange={(v: any) =>
                  setEditing({ ...editing, template_priority: v })
                }
              >
                <SelectTrigger id="mp-prio" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Alacsony</SelectItem>
                  <SelectItem value="medium">Közepes</SelectItem>
                  <SelectItem value="high">Magas</SelectItem>
                  <SelectItem value="critical">Kritikus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-assign">Hozzárendelés (opcionális)</Label>
              <Input
                id="mp-assign"
                value={editing.template_assigned_to || ""}
                onChange={(e) =>
                  setEditing({ ...editing, template_assigned_to: e.target.value })
                }
                placeholder="Technikus neve"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mp-desc">Ticket leírás</Label>
            <Textarea
              id="mp-desc"
              value={editing.template_description || ""}
              onChange={(e) =>
                setEditing({ ...editing, template_description: e.target.value })
              }
              placeholder="Az elvégzendő feladatok részletezése..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--color-border-subtle)] pt-4 mt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              <Save size={15} style={{ marginRight: 6 }} /> Mentés
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity size={22} className="text-[var(--color-accent-primary)]" />
            Preventív karbantartás
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            SLA ütemező — automatikus ticketgenerálás esedékesség előtt
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing(empty())}>
          <Plus size={16} style={{ marginRight: 6 }} /> Új terv
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <div className="text-center py-10 text-[var(--color-text-muted)]">
          Betöltés...
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Aktív tervek",
                value: plans.filter((p) => p.is_active).length,
                color: "#22c55e",
              },
              {
                label: "Inaktív tervek",
                value: plans.filter((p) => !p.is_active).length,
                color: "#6b7280",
              },
              {
                label: "30 napon belül esedékes",
                value: plans.filter(
                  (p) => p.is_active && daysUntil(p.next_due_date) <= 30,
                ).length,
                color: "#f59e0b",
              },
              {
                label: "Lejárt / esedékes ma",
                value: plans.filter((p) => p.is_active && daysUntil(p.next_due_date) <= 0)
                  .length,
                color: "#ef4444",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border p-4 flex flex-col gap-1"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <span className="text-3xl font-bold" style={{ color: s.color }}>
                  {s.value}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Plans list */}
          <div className="flex flex-col gap-4">
            {plans.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed border-[var(--color-border-default)] rounded-xl text-[var(--color-text-muted)]">
                Nincsenek karbantartási tervek. Kattints az "Új terv" gombra.
              </div>
            )}
            {plans.map((plan) => {
              const days = daysUntil(plan.next_due_date);
              const dueSoon = days <= 14 && days > 0;
              const overdue = days <= 0;
              const p = PRIORITY_LABELS[plan.template_priority] ?? {
                label: "Közepes",
                variant: "info" as const,
              };
              return (
                <div
                  key={plan._id}
                  className="rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{
                    background: "var(--color-bg-card)",
                    borderColor: overdue
                      ? "#ef4444"
                      : dueSoon
                        ? "#f59e0b50"
                        : "var(--color-border-subtle)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-white truncate">
                        {plan.title}
                      </span>
                      <Badge variant={p.variant}>{p.label}</Badge>
                      {!plan.is_active && <Badge variant="default">Inaktív</Badge>}
                      {overdue && <Badge variant="error">Lejárt</Badge>}
                      {dueSoon && !overdue && <Badge variant="warning">Hamarosan</Badge>}
                    </div>
                    <div className="text-sm text-[var(--color-text-muted)] flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span>{getContactName(plan.contact_id)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />{" "}
                        {new Date(plan.next_due_date).toLocaleDateString("hu-HU")}
                        {days > 0 ? ` (${days} nap)` : " (LEJÁRT)"}
                      </span>
                      <span className="flex items-center gap-1">
                        <RefreshCw size={12} />{" "}
                        {FREQ_OPTIONS.find(
                          (f) => f.value === String(plan.frequency_months),
                        )?.label ?? `${plan.frequency_months} hó`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Értesítés {plan.advance_days} nappal korábban
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-1 italic">
                      Ticket sablon:{" "}
                      <span className="text-[var(--color-text-primary)]">
                        {plan.template_title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => setEditing(plan)}
                      className="text-xs py-1.5 px-3"
                    >
                      <Edit size={13} style={{ marginRight: 4 }} /> Szerkesztés
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleToggle(plan)}
                      className="text-xs py-1.5 px-3"
                    >
                      {plan.is_active ? "Deaktiválás" : "Aktiválás"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
