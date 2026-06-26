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
import { UnifiedPdfTemplate } from "@crm/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, use, Suspense, useEffect, useCallback, useRef } from "react";
import type {
  Contact,
  CrmUser,
  Worklog,
  WorklogItem,
  Settings,
  CompanyDetails,
  PriceListItem,
  StockItemWithProduct,
  ChecklistTemplate,
  InventoryItem,
} from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import {
  Save,
  FileSignature,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  ArrowLeft,
  Send,
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [crmUsers, setCrmUsers] = useState<{ value: string; label: string }[]>([]);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const [contactId, setContactId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [targetType, setTargetType] = useState<"partner" | "project">("partner");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectDoc, setSelectedProjectDoc] = useState<any | null>(null);
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
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [servicedItemIds, setServicedItemIds] = useState<string[]>([]);
  const [contactInventory, setContactInventory] = useState<InventoryItem[]>([]);

  const [showPricesOnPdf, setShowPricesOnPdf] = useState(true);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [priceList, setPriceList] = useState<PriceListItem[]>([]);
  const [servicePriceList, setServicePriceList] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<StockItemWithProduct[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  const disabled = status !== "draft";

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [cList, uList, sList, pList, stList, chList, prList, spList] =
          await Promise.all([
            apiJson<Contact[]>("/api/contacts", { signal: ac.signal }),
            apiJson<unknown[]>("/api/crm-users", { signal: ac.signal }),
            apiJson<Settings>("/api/settings", { signal: ac.signal }),
            apiJson<PriceListItem[]>("/api/price-list", { signal: ac.signal }),
            apiJson<StockItemWithProduct[]>("/api/warehouse/stock", {
              signal: ac.signal,
            }).catch(() => []),
            apiJson<ChecklistTemplate[]>("/api/checklists", { signal: ac.signal }).catch(
              () => [],
            ),
            apiJson<any[]>("/api/projects", { signal: ac.signal }).catch(() => []),
            apiJson<any[]>("/api/service-price-list", { signal: ac.signal }).catch(
              () => [],
            ),
          ]);
        setContacts(cList);
        setCompanyDetails(sList.company_details || null);
        setPriceList(pList);
        setServicePriceList(spList || []);
        setStockItems(stList);
        setChecklistTemplates(chList || []);
        setProjects(prList.filter((p: any) => p.status !== "closed"));
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
    const fromContact = searchParams.get("contact_id")?.trim();
    const fromProject = searchParams.get("project_id")?.trim();
    if (isNew && fromContact) setContactId(fromContact);
    if (isNew && fromProject) {
      setProjectId(fromProject);
      setTargetType("project");
    }
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
        const pid = (w as any).project_id ?? "";
        setProjectId(pid);
        if (pid) setTargetType("project");
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
        setChecklistItems((w as any).checklist_items || []);
        setServicedItemIds((w as any).serviced_item_ids || []);
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) {
          setLoadErr("A munkalap nem tölthető be.");
        }
      }
    })();
    return () => ac.abort();
  }, [id, isNew]);

  useEffect(() => {
    if (!contactId) {
      setContactInventory([]);
      return;
    }
    const ac = new AbortController();
    apiJson<InventoryItem[]>(`/api/inventory?contact_id=${contactId}`, {
      signal: ac.signal,
    })
      .then((data) => setContactInventory(data))
      .catch(() => setContactInventory([]));
    return () => ac.abort();
  }, [contactId]);

  // Keep selectedProjectDoc in sync with projectId
  useEffect(() => {
    if (!projectId) {
      setSelectedProjectDoc(null);
      return;
    }
    const found = projects.find((p: any) => p._id === projectId);
    setSelectedProjectDoc(found ?? null);
  }, [projectId, projects]);

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
        service_price_list_item_id: it.service_price_list_item_id,
        price_snapshot: it.price_snapshot,
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
              service_price_list_item_id: null,
              price_snapshot: null,
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
      project_id: targetType === "project" && projectId ? projectId : null,
      checklist_items: checklistItems,
      serviced_item_ids: servicedItemIds,
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
    projectId,
    targetType,
    checklistItems,
    servicedItemIds,
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
      // Reload all fields from server response so contact and other data stay visible
      setStatus(w.status);
      setWorklogNumber(w.worklog_number);
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
      setChecklistItems((w as any).checklist_items || []);
    } catch (err) {
      setLoadErr(err instanceof ApiError ? err.message : "Véglegesítés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!confirm("Szeretnél e-mail értesítést küldeni a partnernek erről a munkalapról?"))
      return;
    setSendingEmail(true);
    setLoadErr(null);
    try {
      await apiJsonBody(`/api/worklogs/${id}/send-email`, "POST", {});
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 5000);
    } catch (e) {
      setLoadErr(
        e instanceof ApiError ? e.message : "Hiba történt az e-mail küldése során.",
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const element = printRef.current;

    // Temporarily make it visible for html2pdf (if it's hidden with display:none, html2pdf might render blank)
    element.style.display = "block";

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: `Munkalap_${worklogNumber || id}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };
      await html2pdf().from(element).set(opt).save();
    } catch (e) {
      console.error("PDF generálási hiba:", e);
      alert("Hiba történt a PDF generálása során.");
    } finally {
      element.style.display = "none";
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

  const addServiceItem = async (service: any) => {
    try {
      const payload: any = {
        partnerId: contactId === "__none__" ? null : contactId,
      };
      if (service.category_id) {
        payload.categoryId = service.category_id;
      }
      const calcData = await apiJsonBody<{
        calculatedPrice: number;
        snapshot: any;
      }>(`/api/service-price-list/${service._id}/calculated-price`, "POST", payload);

      const newItem = {
        description: service.name,
        quantity: 1,
        unit: service.unit,
        unit_price: calcData.calculatedPrice,
        price_list_item_id: null,
        service_price_list_item_id: service._id,
        price_snapshot: calcData.snapshot,
      };

      if (items.length === 1 && items[0]?.description === "") {
        setItems([newItem]);
      } else {
        setItems((prev) => [...prev, newItem]);
      }
      setShowServicePicker(false);
      setServiceSearch("");
    } catch (e) {
      alert("Hiba történt az árkalkuláció során.");
    }
  };

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
            <>
              <Button variant="secondary" onClick={handleDownloadPdf}>
                <Download size={15} style={{ marginRight: "6px" }} />
                PDF letöltése
              </Button>
              <Button
                variant="primary"
                onClick={handleSendEmail}
                disabled={sendingEmail || !contactId}
              >
                <Send size={15} style={{ marginRight: "6px" }} />
                {sendingEmail ? "Küldés..." : "E-mail küldése"}
              </Button>
            </>
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

      {emailSuccess && (
        <div className="bg-green-950/30 text-green-400 p-4 rounded-lg border border-green-900/50">
          Az e-mail sikeresen elküldve a partnernek.
        </div>
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

          {/* Target type toggle */}
          {!disabled && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Rögzítés módja:
              </span>
              <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("partner");
                    setProjectId("");
                  }}
                  className="px-4 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    background:
                      targetType === "partner"
                        ? "var(--color-accent-primary)"
                        : "var(--color-bg-secondary)",
                    color: targetType === "partner" ? "#fff" : "var(--color-text-muted)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Partnerre
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("project")}
                  className="px-4 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    background:
                      targetType === "project"
                        ? "var(--color-accent-primary)"
                        : "var(--color-bg-secondary)",
                    color: targetType === "project" ? "#fff" : "var(--color-text-muted)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Projekthez
                </button>
              </div>
            </div>
          )}

          {/* Project selector (only when project mode) */}
          {targetType === "project" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="wl-project">Projekt *</Label>
              <Select
                value={projectId || "__empty__"}
                onValueChange={(v) => setProjectId(v === "__empty__" ? "" : v)}
                disabled={disabled}
              >
                <SelectTrigger id="wl-project" className="w-full">
                  <SelectValue placeholder="-- Projekt --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">-- Projekt --</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} {p.project_number ? `(${p.project_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProjectDoc && (
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
                  {selectedProjectDoc.description && (
                    <span>{selectedProjectDoc.description}</span>
                  )}
                  {selectedProjectDoc.status && (
                    <span>
                      Állapot:{" "}
                      <strong className="text-[var(--color-text-primary)]">
                        {selectedProjectDoc.status}
                      </strong>
                    </span>
                  )}
                  {(selectedProjectDoc.required_items ?? []).length > 0 && (
                    <span>
                      Bevásárlólista:{" "}
                      <strong className="text-amber-400">
                        {selectedProjectDoc.required_items.length} tétel
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

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

        {/* Section 2.5: Munkalap Checklist (Ellenőrzőlista) */}
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div
            className="flex items-center justify-between border-b pb-2"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Munkavégzési Checklist
            </div>
            {!disabled && checklistTemplates.length > 0 && (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="wl-template-apply"
                  className="text-xs text-[var(--color-text-muted)]"
                >
                  Sablon alkalmazása:
                </Label>
                <select
                  id="wl-template-apply"
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-default)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none cursor-pointer"
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const tmpl = checklistTemplates.find((t) => t._id === val);
                      if (tmpl) {
                        const items = tmpl.items.map((it) => ({
                          item_id: it.item_id,
                          text: it.text,
                          is_required: it.is_required,
                          is_completed: false,
                          completed_at: null,
                          completed_by: null,
                        }));
                        setChecklistItems(items);
                      }
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">-- Sablon választása --</option>
                  {checklistTemplates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.items?.length || 0} db)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 mt-2">
            {checklistItems.map((item) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-[var(--color-bg-secondary)]"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={disabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setChecklistItems((prev) =>
                        prev.map((it) => {
                          if (it.item_id === item.item_id) {
                            return {
                              ...it,
                              is_completed: checked,
                              completed_at: checked ? new Date().toISOString() : null,
                              completed_by: checked
                                ? technicianName || "Technikus"
                                : null,
                            };
                          }
                          return it;
                        }),
                      );
                    }}
                    className="rounded border-[var(--color-border-default)] text-[var(--color-accent-primary)] focus:ring-0 cursor-pointer h-4 w-4"
                  />
                  <span
                    className={`text-sm ${item.is_completed ? "line-through text-[var(--color-text-muted)]" : "text-white"}`}
                  >
                    {item.text}
                  </span>
                  {item.is_required && (
                    <Badge
                      variant="error"
                      style={{ fontSize: "10px", padding: "1px 6px" }}
                    >
                      K&#246;telez&#337;
                    </Badge>
                  )}
                </div>
                {item.is_completed && item.completed_by && (
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Kész: {item.completed_by} (
                    {new Date(item.completed_at).toLocaleTimeString("hu-HU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </span>
                )}
              </div>
            ))}
            {checklistItems.length === 0 && (
              <div className="text-center py-4 text-sm text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-lg">
                Nincs checklist hozzárendelve ehhez a munkalaphoz.
              </div>
            )}
          </div>
        </div>

        {/* Section 2.6: Karbantartott rendszerelemek */}
        {contactId && contactInventory.length > 0 && (
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-2"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Karbantartott rendszerelemek (Eszközök)
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)]">
              Jelöld ki azokat az ügyféleszközöket, amelyeken ebben a munkalapban
              javítást/karbantartást végeztél.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {contactInventory.map((item) => {
                const isChecked = servicedItemIds.includes(item._id);
                return (
                  <label
                    key={item._id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/5"
                        : "border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setServicedItemIds((prev) =>
                          checked
                            ? [...prev, item._id]
                            : prev.filter((id) => id !== item._id),
                        );
                      }}
                      className="rounded border-[var(--color-border-default)] text-[var(--color-accent-primary)] focus:ring-0 cursor-pointer h-4 w-4 mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">
                        {item.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {item.category === "hardware"
                          ? "Hardver"
                          : item.category === "software"
                            ? "Szoftver"
                            : "Licenc"}
                        {item.serial_number ? ` • SN: ${item.serial_number}` : ""}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Project shopping list quick-add */}
        {targetType === "project" &&
          selectedProjectDoc &&
          (selectedProjectDoc.required_items ?? []).length > 0 &&
          !disabled && (
            <div
              className="rounded-xl border p-5 flex flex-col gap-3"
              style={{
                background: "rgba(245,158,11,0.05)",
                borderColor: "rgba(245,158,11,0.3)",
              }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#f59e0b" }}
              >
                Projekt bevásárlólista – Gyors hozzáadás
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Az alábbi tételek a projekthez előre fel lettek véve. Kattintsd rájuk,
                hogy felkerüljenek a munkalap anyagaiba.
              </p>
              <div className="flex flex-wrap gap-2">
                {(selectedProjectDoc.required_items as any[]).map((ri: any) => {
                  const alreadyAdded = items.some(
                    (it) => it.price_list_item_id === ri.price_list_item_id,
                  );
                  return (
                    <button
                      key={ri.price_list_item_id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => {
                        setItems((prev) => [
                          ...prev.filter(
                            (it) => it.description.trim() !== "" || it.price_list_item_id,
                          ),
                          {
                            description: ri.name,
                            quantity: ri.required_quantity || 1,
                            unit: ri.unit || "db",
                            unit_price: null,
                            price_list_item_id: ri.price_list_item_id,
                          },
                        ]);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      style={{
                        background: alreadyAdded
                          ? "rgba(245,158,11,0.05)"
                          : "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: alreadyAdded ? "var(--color-text-muted)" : "#f59e0b",
                        cursor: alreadyAdded ? "default" : "pointer",
                        textDecoration: alreadyAdded ? "line-through" : "none",
                      }}
                    >
                      {alreadyAdded ? "✓" : <Plus size={12} />}
                      {ri.name} ({ri.required_quantity} {ri.unit})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              Felhasznált segédanyagok
            </div>
            {!disabled && (
              <div style={{ display: "flex", gap: "8px", marginLeft: "12px" }}>
                <button
                  type="button"
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-accent-primary)",
                    border: "1px solid var(--color-border-default)",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowItemPicker(true)}
                >
                  <Plus size={13} /> + Anyag hozzáadása árlistából
                </button>
                <button
                  type="button"
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-accent-primary)",
                    border: "1px solid var(--color-border-default)",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowServicePicker(true)}
                >
                  <Plus size={13} /> + Szolgáltatás hozzáadása
                </button>
                <button
                  type="button"
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-accent-primary)",
                    border: "1px solid var(--color-border-default)",
                    cursor: "pointer",
                  }}
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                >
                  <Plus size={13} /> + Egyedi anyag
                </button>
              </div>
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
                  {["Anyag neve", "Mennyiség", "Egység", "Egységár (opcionális)", ""].map(
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

      {/* Rejtett PDF sablon */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <UnifiedPdfTemplate
            documentTitle="Munkalap"
            documentId={worklogNumber || id}
            date={workDate ? new Date(workDate) : new Date()}
            provider={companyDetails}
            client={contacts.find((c) => c._id === contactId) || null}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 10px",
                  color: "#000",
                }}
              >
                Elvégzett feladatok
              </h3>
              <div
                style={{
                  padding: "12px",
                  borderLeft: "3px solid #e53935",
                  backgroundColor: "#fff5f5",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "#333",
                  whiteSpace: "pre-wrap",
                }}
              >
                {description}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 8px 0" }}>
                Felhasznált anyagok és munkadíjak:
              </h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  border: "1px solid #dee2e6",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8f9fa",
                      borderBottom: "2px solid #dee2e6",
                    }}
                  >
                    <th
                      style={{
                        padding: "8px",
                        textAlign: "left",
                        borderRight: "1px solid #dee2e6",
                      }}
                    >
                      Megnevezés
                    </th>
                    <th
                      style={{
                        padding: "8px",
                        textAlign: "center",
                        borderRight: showPricesOnPdf ? "1px solid #dee2e6" : "none",
                      }}
                    >
                      Mennyiség
                    </th>
                    {showPricesOnPdf && (
                      <>
                        <th
                          style={{
                            padding: "8px",
                            textAlign: "right",
                            borderRight: "1px solid #dee2e6",
                          }}
                        >
                          Nettó egységár
                        </th>
                        <th style={{ padding: "8px", textAlign: "right" }}>
                          Nettó összesen
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e9ecef" }}>
                      <td
                        style={{ padding: "6px 8px", borderRight: "1px solid #e9ecef" }}
                      >
                        {it.description}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "center",
                          borderRight: showPricesOnPdf ? "1px solid #e9ecef" : "none",
                        }}
                      >
                        {it.quantity} {it.unit}
                      </td>
                      {showPricesOnPdf && (
                        <>
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "right",
                              borderRight: "1px solid #e9ecef",
                            }}
                          >
                            {it.unit_price
                              ? new Intl.NumberFormat("hu-HU", {
                                  style: "currency",
                                  currency: "HUF",
                                  maximumFractionDigits: 0,
                                }).format(it.unit_price)
                              : "-"}
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>
                            {it.unit_price
                              ? new Intl.NumberFormat("hu-HU", {
                                  style: "currency",
                                  currency: "HUF",
                                  maximumFractionDigits: 0,
                                }).format(it.unit_price * it.quantity)
                              : "-"}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {travelKm && Number(travelKm) > 0 && (
                    <tr style={{ borderBottom: "1px solid #e9ecef" }}>
                      <td
                        style={{ padding: "6px 8px", borderRight: "1px solid #e9ecef" }}
                      >
                        Kiszállás / Útiköltség
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "center",
                          borderRight: showPricesOnPdf ? "1px solid #e9ecef" : "none",
                        }}
                      >
                        {travelKm} km
                      </td>
                      {showPricesOnPdf && (
                        <>
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "right",
                              borderRight: "1px solid #e9ecef",
                            }}
                          >
                            -
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>-</td>
                        </>
                      )}
                    </tr>
                  )}
                </tbody>
              </table>

              {showPricesOnPdf && (
                <div
                  style={{
                    marginTop: "12px",
                    textAlign: "right",
                    fontSize: "13px",
                    fontWeight: "bold",
                  }}
                >
                  Nettó végösszeg:{" "}
                  {new Intl.NumberFormat("hu-HU", {
                    style: "currency",
                    currency: "HUF",
                    maximumFractionDigits: 0,
                  }).format(
                    items.reduce(
                      (sum, it) =>
                        sum + (it.unit_price ? it.unit_price * it.quantity : 0),
                      0,
                    ),
                  )}
                </div>
              )}
            </div>
          </UnifiedPdfTemplate>
        </div>
      </div>

      {showItemPicker && (
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
          }}
        >
          <Card
            style={{
              padding: "24px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
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
              <h2 style={{ margin: 0 }}>Hozzáadás árlistából</h2>
              <Button variant="ghost" onClick={() => setShowItemPicker(false)}>
                Bezár
              </Button>
            </div>

            <Input
              placeholder="Keresés..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />

            <div
              style={{
                marginTop: "16px",
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {priceList
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                    p.item_number.toLowerCase().includes(itemSearch.toLowerCase()),
                )
                .map((p) => {
                  const stockItem = stockItems.find(
                    (s) => s.price_list_item_id === p._id,
                  );
                  const stockQty = stockItem ? stockItem.quantity_in_stock : 0;
                  const location = stockItem?.warehouse_location;
                  return (
                    <div
                      key={p._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        border: "1px solid var(--color-border-subtle)",
                        borderRadius: "8px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            marginTop: "4px",
                          }}
                        >
                          <div>
                            {p.item_number} •{" "}
                            {new Intl.NumberFormat("hu-HU", {
                              style: "currency",
                              currency: "HUF",
                              maximumFractionDigits: 0,
                            }).format(p.net_price)}{" "}
                            / {p.unit}
                          </div>
                          {p.type === "product" && (
                            <div
                              style={{
                                fontWeight: 700,
                                color: stockQty > 0 ? "#22c55e" : "#ef4444",
                              }}
                            >
                              Készleten: {stockQty} {p.unit}
                              {location ? ` (${location})` : ""}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const newItem = {
                            description: p.name,
                            quantity: 1,
                            unit: p.unit,
                            unit_price: p.net_price,
                            price_list_item_id: p._id,
                          };
                          if (items.length === 1 && items[0]?.description === "") {
                            setItems([newItem]);
                          } else {
                            setItems((prev) => [...prev, newItem]);
                          }
                          setShowItemPicker(false);
                          setItemSearch("");
                        }}
                      >
                        Kiválaszt
                      </Button>
                    </div>
                  );
                })}
              {priceList.length === 0 && (
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  Nincs találat.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {showServicePicker && (
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
          }}
        >
          <Card
            style={{
              padding: "24px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
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
              <h2 style={{ margin: 0 }}>Hozzáadás szolgáltatások közül</h2>
              <Button variant="ghost" onClick={() => setShowServicePicker(false)}>
                Bezár
              </Button>
            </div>

            <Input
              placeholder="Keresés..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              style={{ marginBottom: "16px" }}
            />

            <div
              style={{
                overflowY: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {servicePriceList
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(serviceSearch.toLowerCase()),
                )
                .map((p) => {
                  return (
                    <div
                      key={p._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        border: "1px solid var(--color-border-subtle)",
                        borderRadius: "8px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                            marginTop: "4px",
                          }}
                        >
                          {p.sku}
                        </div>
                      </div>
                      <Button variant="secondary" onClick={() => addServiceItem(p)}>
                        Kiválaszt
                      </Button>
                    </div>
                  );
                })}
              {servicePriceList.length === 0 && (
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  Nincs találat.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
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
