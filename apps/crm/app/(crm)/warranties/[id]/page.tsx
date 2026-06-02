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
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:10px 12px;font-size:13px;">${i + 1}.</td>
      <td style="padding:10px 12px;font-size:13px;font-weight:600;">${l.name}</td>
      <td style="padding:10px 12px;font-size:13px;font-family:monospace;">${l.serial_number ?? "—"}</td>
      <td style="padding:10px 12px;font-size:13px;text-align:center;">${l.warranty_years} év</td>
      <td style="padding:10px 12px;font-size:13px;">${fmtDate(l.warranty_start)}</td>
      <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#1d4ed8;">${fmtDate(l.warranty_end)}</td>
    </tr>`,
    )
    .join("");

  // Jogi szöveg sorai (sortörések kezelése)
  const legalHtml = legalNotice
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<br/>";
      if (/^\d+\./.test(trimmed)) {
        return `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px;color:#111827;">${trimmed}</h3>`;
      }
      if (trimmed.startsWith("-")) {
        return `<li style="font-size:12px;margin:3px 0 3px 18px;color:#374151;">${trimmed.slice(1).trim()}</li>`;
      }
      return `<p style="font-size:12px;margin:4px 0;color:#374151;line-height:1.6;">${trimmed}</p>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111827; }
    .page { width: 210mm; min-height: 297mm; padding: 18mm 16mm; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #f3f4f6; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; padding:10px 12px; text-align:left; }
  </style>
</head>
<body>

<!-- ══════════════ OLDAL 1: JÓTÁLLÁSI JEGY ══════════════ -->
<div class="page">
  <div style="font-size:9px; color:#9ca3af; text-align:right; margin-bottom:10px; font-family:monospace;">
    Generálva: ${new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())} – Hiteles digitális másolat
  </div>
  <!-- Fejléc -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:16px;margin-bottom:24px;">
    <div>
      <div style="font-size:26px;font-weight:800;color:#1d4ed8;letter-spacing:-0.5px;">SIROTECH</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
      <div style="font-size:11px;color:#6b7280;">${co?.email ?? "hello@sironic.hu"} ${co?.phone ? "| " + co.phone : ""}</div>
      <div style="font-size:11px;color:#6b7280;">Adószám: ${co?.tax_number ?? "33056151-2-07"}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:700;color:#111827;">JÓTÁLLÁSI JEGY</div>
      <div style="font-size:16px;font-weight:600;color:#1d4ed8;margin-top:4px;font-family:monospace;">${warranty.warranty_number}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:6px;">Kiállítva: ${fmtDate(warranty.issue_date)}</div>
      ${warranty.invoice_number ? `<div style="font-size:12px;color:#6b7280;">Számla: ${warranty.invoice_number}</div>` : ""}
    </div>
  </div>

  <!-- Kiállító / Partner adatok -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
    <div style="background:#f9fafb;border-radius:8px;padding:16px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:8px;">Kiállító</div>
      <div style="font-size:14px;font-weight:700;">${co?.name ?? "SIROTECH Kft."}</div>
      <div style="font-size:12px;color:#374151;margin-top:2px;">${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
      <div style="font-size:12px;color:#374151;">${co?.email ?? "hello@sironic.hu"}</div>
    </div>
    <div style="background:#eff6ff;border-radius:8px;padding:16px;border:1px solid #bfdbfe;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1d4ed8;margin-bottom:8px;">Jótállás Jogosultja</div>
      <div style="font-size:14px;font-weight:700;">${contact?.name ?? "—"}</div>
      ${contact?.address ? `<div style="font-size:12px;color:#374151;margin-top:2px;">${contact.address.zip} ${contact.address.city}, ${contact.address.street}</div>` : ""}
      ${contact?.email ? `<div style="font-size:12px;color:#374151;">${contact.email}</div>` : ""}
      ${contact?.phone ? `<div style="font-size:12px;color:#374151;">${contact.phone}</div>` : ""}
    </div>
  </div>

  <!-- Tételek táblázat -->
  <div style="margin-bottom:28px;">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151;margin-bottom:10px;">Jótállással érintett termékek</div>
    <table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <thead>
        <tr>
          <th style="width:36px;">#</th>
          <th>Termék neve</th>
          <th>Gyártási szám</th>
          <th style="text-align:center;">Időtartam</th>
          <th>Jótállás kezdete</th>
          <th>Lejárat</th>
        </tr>
      </thead>
      <tbody>${linesRows}</tbody>
    </table>
  </div>

  ${
    warranty.notes
      ? `
  <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:12px;margin-bottom:24px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#92400e;margin-bottom:4px;">Megjegyzés</div>
    <div style="font-size:12px;color:#78350f;">${warranty.notes}</div>
  </div>`
      : ""
  }

  <!-- Lábléc aláírás -->
  <div style="position:absolute;bottom:18mm;left:16mm;right:16mm;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;">
      <div style="border-top:1px solid #9ca3af;padding-top:8px;">
        <div style="font-size:11px;color:#6b7280;">Kiállító aláírása, bélyegzője</div>
        <div style="font-size:12px;margin-top:4px;">${co?.name ?? "SIROTECH Kft."}</div>
      </div>
      <div style="border-top:1px solid #9ca3af;padding-top:8px;">
        <div style="font-size:11px;color:#6b7280;">Átvevő aláírása</div>
        <div style="font-size:12px;margin-top:4px;">&nbsp;</div>
      </div>
    </div>
    <div style="font-size:10px;color:#9ca3af;text-align:center;margin-top:16px;">
      A jótállási jegy 2. oldala a vonatkozó jogszabályi tájékoztatót tartalmazza.
    </div>
  </div>

</div>

<!-- ══════════════ OLDAL 2: JOGI TÁJÉKOZTATÓ ══════════════ -->
<div class="page">
  <div style="border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:18px;font-weight:700;color:#1d4ed8;">Jótállási Tájékoztató és Jogi Feltételek</div>
    <div style="font-size:11px;color:#9ca3af;font-family:monospace;">${warranty.warranty_number}</div>
  </div>
  <div style="line-height:1.7;">${legalHtml}</div>
  <div style="position:absolute;bottom:18mm;left:16mm;right:16mm;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:10px;color:#9ca3af;">${co?.name ?? "SIROTECH Kft."} | ${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
    <div style="font-size:10px;color:#9ca3af;">2. oldal / 2</div>
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
