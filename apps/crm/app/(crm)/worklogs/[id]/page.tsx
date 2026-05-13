"use client";

import {
  Card,
  Button,
  Badge,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  InputControl,
} from "@crm/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, use, Suspense, useEffect, useCallback } from "react";
import type { Contact, CrmUser, Worklog, WorklogItem } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import {
  Save,
  FileSignature,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  ArrowLeft,
} from "lucide-react";

const WORK_CATEGORIES = [
  "IT Támogatás",
  "Hálózatépítés",
  "Biztonságtechnika",
  "Karbantartás",
  "Egyéb",
];
const sectionHeaderCls = "text-xs font-semibold uppercase tracking-wider pb-2 border-b";

function parseWorklog(raw: unknown): Worklog {
  const r = raw as Record<string, unknown>;
  const items = Array.isArray(r.items)
    ? (r.items as Record<string, unknown>[]).map((it) => ({
        description: String(it.description ?? ""),
        quantity: Number(it.quantity) || 1,
        unit: String(it.unit ?? "db"),
        unit_price:
          it.unit_price === null || it.unit_price === undefined
            ? null
            : Number(it.unit_price),
        price_list_item_id:
          it.price_list_item_id === null || it.price_list_item_id === undefined
            ? null
            : String(it.price_list_item_id),
      }))
    : [];
  return {
    ...(r as unknown as Worklog),
    work_date: new Date(String(r.work_date)),
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
    items,
  };
}

const emptyItem = (): WorklogItem => ({
  description: "",
  quantity: 1,
  unit: "db",
  unit_price: null,
  price_list_item_id: null,
});

function WorklogFormContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = id === "new";

  const [status, setStatus] = useState<Worklog["status"]>("draft");
  const [worklogNumber, setWorklogNumber] = useState<string | null>(null);
  const [contacts, setContacts] = useState<{ _id: string; name: string }[]>([]);
  const [crmUsers, setCrmUsers] = useState<{ value: string; label: string }[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [contactId, setContactId] = useState("");
  const [category, setCategory] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [siteAddress, setSiteAddress] = useState("");
  const [description, setDescription] = useState("");
  const [travelKm, setTravelKm] = useState("");
  const [notes, setNotes] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [clientName, setClientName] = useState("");
  const [items, setItems] = useState<WorklogItem[]>([emptyItem()]);

  const disabled = status !== "draft";

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [cList, uList] = await Promise.all([
          apiJson<unknown[]>("/api/contacts", { signal: ac.signal }),
          apiJson<unknown[]>("/api/crm-users", { signal: ac.signal }),
        ]);
        setContacts(
          cList.map((row) => {
            const c = row as Pick<Contact, "_id" | "name">;
            return { _id: c._id, name: c.name };
          }),
        );
        setCrmUsers(
          uList.map((row) => {
            const u = row as CrmUser;
            const label = u.display_name?.trim() || u.email;
            return { value: label, label };
          }),
        );
      } catch {
        /* non-fatal */
      }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("contact_id")?.trim();
    if (isNew && fromUrl) setContactId(fromUrl);
  }, [isNew, searchParams]);

  useEffect(() => {
    if (isNew) return;
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/worklogs/${id}`, { signal: ac.signal });
        const w = parseWorklog(raw);
        setWorklogNumber(w.worklog_number);
        setStatus(w.status);
        setContactId(w.contact_id ?? "");
        setCategory(w.work_category);
        setTechnicianName(w.technician_name);
        setWorkDate(w.work_date.toISOString().split("T")[0]);
        setWorkStart(w.work_start ?? "08:00");
        setWorkEnd(w.work_end ?? "16:00");
        setSiteAddress(w.site_address ?? "");
        setDescription(w.work_description);
        setTravelKm(w.travel_km != null ? String(w.travel_km) : "");
        setNotes(w.notes ?? "");
        setClientName(w.client_name ?? "");
        setItems(w.items.length ? w.items : [emptyItem()]);
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) {
          setLoadErr("A munkalap nem tölthető be.");
        }
      }
    })();
    return () => ac.abort();
  }, [id, isNew]);

  const buildPayload = useCallback(() => {
    const travelParsed = travelKm.trim() === "" ? null : Number(travelKm);
    const travel_km = Number.isFinite(travelParsed as number) ? travelParsed : null;
    const cleanedItems = items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description.trim(),
        quantity: Math.max(1, it.quantity || 1),
        unit: (it.unit || "db").trim() || "db",
        unit_price: it.unit_price,
        price_list_item_id: it.price_list_item_id,
      }));
    const lineItems =
      cleanedItems.length > 0
        ? cleanedItems
        : [
            {
              description: "—",
              quantity: 1,
              unit: "db",
              unit_price: null,
              price_list_item_id: null,
            },
          ];

    return {
      work_date: new Date(workDate ?? new Date().toISOString().slice(0, 10)),
      work_start: workStart || null,
      work_end: workEnd || null,
      technician_name: (technicianName.trim() || "—").slice(0, 200),
      client_name: clientName.trim() || null,
      site_address: siteAddress.trim() || null,
      work_category: (category.trim() || "Egyéb").slice(0, 200),
      work_description: (description.trim() || "—").slice(0, 20000),
      items: lineItems,
      travel_km,
      notes: notes.trim() || null,
      contact_id: contactId.trim() || null,
    };
  }, [
    travelKm,
    items,
    workDate,
    workStart,
    workEnd,
    technicianName,
    clientName,
    siteAddress,
    category,
    description,
    notes,
    contactId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setSaving(true);
    setLoadErr(null);
    try {
      if (isNew) {
        const created = await apiJsonBody<unknown>("/api/worklogs", "POST", {
          ...buildPayload(),
          status: "draft",
        });
        const w = parseWorklog(created);
        router.replace(`/worklogs/${w._id}`);
        return;
      }
      await apiJsonBody(`/api/worklogs/${id}`, "PATCH", buildPayload());
      router.push("/worklogs");
    } catch (err) {
      setLoadErr(err instanceof ApiError ? err.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (isNew || disabled) return;
    setSaving(true);
    setLoadErr(null);
    try {
      await apiJsonBody(`/api/worklogs/${id}`, "PATCH", buildPayload());
      const raw = await apiJsonBody<unknown>(`/api/worklogs/${id}/finalize`, "POST", {});
      const w = parseWorklog(raw);
      setStatus(w.status);
    } catch (err) {
      setLoadErr(err instanceof ApiError ? err.message : "Véglegesítés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div
      className={sectionHeaderCls}
      style={{
        color: "var(--color-text-muted)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {title}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <button
            onClick={() => router.push("/worklogs")}
            className="flex items-center gap-1.5 text-sm mb-1 w-fit"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: 0,
            }}
          >
            <ArrowLeft size={14} />
            Vissza a munkalapokhoz
          </button>
          <h1 className="text-2xl font-bold text-white truncate">
            {isNew ? "Új munkalap rögzítése" : `Munkalap: ${worklogNumber ?? id}`}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Részletes adminisztráció és anyagfelhasználás
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!isNew && (
            <Badge variant={status === "draft" ? "default" : "success"}>
              {status === "draft" ? "Piszkozat" : "Véglegesített"}
            </Badge>
          )}
          {status === "finalized" && (
            <Button
              variant="secondary"
              onClick={() => window.open(`/worklogs/${id}/print`, "_blank")}
            >
              <Download size={15} style={{ marginRight: "6px" }} />
              PDF
            </Button>
          )}
          {status === "draft" && !isNew && (
            <Button variant="primary" disabled={saving} onClick={() => void finalize()}>
              <CheckCircle2 size={15} style={{ marginRight: "6px" }} />
              Véglegesítés
            </Button>
          )}
        </div>
      </div>

      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
        {/* Section 1: Alapadatok */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <SectionHeader title="Alapadatok" />

          {/* Row 1: Szervezet | Munkavégzés típusa | Technikus */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wl-contact">Szervezet *</Label>
              <Select
                value={contactId || "__empty__"}
                onValueChange={(v) => setContactId(v === "__empty__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger id="wl-contact" className="w-full">
                  <SelectValue placeholder="-- Szervezet --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Szervezet --</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wl-category">Munkavégzés típusa *</Label>
              <Select
                value={category || "__empty__"}
                onValueChange={(v) => setCategory(v === "__empty__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger id="wl-category" className="w-full">
                  <SelectValue placeholder="-- Típus --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Típus --</SelectItem>
                  {WORK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wl-technician">Technikus</Label>
              <Select
                value={technicianName || "__empty__"}
                onValueChange={(v) => setTechnicianName(v === "__empty__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger id="wl-technician" className="w-full">
                  <SelectValue placeholder="-- Technikus --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Technikus --</SelectItem>
                  {crmUsers.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Dátum | Kezdés | Befejezés */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Input
              type="date"
              label="Dátum *"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              required
              disabled={disabled}
            />
            <Input
              type="time"
              label="Kezdés *"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              required
              disabled={disabled}
            />
            <Input
              type="time"
              label="Befejezés *"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              required
              disabled={disabled}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Input
              label="Helyszín / Cím"
              type="text"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Pl. Központi iroda, Budapest"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Section 2: Részletek */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <SectionHeader title="Részletek" />

          <Textarea
            label="Elvégzett munka részletes leírása *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            disabled={disabled}
            placeholder="Részletes leírás..."
            rows={4}
            className="min-h-[120px] resize-y"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              type="number"
              label="Kiszállás / Útiköltség (km)"
              value={travelKm}
              onChange={(e) => setTravelKm(e.target.value)}
              placeholder="Pl. 15"
              disabled={disabled}
              min={0}
            />
            <Textarea
              label="Belső megjegyzés (ügyfél nem látja)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={disabled}
              placeholder="Belső feljegyzések..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        {/* Section 3: tételek (szerviz / anyag) */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className={sectionHeaderCls + " flex-1"}
              style={{
                color: "var(--color-text-muted)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              Tételek
            </div>
            {!disabled && (
              <button
                type="button"
                className="text-xs flex items-center gap-1 px-2 py-1 rounded-md ml-3"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-accent-primary)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
              >
                <Plus size={13} /> Új tétel
              </button>
            )}
          </div>
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <table className="w-full min-w-[640px]">
              <thead>
                <tr
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {["Megnevezés", "Mennyiség", "Egység", "Egységár (opcionális)", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                  >
                    <td className="p-2">
                      <InputControl
                        value={row.description}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, description: e.target.value } : it,
                            ),
                          )
                        }
                        placeholder="Leírás"
                        disabled={disabled}
                        className="h-9 w-full min-w-[200px] text-sm"
                      />
                    </td>
                    <td className="p-2 w-24">
                      <InputControl
                        value={String(row.quantity)}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? {
                                    ...it,
                                    quantity: Math.max(
                                      1,
                                      Number.parseInt(e.target.value, 10) || 1,
                                    ),
                                  }
                                : it,
                            ),
                          )
                        }
                        type="number"
                        min={1}
                        disabled={disabled}
                        className="h-9 w-full text-sm"
                      />
                    </td>
                    <td className="p-2 w-28">
                      <InputControl
                        value={row.unit}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, unit: e.target.value } : it,
                            ),
                          )
                        }
                        placeholder="db"
                        disabled={disabled}
                        className="h-9 w-full text-sm"
                      />
                    </td>
                    <td className="p-2 w-32">
                      <InputControl
                        value={row.unit_price == null ? "" : String(row.unit_price)}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? {
                                    ...it,
                                    unit_price:
                                      v === "" ? null : Number.parseFloat(v) || null,
                                  }
                                : it,
                            ),
                          );
                        }}
                        type="number"
                        disabled={disabled}
                        className="h-9 w-full text-sm"
                      />
                    </td>
                    <td className="p-2 text-center">
                      {!disabled && items.length > 1 && (
                        <button
                          type="button"
                          className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                          style={{
                            border: "none",
                            cursor: "pointer",
                            background: "transparent",
                            color: "var(--color-text-muted)",
                          }}
                          onClick={() =>
                            setItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Tétel törlése"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Aláírások */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Technikus aláírása",
              nameLabel: "Technikus neve *",
              nameValue: technicianName,
              setName: setTechnicianName,
            },
            {
              title: "Ügyfél aláírása",
              nameLabel: "Ügyfél neve (opcionális)",
              nameValue: clientName,
              setName: setClientName,
            },
          ].map((sig) => (
            <div
              key={sig.title}
              className="rounded-xl border p-6 flex flex-col gap-4"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-border-subtle)",
              }}
            >
              <div
                className={sectionHeaderCls + " flex items-center gap-2"}
                style={{
                  color: "var(--color-text-muted)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <FileSignature size={14} /> {sig.title}
              </div>
              <Input
                label={sig.nameLabel}
                type="text"
                value={sig.nameValue}
                onChange={(e) => sig.setName(e.target.value)}
                disabled={disabled}
              />
              <div
                className="h-32 rounded-lg flex items-center justify-center border-dashed border-2 text-sm"
                style={{
                  borderColor: "var(--color-border-default)",
                  color: "var(--color-text-muted)",
                }}
              >
                Aláírás pad helye
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        {!disabled && (
          <div
            className="flex items-center justify-between gap-4 pt-6 border-t"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div>
              <Badge variant="default">Piszkozat</Badge>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Mégse
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                <Save size={15} style={{ marginRight: "6px" }} />
                {saving ? "Mentés…" : "Mentés piszkozatként"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function WorklogFormPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="p-6 text-white">Betöltés...</div>}>
      <WorklogFormContent id={resolvedParams.id} />
    </Suspense>
  );
}
