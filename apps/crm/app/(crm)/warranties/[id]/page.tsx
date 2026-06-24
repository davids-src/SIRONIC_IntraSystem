"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge } from "@crm/ui";
import {
  ChevronLeft,
  ShieldCheck,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type { WarrantyCard, Contact, CompanyDetails } from "@crm/types";

// ─── Típusok ──────────────────────────────────────────────────────────────────

interface WarrantyLine {
  name: string;
  serial_number: string | null;
  warranty_years: number;
  warranty_start: string;
  warranty_end: string;
  price_list_item_id: string | null;
}

interface WarrantyWithStrings extends Omit<
  WarrantyCard,
  "lines" | "issue_date" | "created_at" | "updated_at"
> {
  lines: WarrantyLine[];
  issue_date: string;
  created_at: string;
  updated_at: string;
}

interface PdfData {
  warranty: WarrantyWithStrings;
  contact: Contact | null;
  companyDetails: CompanyDetails | null;
  legalNotice: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("hu-HU").format(new Date(d));
  } catch {
    return d;
  }
}

function statusBadge(status: WarrantyCard["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge variant="success">
          <CheckCircle size={10} className="mr-1" /> Aktív
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="error">
          <Clock size={10} className="mr-1" /> Lejárt
        </Badge>
      );
    case "claimed":
      return (
        <Badge variant="warning">
          <AlertTriangle size={10} className="mr-1" /> Érvényesítve
        </Badge>
      );
    case "void":
      return (
        <Badge variant="error">
          <XCircle size={10} className="mr-1" /> Érvénytelen
        </Badge>
      );
  }
}

// ─── PDF sablon (2 oldal, inline HTML) ───────────────────────────────────────

