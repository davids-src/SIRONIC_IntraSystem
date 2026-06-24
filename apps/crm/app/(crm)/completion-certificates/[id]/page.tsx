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
} from "@crm/ui";
import type {
  CompletionCertificate,
  CompletionCertificateStatus,
  Settings,
} from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { Download, Mail, Loader2 } from "lucide-react";

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
  draft: "Piszkozat",
  sent: "Kiküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

const statusVariant: Record<
  CompletionCertificateStatus,
  "default" | "warning" | "success" | "error"
> = {
  draft: "default",
  sent: "warning",
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
    const element = printRef.current;
    element.style.display = "block";
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: `Teljesitesi_igazolas_${doc?.certificate_number ?? id}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };
      await html2pdf().from(element).set(opt).save();
    } catch {
      alert("Hiba történt a PDF generálása során.");
    } finally {
      element.style.display = "none";
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
                <Button
                  variant="secondary"
                  onClick={() => void handleDownloadPdf()}
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
          <span className="text-sm text-[var(--color-text-muted)]">Állapot:</span>
          <Badge variant={statusVariant[doc.status]}>{statusLabel[doc.status]}</Badge>
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

      <Card className="p-6 space-y-4">
        <Input label="Cím *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          label="Munka összefoglalója *"
          value={workSummary}
          onChange={(e) => setWorkSummary(e.target.value)}
          rows={5}
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
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 p-2"
                    onClick={() => {
                      setLines(lines.filter((_, i) => i !== idx));
                    }}
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
            >
              + Új tétel manuálisan
            </Button>
            {priceList.length > 0 && (
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(val) => {
                    const item = priceList.find((p) => p._id === val);
                    if (item) {
                      setLines([
                        ...lines,
                        {
                          price_list_item_id: item._id,
                          description: item.name,
                          quantity: 1,
                          unit: item.unit || "db",
                          net_unit_price: item.net_unit_price || 0,
                        },
                      ]);
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tallózás az árlistából..." />
                  </SelectTrigger>
                  <SelectContent>
                    {priceList.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name} ({p.net_unit_price} Ft)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border-subtle)]">
          <Input
            type="date"
            label="Munkaidőszak kezdete"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
          <Input
            type="date"
            label="Munkaidőszak vége"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </div>
        <Input
          label="Összesített órák (opcionális)"
          value={totalHours}
          onChange={(e) => setTotalHours(e.target.value)}
          inputMode="decimal"
        />
        {!isNew && (
          <>
            <div className="space-y-2">
              <Label>Státusz</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CompletionCertificateStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusLabel) as CompletionCertificateStatus[]).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel[s]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
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
          {saving ? "Mentés…" : isNew ? "Létrehozás" : "Mentés"}
        </Button>
      </Card>

      {/* Hidden PDF template */}
      {!isNew && doc && (
        <div style={{ display: "none" }}>
          <div ref={printRef}>
            <UnifiedPdfTemplate
              documentTitle="Teljesítési igazolás"
              documentId={doc.certificate_number}
              date={new Date()}
              provider={companyDetails}
              client={null}
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
                              width: "80px",
                              textAlign: "right",
                            }}
                          >
                            Mennyiség
                          </th>
                          <th
                            style={{
                              padding: "6px 8px",
                              borderBottom: "1px solid #e5e7eb",
                              width: "60px",
                            }}
                          >
                            Egység
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
                          </tr>
                        ))}
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
        </div>
      )}
    </div>
  );
}
