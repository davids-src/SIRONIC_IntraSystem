"use client";

import {
  PageHeader,
  Card,
  Button,
  Input,
  Textarea,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  UnifiedPdfTemplate,
  ItemPickerModal,
  PdfPreviewModal,
  generatePdfFromElement,
} from "@crm/ui";
import type {
  CompletionCertificate,
  CompletionCertificateStatus,
  Settings,
  Contact,
} from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { Download, Mail, Loader2, Save, Eye } from "lucide-react";

function parseCc(raw: unknown): CompletionCertificate {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as CompletionCertificate),
    work_period_start: r.work_period_start ? new Date(String(r.work_period_start)) : null,
    work_period_end: r.work_period_end ? new Date(String(r.work_period_end)) : null,
    signed_at: r.signed_at ? new Date(String(r.signed_at)) : null,
    created_at: new Date(String(r.created_at)),
    updated_at: new Date(String(r.updated_at)),
  };
}

const statusLabel: Record<CompletionCertificateStatus, string> = {
  draft: "Aktív",
  sent: "Kiküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

const statusVariant: Record<
  CompletionCertificateStatus,
  "default" | "warning" | "success" | "error"
> = {
  draft: "success",
  sent: "success",
  accepted: "success",
  rejected: "error",
};

export default function CompletionCertificateFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";
  const printRef = useRef<HTMLDivElement>(null);

  const [doc, setDoc] = useState<CompletionCertificate | null>(null);
  const [companyDetails, setCompanyDetails] = useState<
    Settings["company_details"] | null
  >(null);
  const [title, setTitle] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [status, setStatus] = useState<CompletionCertificateStatus>("draft");
  const [clientName, setClientName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Expanded fields
  const [lines, setLines] = useState<any[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [priceList, setPriceList] = useState<any[]>([]);
  const [servicePriceList, setServicePriceList] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [clientContact, setClientContact] = useState<Contact | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Contacts (for partner picker on new doc)
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");

  // Import states
  const [sourceType, setSourceType] = useState<"offer" | "worklog" | "project" | "none">(
    "none",
  );
  const [sourceId, setSourceId] = useState("");
  const [sourceList, setSourceList] = useState<
    { id: string; label: string; data: any }[]
  >([]);
  const [loadingSource, setLoadingSource] = useState(false);

  useEffect(() => {
    // Always load settings (for PDF)
    apiJson<Settings>("/api/settings")
      .then((s) => setCompanyDetails(s.company_details ?? null))
      .catch(() => {});

    // Load price list items
    apiJson<any[]>("/api/price-list")
      .then((res) => setPriceList(res))
      .catch(() => {});

    // Load service price list items
    apiJson<any[]>("/api/service-price-list")
      .then((res) => setServicePriceList(res))
      .catch(() => {});

    // Load contacts (for partner picker)
    apiJson<Contact[]>("/api/contacts")
      .then((res) => setContacts(res))
      .catch(() => {});

    if (isNew) return;
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/completion-certificates/${id}`, {
          signal: ac.signal,
        });
        const c = parseCc(raw);
        setDoc(c);
        setTitle(c.title);
        setWorkSummary(c.work_summary);
        setStatus(c.status);
        setClientName(c.client_name ?? "");
        setRecipientName(c.recipient_name ?? "");
        setRecipientEmail(c.recipient_email ?? "");
        setTotalHours(c.total_hours != null ? String(c.total_hours) : "");
        setPeriodStart(
          c.work_period_start ? c.work_period_start.toISOString().slice(0, 10) : "",
        );
        setPeriodEnd(
          c.work_period_end ? c.work_period_end.toISOString().slice(0, 10) : "",
        );
        setLines(c.lines ?? []);
        setRejectionReason(c.rejection_reason ?? "");
        setLoadErr(null);
        // Betöltjük a partner kontakt adatait a PDF-hez
        if (c.contact_id) {
          apiJson<Contact>(`/api/contacts/${c.contact_id}`)
            .then((ct) => setClientContact(ct))
            .catch(() => {});
        }
      } catch {
        if (!ac.signal.aborted) setLoadErr("Az igazolás nem tölthető be.");
      }
    })();
    return () => ac.abort();
  }, [id, isNew]);

  const save = async () => {
    if (isNew) {
      if (!title.trim() || !workSummary.trim()) {
        setLoadErr("Cím és összefoglaló kötelező.");
        return;
      }
      setSaving(true);
      setLoadErr(null);
      try {
        const created = await apiJsonBody<Record<string, unknown>>(
          "/api/completion-certificates",
          "POST",
          {
            title: title.trim(),
            work_summary: workSummary.trim(),
            status: "draft",
            contact_id: contactId || null,
            total_hours: totalHours.trim() === "" ? null : Number.parseFloat(totalHours),
            work_period_start: periodStart ? new Date(periodStart) : null,
            work_period_end: periodEnd ? new Date(periodEnd) : null,
            offer_id: sourceType === "offer" ? sourceId : null,
            worklog_ids: sourceType === "worklog" ? [sourceId] : [],
            project_id: sourceType === "project" ? sourceId : null,
            lines,
          },
        );
        router.replace(`/completion-certificates/${String(created._id)}`);
      } catch (e) {
        setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    setLoadErr(null);
    try {
      const raw = await apiJsonBody<unknown>(
        `/api/completion-certificates/${id}`,
        "PATCH",
        {
          title: title.trim(),
          work_summary: workSummary.trim(),
          status,
          client_name: clientName.trim() || null,
          recipient_name: recipientName.trim() || null,
          recipient_email: recipientEmail.trim() || null,
          total_hours: totalHours.trim() === "" ? null : Number.parseFloat(totalHours),
          work_period_start: periodStart ? new Date(periodStart) : null,
          work_period_end: periodEnd ? new Date(periodEnd) : null,
          lines,
        },
      );
      const parsed = parseCc(raw);
      setDoc(parsed);
      setLines(parsed.lines ?? []);
      setRejectionReason(parsed.rejection_reason ?? "");
      setEmailSuccess(false);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  const addServiceItem = async (service: any) => {
    if (!service) return;

    try {
      const payload: any = { partnerId: null };
      if (service.category_id) {
        payload.categoryId = service.category_id;
      }
      const calcData = await apiJsonBody<{
        calculatedPrice: number;
        snapshot: any;
      }>(`/api/service-price-list/${service._id}/calculated-price`, "POST", payload);

      setLines((prev) => [
        ...prev,
        {
          price_list_item_id: null,
          service_price_list_item_id: service._id,
          price_snapshot: calcData.snapshot,
          description: service.name,
          quantity: 1,
          unit: service.unit || "db",
          net_unit_price: calcData.calculatedPrice,
        },
      ]);
    } catch (e) {
      alert("Hiba történt az árkalkuláció során.");
    }
  };

  const handleSourceTypeChange = async (type: string) => {
    setSourceType(type as any);
    setSourceId("");
    if (type === "none") {
      setSourceList([]);
      return;
    }
    setLoadingSource(true);
    try {
      if (type === "offer") {
        const res = await apiJson<any[]>("/api/offers");
        setSourceList(
          res.map((r) => ({
            id: r._id,
            label: `${r.offer_number} - ${r.title}`,
            data: r,
          })),
        );
      } else if (type === "worklog") {
        const res = await apiJson<any[]>("/api/worklogs");
        setSourceList(
          res.map((r) => ({
            id: r._id,
            label: `${r.worklog_number} - ${r.work_category}`,
            data: r,
          })),
        );
      } else if (type === "project") {
        const res = await apiJson<any[]>("/api/projects");
        setSourceList(
          res.map((r) => ({
            id: r._id,
            label: `${r.project_number} - ${r.name}`,
            data: r,
          })),
        );
      }
    } catch {
      setLoadErr("Források betöltése sikertelen.");
    } finally {
      setLoadingSource(false);
    }
  };

  const handleImport = () => {
    if (!sourceId || sourceType === "none") return;
    const selected = sourceList.find((s) => s.id === sourceId)?.data;
    if (!selected) return;

    if (sourceType === "offer") {
      setTitle(`Teljesítési igazolás - ${selected.offer_number}`);
      const summary = selected.lines
        .map((l: any) => `- ${l.description} (${l.quantity} ${l.unit})`)
        .join("\n");
      setWorkSummary(`Elvégzett feladatok és tételek az ajánlat alapján:\n\n${summary}`);
      if (selected.lines && Array.isArray(selected.lines)) {
        setLines(
          selected.lines.map((l: any) => ({
            price_list_item_id: l.price_list_item_id ?? null,
            service_price_list_item_id: l.service_price_list_item_id ?? null,
            price_snapshot: l.price_snapshot ?? null,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            net_unit_price: l.net_unit_price ?? 0,
          })),
        );
      }
    } else if (sourceType === "worklog") {
      setTitle(`Teljesítési igazolás - ${selected.worklog_number}`);
      const summary = selected.items
        .map((l: any) => `- ${l.description} (${l.quantity} ${l.unit})`)
        .join("\n");
      setWorkSummary(
        `Elvégzett munka (${new Date(selected.work_date).toLocaleDateString()}):\n${selected.work_description}\n\nFelhasznált anyagok:\n${summary}`,
      );
      if (selected.client_name) setClientName(selected.client_name);
      if (selected.work_date) setPeriodStart(selected.work_date.substring(0, 10));
      if (selected.items && Array.isArray(selected.items)) {
        setLines(
          selected.items.map((it: any) => ({
            price_list_item_id: it.price_list_item_id ?? null,
            service_price_list_item_id: it.service_price_list_item_id ?? null,
            price_snapshot: it.price_snapshot ?? null,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            net_unit_price: it.unit_price ?? 0,
          })),
        );
      }
    } else if (sourceType === "project") {
      setTitle(`Teljesítési igazolás - ${selected.project_number}`);
      const tasks =
        selected.tasks?.map((t: any) => `- ${t.title} (${t.status})`).join("\n") || "";
      setWorkSummary(`Projekt: ${selected.name}\n\nProjekt feladatok:\n${tasks}`);
      if (selected.start_date) setPeriodStart(selected.start_date.substring(0, 10));
      if (selected.end_date) setPeriodEnd(selected.end_date.substring(0, 10));
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setGeneratingPdf(true);
    try {
      await generatePdfFromElement(
        printRef.current,
        `Teljesitesi_igazolas_${doc?.certificate_number ?? id}.pdf`,
      );
    } catch {
      alert("Hiba történt a PDF generálása során.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    setLoadErr(null);
    setEmailSuccess(false);
    try {
      await apiJsonBody(`/api/completion-certificates/${id}/send-email`, "POST", {});
      setEmailSuccess(true);
      // Refresh doc to reflect potential status change to "sent"
      const raw = await apiJson<unknown>(`/api/completion-certificates/${id}`);
      const c = parseCc(raw);
      setDoc(c);
      setStatus(c.status);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Hiba az e-mail küldése során.");
    } finally {
      setSendingEmail(false);
    }
  };

  if (!isNew && !doc && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (!isNew && loadErr && !doc) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-[var(--color-status-error)]">{loadErr}</p>
        <Button
          variant="secondary"
          onClick={() => router.push("/completion-certificates")}
        >
          Vissza
        </Button>
      </div>
    );
  }

  const fmtDate = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("hu-HU").format(d) : "–";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <PageHeader
        title={
          isNew
            ? "Új teljesítési igazolás"
            : doc
              ? doc.certificate_number
              : "Teljesítési igazolás"
        }
        subtitle="Szerződések és projektek lezárása"
        actions={
          <div className="flex items-center gap-2">
            {!isNew && doc && (
              <>
                <Button variant="secondary" onClick={() => setShowPreviewModal(true)}>
                  <Eye size={15} className="mr-1.5" />
                  Előnézet
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowPreviewModal(true)}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? (
                    <Loader2 size={15} className="mr-1.5 animate-spin" />
                  ) : (
                    <Download size={15} className="mr-1.5" />
                  )}
                  {generatingPdf ? "PDF…" : "PDF"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleSendEmail()}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 size={15} className="mr-1.5 animate-spin" />
                  ) : (
                    <Mail size={15} className="mr-1.5" />
                  )}
                  {sendingEmail ? "Küldés…" : "E-mail"}
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              onClick={() => router.push("/completion-certificates")}
            >
              Vissza
            </Button>
          </div>
        }
      />

      {loadErr && (
        <p
          className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-4 py-2"
          role="alert"
        >
          {loadErr}
        </p>
      )}

      {emailSuccess && (
        <div className="bg-green-950/30 text-green-400 p-4 rounded-lg border border-green-900/50">
          E-mail sikeresen elküldve.
        </div>
      )}

      {rejectionReason && (
        <Card className="p-4 bg-red-950/20 border-red-900/50 text-red-200">
          <h4 className="text-sm font-bold text-red-400 mb-1">Ügyfél által elutasítva</h4>
          <p className="text-sm italic">&quot;{rejectionReason}&quot;</p>
        </Card>
      )}

      {!isNew && doc && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Azonosító:</span>
          <Badge variant="default">{doc.certificate_number}</Badge>
        </div>
      )}

      {isNew && (
        <Card className="p-6 bg-blue-50/50 border-blue-100">
          <h3 className="text-sm font-bold text-blue-900 mb-4">
            Adatok importálása meglévő forrásból (Opcionális)
          </h3>
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <Label>Forrás típusa</Label>
              <Select value={sourceType} onValueChange={handleSourceTypeChange}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Ne importáljon --</SelectItem>
                  <SelectItem value="offer">Ajánlat</SelectItem>
                  <SelectItem value="worklog">Munkalap</SelectItem>
                  <SelectItem value="project">Projekt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sourceType !== "none" && (
              <div className="flex flex-col gap-2 flex-1">
                <Label>Válassz dokumentumot</Label>
                <Select
                  value={sourceId}
                  onValueChange={setSourceId}
                  disabled={loadingSource}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue
                      placeholder={loadingSource ? "Betöltés..." : "Válassz..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={handleImport}
              disabled={sourceType === "none" || !sourceId}
            >
              Importálás
            </Button>
          </div>
        </Card>
      )}

      {/* Partner picker – new doc only */}
      {isNew && (
        <Card className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">
            Partner (Ügyfél)
          </h3>
          <div className="flex flex-col gap-1.5">
            <Label>Partner</Label>
            <Select
              value={contactId || "__empty__"}
              onValueChange={(v) => setContactId(v === "__empty__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válassz partnert (opcionális)…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__empty__">
                  — Válassz partnert (opcionális) —
                </SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        {(() => {
          const disabled = false; // Mindig szerkeszthető
          return (
            <>
              <Input
                label="Cím *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={disabled}
              />
              <Textarea
                label="Munka összefoglalója *"
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
                rows={5}
                disabled={disabled}
              />

              {/* Itemized Lines Editor */}
              <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-text-secondary)]">
                  Igazolt tételek / anyagok listája (Opcionális)
                </h3>
                {lines.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] italic">
                    Nincsenek egyedileg megadott tételek. Adj hozzá kézzel vagy válassz az
                    árlistából.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lines.map((line, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col md:flex-row gap-3 items-end border-b pb-3 md:border-0 md:pb-0"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <Label className="text-xs">Megnevezés *</Label>
                          <Input
                            value={line.description}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].description = e.target.value;
                              setLines(newLines);
                            }}
                            placeholder="Tétel leírása..."
                            disabled={disabled}
                          />
                        </div>
                        <div className="w-24">
                          <Label className="text-xs">Mennyiség</Label>
                          <Input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].quantity = Number(e.target.value) || 0;
                              setLines(newLines);
                            }}
                            disabled={disabled}
                          />
                        </div>
                        <div className="w-24">
                          <Label className="text-xs">Egység</Label>
                          <Input
                            value={line.unit}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].unit = e.target.value;
                              setLines(newLines);
                            }}
                            placeholder="db, óra..."
                            disabled={disabled}
                          />
                        </div>
                        <div className="w-28">
                          <Label className="text-xs">Nettó egységár (Ft)</Label>
                          <Input
                            type="number"
                            value={line.net_unit_price}
                            onChange={(e) => {
                              const newLines = [...lines];
                              newLines[idx].net_unit_price = Number(e.target.value) || 0;
                              setLines(newLines);
                            }}
                            disabled={disabled}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 p-2"
                          onClick={() => {
                            setLines(lines.filter((_, i) => i !== idx));
                          }}
                          disabled={disabled}
                        >
                          Törlés
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setLines([
                        ...lines,
                        {
                          price_list_item_id: null,
                          description: "",
                          quantity: 1,
                          unit: "db",
                          net_unit_price: 0,
                        },
                      ]);
                    }}
                    disabled={disabled}
                  >
                    + Új tétel manuálisan
                  </Button>
                  {!disabled && (
                    <Button variant="secondary" onClick={() => setShowPicker(true)}>
                      📦 Tétel hozzáadása árlistából
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border-subtle)]">
                <Input
                  type="date"
                  label="Munkaidőszak kezdete"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  disabled={disabled}
                />
                <Input
                  type="date"
                  label="Munkaidőszak vége"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  disabled={disabled}
                />
              </div>
              <Input
                label="Összesített órák (opcionális)"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                inputMode="decimal"
                disabled={disabled}
              />
              {!isNew && (
                <>
                  <Input
                    label="Ügyfél aláíró neve"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />

                  {/* Recipient section */}
                  <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      E-mail értesítés címzettje (felülírja a partner e-mail-jét)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Fogadó neve"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Pl. Kovács István"
                      />
                      <Input
                        type="email"
                        label="Fogadó e-mail cím"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="pelda@ceg.hu"
                      />
                    </div>
                  </div>
                </>
              )}
              <Button variant="primary" disabled={saving} onClick={() => void save()}>
                <Save size={15} className="mr-1.5" />
                {saving ? "Mentés…" : isNew ? "Igazolás létrehozása" : "Mentés"}
              </Button>
            </>
          );
        })()}
      </Card>

      {/* Hidden PDF template */}
      {!isNew && doc && (
        <div
          ref={printRef}
          style={{
            position: "fixed",
            left: "-9999px",
            top: "0px",
            width: "210mm",
            backgroundColor: "#ffffff",
            color: "#000000",
            zIndex: 99999,
          }}
        >
          <UnifiedPdfTemplate
            documentTitle="Teljesítési igazolás"
            documentId={doc.certificate_number}
            date={new Date()}
            provider={companyDetails}
            client={
              clientContact ??
              (doc.client_name
                ? ({
                    _id: "",
                    contact_number: "",
                    partner_id: null,
                    tenantId: "",
                    type: "company" as const,
                    name: doc.client_name,
                    short_name: null,
                    tax_number: null,
                    registration_number: null,
                    address: { zip: "", city: "", street: "", country: "HU" },
                    billing_address: null,
                    contact_persons: [],
                    phone: null,
                    email: null,
                    notes: null,
                    tags: [],
                    has_portal_access: false,
                    portal_permissions: {
                      menu_tickets: false,
                      menu_worklogs: false,
                      menu_offers: false,
                      menu_completion_certificates: false,
                      menu_projects: false,
                      menu_contracts: false,
                      menu_invoices: false,
                      menu_company_profile: false,
                      menu_settings: false,
                    },
                    active_services: [],
                    contract_type: null,
                  } as unknown as Contact)
                : null)
            }
          >
            <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#111" }}>
              <h3 style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px" }}>
                {doc.title}
              </h3>

              <table
                style={{
                  width: "100%",
                  marginBottom: "16px",
                  fontSize: "12px",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 8px", color: "#6b7280", width: "40%" }}>
                      Munkaidőszak:
                    </td>
                    <td style={{ padding: "4px 8px", fontWeight: 600 }}>
                      {fmtDate(doc.work_period_start)} – {fmtDate(doc.work_period_end)}
                    </td>
                  </tr>
                  {doc.total_hours != null && (
                    <tr>
                      <td style={{ padding: "4px 8px", color: "#6b7280" }}>
                        Összesített órák:
                      </td>
                      <td style={{ padding: "4px 8px", fontWeight: 600 }}>
                        {doc.total_hours} h
                      </td>
                    </tr>
                  )}
                  {doc.client_name && (
                    <tr>
                      <td style={{ padding: "4px 8px", color: "#6b7280" }}>
                        Ügyfél aláíró:
                      </td>
                      <td style={{ padding: "4px 8px", fontWeight: 600 }}>
                        {doc.client_name}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div
                style={{
                  padding: "12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  backgroundColor: "#f9fafb",
                  whiteSpace: "pre-wrap",
                  marginBottom: "20px",
                }}
              >
                {doc.work_summary}
              </div>

              {doc.lines && doc.lines.length > 0 && (
                <div style={{ marginTop: "20px", marginBottom: "20px" }}>
                  <h4
                    style={{
                      fontWeight: 700,
                      fontSize: "12px",
                      marginBottom: "8px",
                      borderBottom: "1px solid #e5e7eb",
                      paddingBottom: "4px",
                    }}
                  >
                    Igazolt tételek / anyagok
                  </h4>
                  <table
                    style={{
                      width: "100%",
                      fontSize: "11px",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6", textAlign: "left" }}>
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          Megnevezés
                        </th>
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                            width: "70px",
                            textAlign: "right",
                          }}
                        >
                          Mennyiség
                        </th>
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                            width: "50px",
                          }}
                        >
                          Egység
                        </th>
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                            width: "100px",
                            textAlign: "right",
                          }}
                        >
                          Nettó egységár
                        </th>
                        <th
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #e5e7eb",
                            width: "100px",
                            textAlign: "right",
                          }}
                        >
                          Nettó összeg
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.lines.map((l, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 8px" }}>{l.description}</td>
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "right",
                              fontWeight: 600,
                            }}
                          >
                            {l.quantity}
                          </td>
                          <td style={{ padding: "6px 8px", color: "#4b5563" }}>
                            {l.unit}
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "right",
                              color: "#374151",
                            }}
                          >
                            {(l.net_unit_price ?? 0).toLocaleString("hu-HU")} Ft
                          </td>
                          <td
                            style={{
                              padding: "6px 8px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            {((l.net_unit_price ?? 0) * l.quantity).toLocaleString(
                              "hu-HU",
                            )}{" "}
                            Ft
                          </td>
                        </tr>
                      ))}
                      <tr
                        style={{
                          borderTop: "2px solid #e5e7eb",
                          backgroundColor: "#f9fafb",
                        }}
                      >
                        <td
                          colSpan={3}
                          style={{
                            padding: "8px",
                            fontWeight: 700,
                            fontSize: "12px",
                            textAlign: "right",
                          }}
                        >
                          Nettó összesen:
                        </td>
                        <td />
                        <td
                          style={{
                            padding: "8px",
                            textAlign: "right",
                            fontWeight: 800,
                            fontSize: "13px",
                            color: "#111827",
                          }}
                        >
                          {doc.lines
                            .reduce(
                              (sum, l) => sum + (l.net_unit_price ?? 0) * l.quantity,
                              0,
                            )
                            .toLocaleString("hu-HU")}{" "}
                          Ft
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {doc.client_signature ? (
                <div
                  style={{
                    marginTop: "40px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
                      Teljesítésigazolás kiállítója:
                    </p>
                    <div
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "180px",
                        height: "40px",
                      }}
                    ></div>
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        marginTop: "4px",
                        marginBottom: 0,
                      }}
                    >
                      Sironic Kft.
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
                      Vevő általi elfogadás és aláírás:
                    </p>
                    <div style={{ marginTop: "4px" }}>
                      <img
                        src={doc.client_signature}
                        alt="Aláírás"
                        style={{ maxHeight: "60px", maxWidth: "180px" }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        marginTop: "4px",
                        marginBottom: 0,
                      }}
                    >
                      {doc.client_name || "Vevő képviselője"}
                    </p>
                    {doc.client_title && (
                      <p style={{ fontSize: "10px", color: "#4b5563", margin: 0 }}>
                        {doc.client_title}
                      </p>
                    )}
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>
                      Dátum: {fmtDate(doc.signed_at)}
                    </p>
                  </div>
                </div>
              ) : (
                doc.signed_at && (
                  <div
                    style={{
                      marginTop: "24px",
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: "16px",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      Aláírva: {fmtDate(doc.signed_at)} — {doc.client_name || ""}
                    </p>
                  </div>
                )
              )}
            </div>
          </UnifiedPdfTemplate>
        </div>
      )}
      <ItemPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        priceList={priceList}
        servicePriceList={servicePriceList}
        onSelectProduct={(p) => {
          setLines((prev) => [
            ...prev,
            {
              price_list_item_id: p._id,
              service_price_list_item_id: null,
              description: p.name,
              quantity: 1,
              unit: p.unit || "db",
              net_unit_price: p.net_price ?? 0,
            },
          ]);
        }}
        onSelectService={(s) => addServiceItem(s)}
        title="Tétel hozzáadása"
      />

      {/* PDF Előnézet Modal */}
      {!isNew && doc && (
        <PdfPreviewModal
          open={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          filename={`Teljesitesi_igazolas_${doc.certificate_number}.pdf`}
          title={`Teljesítési igazolás előnézet — ${doc.certificate_number}`}
        >
          <UnifiedPdfTemplate
            documentTitle="Teljesítési igazolás"
            documentId={doc.certificate_number}
            date={new Date()}
            provider={companyDetails}
            client={
              clientContact ??
              (doc.client_name
                ? ({
                    _id: "",
                    contact_number: "",
                    partner_id: null,
                    tenantId: "",
                    type: "company" as const,
                    name: doc.client_name,
                    short_name: null,
                    tax_number: null,
                    registration_number: null,
                    address: { zip: "", city: "", street: "", country: "HU" },
                    billing_address: null,
                    shipping_address: null,
                    email: null,
                    phone: null,
                    website: null,
                    contacts: [],
                    notes: null,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  } as unknown as Contact)
                : null)
            }
          >
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                {doc.title}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: "1.6",
                  color: "#374151",
                  whiteSpace: "pre-wrap",
                }}
              >
                {doc.work_summary}
              </p>
            </div>

            {(doc.work_period_start ||
              doc.work_period_end ||
              doc.total_hours != null) && (
              <div
                style={{
                  marginBottom: "24px",
                  padding: "12px 16px",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                {doc.work_period_start && doc.work_period_end && (
                  <p style={{ margin: "0 0 4px" }}>
                    <strong>Munkavégzés időszaka:</strong>{" "}
                    {fmtDate(doc.work_period_start)} – {fmtDate(doc.work_period_end)}
                  </p>
                )}
                {doc.total_hours != null && (
                  <p style={{ margin: 0 }}>
                    <strong>Összesített óraszám:</strong> {doc.total_hours} óra
                  </p>
                )}
              </div>
            )}

            {lines.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    marginBottom: "8px",
                    color: "#111827",
                  }}
                >
                  Elvégzett tételek / Anyagok
                </h4>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#f3f4f6",
                        borderBottom: "2px solid #e5e7eb",
                      }}
                    >
                      <th style={{ padding: "8px", textAlign: "left" }}>Leírás</th>
                      <th style={{ padding: "8px", textAlign: "center", width: "15%" }}>
                        Mennyiség
                      </th>
                      <th style={{ padding: "8px", textAlign: "left", width: "15%" }}>
                        Egység
                      </th>
                      <th style={{ padding: "8px", textAlign: "right", width: "20%" }}>
                        Nettó egységár
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "8px" }}>{l.description}</td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          {l.quantity}
                        </td>
                        <td style={{ padding: "8px" }}>{l.unit}</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {l.net_unit_price
                            ? new Intl.NumberFormat("hu-HU", {
                                style: "currency",
                                currency: "HUF",
                                maximumFractionDigits: 0,
                              }).format(l.net_unit_price)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </UnifiedPdfTemplate>
        </PdfPreviewModal>
      )}
    </div>
  );
}