function buildPdfHtml(data: PdfData): string {
  const { warranty, contact, companyDetails, legalNotice } = data;
  const co = companyDetails;

  const linesRows = warranty.lines
    .map(
      (l, i) => `
    <tr>
      <td style="text-align: center; font-weight: 600; color: #94a3b8;">${i + 1}.</td>
      <td style="font-weight: 600; color: #0f172a;">${l.name}</td>
      <td><span class="serial-number">${l.serial_number ?? "—"}</span></td>
      <td style="text-align: center;"><span class="years-badge">${l.warranty_years} év</span></td>
      <td style="color: #475569;">${fmtDate(l.warranty_start)}</td>
      <td style="font-weight: 700; color: #2563eb;">${fmtDate(l.warranty_end)}</td>
    </tr>`,
    )
    .join("");

  // Parse legal text
  const legalHtml = legalNotice
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^\d+\./.test(trimmed)) {
        return `<h3>${trimmed}</h3>`;
      }
      if (trimmed.startsWith("-")) {
        return `<li>${trimmed.slice(1).trim()}</li>`;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #ffffff; color: #1e293b; -webkit-font-smoothing: antialiased; }
    .page { width: 210mm; min-height: 297mm; padding: 20mm; page-break-after: always; position: relative; }
    .page:last-child { page-break-after: auto; }
    
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; margin-bottom: 32px; }
    .brand-title { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.03em; line-height: 1; }
    .brand-subtitle { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.08em; }
    .brand-info { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    
    .doc-title-container { text-align: right; }
    .doc-title { font-size: 26px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1; }
    .doc-number { font-size: 14px; font-weight: 700; color: #334155; margin-top: 8px; background: #f8fafc; padding: 6px 12px; border-radius: 8px; display: inline-block; border: 1px solid #e2e8f0; }
    
    /* Dates */
    .dates-container { display: flex; justify-content: flex-end; gap: 20px; margin-top: 12px; }
    .date-block { text-align: right; }
    .date-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .date-value { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px; }

    /* Entities Section */
    .entities { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 24px; }
    .entity-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .entity-box.beneficiary { background: #f0fdf4; border-color: #bbf7d0; box-shadow: 0 4px 20px rgba(34,197,94,0.05); }
    .entity-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; }
    .entity-box.beneficiary .entity-label { color: #16a34a; }
    .entity-name { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .entity-detail { font-size: 12px; color: #475569; line-height: 1.6; }
    
    /* Table */
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .table-wrapper { border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f8fafc; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; padding: 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    tbody td { padding: 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background-color: #fafaf9; }
    .serial-number { font-family: monospace; font-size: 12px; color: #475569; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .years-badge { background: #eff6ff; color: #2563eb; font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 20px; display: inline-block; border: 1px solid #bfdbfe; }
    
    /* Notes */
    .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin-bottom: 32px; border-left: 4px solid #f59e0b; }
    .notes-label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #b45309; margin-bottom: 8px; letter-spacing: 0.05em; }
    .notes-content { font-size: 13px; color: #92400e; line-height: 1.6; font-style: italic; }
    
    /* Signatures */
    .signatures { display: flex; justify-content: space-between; margin-top: 70px; padding: 0 30px; }
    .signature-block { width: 35%; text-align: center; }
    .signature-line { border-top: 1px dashed #94a3b8; margin-bottom: 10px; padding-top: 10px; }
    .signature-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
    .signature-name { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 6px; }
    
    /* Footer */
    .footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
    .footer-text { font-size: 10px; color: #94a3b8; font-weight: 500; }
    .timestamp { font-family: monospace; font-size: 9px; color: #cbd5e1; }
    
    /* Legal text page */
    .legal-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9; margin-bottom: 30px; }
    .legal-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .legal-content h3 { font-size: 14px; font-weight: 800; color: #0f172a; margin: 24px 0 10px; }
    .legal-content p { font-size: 12px; color: #475569; line-height: 1.8; margin-bottom: 12px; text-align: justify; }
    .legal-content li { font-size: 12px; color: #475569; line-height: 1.8; margin-left: 24px; margin-bottom: 8px; }
  </style>
</head>
<body>

<!-- ══════════════ OLDAL 1: JÓTÁLLÁSI JEGY ══════════════ -->
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-title">SIROTECH</div>
      <div class="brand-subtitle">Biztonságtechnika & IT</div>
      <div class="brand-info" style="margin-top: 12px;">${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
      <div class="brand-info">${co?.email ?? "hello@sironic.hu"} ${co?.phone ? "• " + co.phone : ""}</div>
      <div class="brand-info">Adószám: ${co?.tax_number ?? "33056151-2-07"}</div>
    </div>
    <div class="doc-title-container">
      <div class="doc-title">Jótállási Jegy</div>
      <div class="doc-number">${warranty.warranty_number}</div>
      <div class="dates-container">
        <div class="date-block">
          <div class="date-label">Kiállítva</div>
          <div class="date-value">${fmtDate(warranty.issue_date)}</div>
        </div>
        ${
          warranty.invoice_number
            ? `
        <div class="date-block">
          <div class="date-label">Számlaszám</div>
          <div class="date-value">${warranty.invoice_number}</div>
        </div>`
            : ""
        }
      </div>
    </div>
  </div>

  <!-- Kiállító / Partner adatok -->
  <div class="entities">
    <div class="entity-box">
      <div class="entity-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        Kiállító (Szolgáltató)
      </div>
      <div class="entity-name">${co?.name ?? "SIROTECH Kft."}</div>
      <div class="entity-detail">${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
      <div class="entity-detail">${co?.email ?? "hello@sironic.hu"}</div>
    </div>
    <div class="entity-box beneficiary">
      <div class="entity-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Jótállás Jogosultja (Ügyfél)
      </div>
      <div class="entity-name">${contact?.name ?? "—"}</div>
      ${contact?.address ? `<div class="entity-detail">${contact.address.zip} ${contact.address.city}, ${contact.address.street}</div>` : ""}
      ${contact?.email ? `<div class="entity-detail">${contact.email}</div>` : ""}
      ${contact?.phone ? `<div class="entity-detail">${contact.phone}</div>` : ""}
    </div>
  </div>

  <!-- Tételek táblázat -->
  <div class="section-title">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
    Jótállással érintett termékek és eszközök
  </div>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th style="width: 50px; text-align: center;">#</th>
          <th>Termék megnevezése</th>
          <th>Gyári / Sorozatszám</th>
          <th style="text-align: center;">Időtartam</th>
          <th>Kezdete</th>
          <th>Lejárata</th>
        </tr>
      </thead>
      <tbody>${linesRows}</tbody>
    </table>
  </div>

  ${
    warranty.notes
      ? `
  <div class="notes-box">
    <div class="notes-label">Kiegészítő Megjegyzés</div>
    <div class="notes-content">${warranty.notes}</div>
  </div>`
      : ""
  }

  <!-- Lábléc aláírás -->
  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-title">Kiállító hivatalos aláírása</div>
      <div class="signature-name">${co?.name ?? "SIROTECH Kft."}</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-title">Átvevő / Ügyfél aláírása</div>
      <div class="signature-name">&nbsp;</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="timestamp">HIT-DIGITAL-COPY-ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()} • ${new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date())}</div>
    <div class="footer-text">A jótállási jegy 2. oldala a vonatkozó jogszabályi tájékoztatót tartalmazza.</div>
  </div>
</div>

<!-- ══════════════ OLDAL 2: JOGI TÁJÉKOZTATÓ ══════════════ -->
<div class="page">
  <div class="legal-header">
    <div class="legal-title">Jótállási Tájékoztató és Jogi Feltételek</div>
    <div class="doc-number" style="margin-top:0;">${warranty.warranty_number}</div>
  </div>
  <div class="legal-content">${legalHtml}</div>
  
  <div class="footer">
    <div class="footer-text">${co?.name ?? "SIROTECH Kft."} • ${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
    <div class="footer-text">2. oldal / 2</div>
  </div>
</div>

</body>
</html>`;
}

// ─── Fő oldal komponens ───────────────────────────────────────────────────────

export default function WarrantyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [warranty, setWarranty] = useState<WarrantyWithStrings | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    apiJson<WarrantyWithStrings>(`/api/warranties/${id}`, { signal: ac.signal })
      .then((w) => {
        setWarranty(w);
        // Töltsük be a partner adatokat is
        return apiJson<Contact[]>("/api/contacts", { signal: ac.signal });
      })
      .then((cs) => {
        const found = warranty?.contact_id
          ? cs.find((c) => c._id === warranty.contact_id)
          : null;
        setContact(found ?? null);
      })
      .catch((e) => {
        if (!ac.signal.aborted)
          setError(e instanceof ApiError ? e.message : "Nem tölthető be.");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Külön töltés a kontakt miatt (warranty state-függőség elkerülése)
  useEffect(() => {
    if (!warranty?.contact_id) return;
    apiJson<Contact[]>("/api/contacts")
      .then((cs) => {
        const found = cs.find((c) => c._id === warranty.contact_id);
        setContact(found ?? null);
      })
      .catch(() => {});
  }, [warranty?.contact_id]);

  const handleDownloadPdf = async () => {
    if (!warranty) return;
    setGeneratingPdf(true);
    try {
      const pdfData = await apiJson<PdfData>(`/api/warranties/${id}/pdf-data`);
      const html = buildPdfHtml(pdfData);

      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .from(html)
        .set({
          margin: 0,
          filename: `Jótállási_jegy_${warranty.warranty_number}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "PDF generálás sikertelen.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleStatusChange = async (newStatus: WarrantyCard["status"]) => {
    if (!warranty) return;
    if (!confirm(`Biztosan "${newStatus}" státuszra állítod a jótállási jegyet?`)) return;
    setUpdatingStatus(true);
    try {
      const updated = await apiJsonBody<WarrantyWithStrings>(
        `/api/warranties/${id}`,
        "PATCH",
        { status: newStatus },
      );
      setWarranty(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Státusz frissítés sikertelen.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const inputCls = "text-sm text-[var(--color-text-primary)]";

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--color-text-muted)]">Betöltés…</div>
    );
  }

  if (!warranty) {
    return (
      <div className="p-12 text-center text-[var(--color-text-muted)]">
        {error ?? "A jótállási jegy nem található."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push("/warranties")}>
            <ChevronLeft size={16} className="mr-1" /> Vissza
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <ShieldCheck size={22} className="text-[var(--color-accent-primary)]" />
              {warranty.warranty_number}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5 flex items-center gap-2">
              {statusBadge(warranty.status)}
              <span>Kiállítva: {fmtDate(warranty.issue_date)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {warranty.status === "active" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleStatusChange("claimed")}
                disabled={updatingStatus}
              >
                Érvényesítve jelölés
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleStatusChange("void")}
                disabled={updatingStatus}
              >
                Érvénytelenítés
              </Button>
            </>
          )}
          <Button
            variant="primary"
            onClick={() => void handleDownloadPdf()}
            disabled={generatingPdf}
          >
            <Download size={15} className="mr-1.5" />
            {generatingPdf ? "Generálás…" : "PDF letöltése"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-4 py-2">
          {error}
        </p>
      )}

      {/* Alapadatok */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2 mb-4">
          Alapadatok
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Partner</p>
            <p className={`${inputCls} font-semibold`}>
              {contact?.name ?? warranty.contact_id}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">
              Számla sorszáma
            </p>
            <p className={inputCls}>{warranty.invoice_number ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">
              Kiállítás dátuma
            </p>
            <p className={inputCls}>{fmtDate(warranty.issue_date)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Létrehozta</p>
            <p className={inputCls}>{warranty.created_by}</p>
          </div>
          {warranty.notes && (
            <div className="col-span-2">
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Megjegyzés</p>
              <p className={inputCls}>{warranty.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Tételek */}
      <Card className="p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Jótállási tételek
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
              <tr>
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Termék neve</th>
                <th className="px-5 py-3">Gyártási szám</th>
                <th className="px-5 py-3 text-center">Jótállás (év)</th>
                <th className="px-5 py-3">Kezdete</th>
                <th className="px-5 py-3">Lejárat</th>
              </tr>
            </thead>
            <tbody>
              {warranty.lines.map((line, idx) => {
                const isExpired = line.warranty_end
                  ? new Date(line.warranty_end) < new Date()
                  : false;
                return (
                  <tr
                    key={idx}
                    className="border-b border-[var(--color-border-subtle)] last:border-0"
                  >
                    <td className="px-5 py-4 text-[var(--color-text-muted)]">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-4 font-medium">{line.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[var(--color-text-muted)]">
                      {line.serial_number ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-accent-badgeBg)] text-[var(--color-accent-primary)] text-xs font-bold">
                        {line.warranty_years}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-muted)]">
                      {fmtDate(line.warranty_start)}
                    </td>
                    <td
                      className={`px-5 py-4 font-semibold ${
                        isExpired
                          ? "text-[var(--color-status-error)]"
                          : "text-[var(--color-accent-primary)]"
                      }`}
                    >
                      {fmtDate(line.warranty_end)}
                      {isExpired && (
                        <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">
                          (lejárt)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PDF tájékoztató */}
      <Card className="p-4 flex items-center gap-3">
        <FileText size={18} className="text-[var(--color-accent-primary)] shrink-0" />
        <p className="text-sm text-[var(--color-text-muted)]">
          A generált PDF 2 oldalas: az első oldal a jótállási jegyet, a második oldal a
          jogszabályi tájékoztatót tartalmazza. A jogi szöveg a{" "}
          <button
            className="text-[var(--color-accent-primary)] underline"
            onClick={() => router.push("/settings")}
          >
            Beállítások
          </button>{" "}
          oldalon szerkeszthető.
        </p>
      </Card>

      {/* Rejtett print div */}
      <div ref={printRef} style={{ display: "none" }} />
    </div>
  );
}
