"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge } from "@crm/ui";
import {
  ShieldCheck,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { apiJson, ApiError } from "@/lib/api-client";
import type { WarrantyCard, CompanyDetails, Contact } from "@crm/types";

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

function buildPdfHtml(data: PdfData): string {
  const { warranty, contact, companyDetails: co, legalNotice } = data;

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

  const legalHtml = legalNotice
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "<br/>";
      if (/^\d+\./.test(trimmed))
        return `<h3 style="font-size:13px;font-weight:700;margin:14px 0 6px;color:#111827;">${trimmed}</h3>`;
      if (trimmed.startsWith("-"))
        return `<li style="font-size:12px;margin:3px 0 3px 18px;color:#374151;">${trimmed.slice(1).trim()}</li>`;
      return `<p style="font-size:12px;margin:4px 0;color:#374151;line-height:1.6;">${trimmed}</p>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"/>
<style>* { box-sizing:border-box;margin:0;padding:0; } body { font-family:Arial,sans-serif;background:#fff;color:#111827; }
.page { width:210mm;min-height:297mm;padding:18mm 16mm;page-break-after:always; }
.page:last-child { page-break-after:auto; }
table { width:100%;border-collapse:collapse; }
thead th { background:#f3f4f6;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;padding:10px 12px;text-align:left; }
</style></head><body>
<div class="page">
<div style="font-size:9px; color:#9ca3af; text-align:right; margin-bottom:10px; font-family:monospace;">
  Generálva: ${new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())} – Hiteles digitális másolat
</div>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1d4ed8;padding-bottom:16px;margin-bottom:24px;">
  <div>
    <div style="font-size:26px;font-weight:800;color:#1d4ed8;">SIROTECH</div>
    <div style="font-size:11px;color:#6b7280;">${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
    <div style="font-size:11px;color:#6b7280;">${co?.email ?? "hello@sironic.hu"}</div>
    <div style="font-size:11px;color:#6b7280;">Adószám: ${co?.tax_number ?? "33056151-2-07"}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:22px;font-weight:700;color:#111827;">JÓTÁLLÁSI JEGY</div>
    <div style="font-size:16px;font-weight:600;color:#1d4ed8;margin-top:4px;font-family:monospace;">${warranty.warranty_number}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:6px;">Kiállítva: ${fmtDate(warranty.issue_date)}</div>
    ${warranty.invoice_number ? `<div style="font-size:12px;color:#6b7280;">Számla: ${warranty.invoice_number}</div>` : ""}
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
  <div style="background:#f9fafb;border-radius:8px;padding:16px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:8px;">Kiállító</div>
    <div style="font-size:14px;font-weight:700;">${co?.name ?? "SIROTECH Kft."}</div>
    <div style="font-size:12px;color:#374151;">${co?.headquarters ?? "8000 Székesfehérvár, Lövölde utca 24 4/15"}</div>
    <div style="font-size:12px;color:#374151;">${co?.email ?? "hello@sironic.hu"}</div>
  </div>
  <div style="background:#eff6ff;border-radius:8px;padding:16px;border:1px solid #bfdbfe;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1d4ed8;margin-bottom:8px;">Jótállás Jogosultja</div>
    <div style="font-size:14px;font-weight:700;">${contact?.name ?? "—"}</div>
    ${contact?.address ? `<div style="font-size:12px;color:#374151;">${contact.address.zip} ${contact.address.city}, ${contact.address.street}</div>` : ""}
    ${contact?.email ? `<div style="font-size:12px;color:#374151;">${contact.email}</div>` : ""}
  </div>
</div>
<div style="margin-bottom:28px;">
  <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#374151;margin-bottom:10px;">Jótállással érintett termékek</div>
  <table style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <thead><tr>
      <th style="width:36px;">#</th><th>Termék neve</th><th>Gyártási szám</th>
      <th style="text-align:center;">Időtartam</th><th>Kezdete</th><th>Lejárat</th>
    </tr></thead>
    <tbody>${linesRows}</tbody>
  </table>
</div>
${warranty.notes ? `<div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:12px;margin-bottom:24px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#92400e;margin-bottom:4px;">Megjegyzés</div><div style="font-size:12px;color:#78350f;">${warranty.notes}</div></div>` : ""}
</div>
<div class="page">
  <div style="border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:18px;font-weight:700;color:#1d4ed8;">Jótállási Tájékoztató és Jogi Feltételek</div>
    <div style="font-size:11px;color:#9ca3af;font-family:monospace;">${warranty.warranty_number}</div>
  </div>
  <div style="line-height:1.7;">${legalHtml}</div>
</div>
</body></html>`;
}

// ─── Fő oldal komponens ───────────────────────────────────────────────────────

export default function PartnerWarrantiesPage() {
  const [warranties, setWarranties] = useState<WarrantyWithStrings[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    apiJson<WarrantyWithStrings[]>("/api/warranties", { signal: ac.signal })
      .then(setWarranties)
      .catch((e) => {
        if (!ac.signal.aborted)
          setLoadErr(
            e instanceof ApiError ? e.message : "Nem tölthetők be a jótállási jegyek.",
          );
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = warranties.filter((w) => {
    if (!search.trim()) return true;
    const lower = search.toLowerCase();
    return (
      w.warranty_number.toLowerCase().includes(lower) ||
      (w.invoice_number ?? "").toLowerCase().includes(lower) ||
      w.lines.some((l) => l.name.toLowerCase().includes(lower))
    );
  });

  const handleDownload = async (warranty: WarrantyWithStrings) => {
    setDownloadingId(warranty._id);
    try {
      const pdfData = await apiJson<PdfData>(`/api/warranties/${warranty._id}/pdf-data`);
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
      alert(e instanceof ApiError ? e.message : "PDF generálás sikertelen.");
    } finally {
      setDownloadingId(null);
    }
  };

  const counts = {
    total: warranties.length,
    active: warranties.filter((w) => w.status === "active").length,
    expired: warranties.filter(
      (w) => w.status === "expired" || w.status === "claimed" || w.status === "void",
    ).length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck size={24} style={{ color: "var(--color-accent-primary)" }} />
          Jótállási jegyek
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Az Önhöz kiállított jótállási jegyek és letöltési lehetőségek.
        </p>
      </div>

      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}

      {/* Statisztika kártyák */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Összes jótállás",
            count: counts.total,
            icon: <ShieldCheck size={20} />,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.08)",
          },
          {
            label: "Aktív",
            count: counts.active,
            icon: <CheckCircle size={20} />,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.08)",
          },
          {
            label: "Lejárt / Egyéb",
            count: counts.expired,
            icon: <Clock size={20} />,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-5 flex items-center gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: stat.bg, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stat.count}</div>
              <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kereső */}
      <div
        className="flex items-center gap-3 rounded-xl border p-4"
        style={{
          background: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            placeholder="Keresés sorszám, termék, számla alapján…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border"
            style={{
              background: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Táblázat */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {loading ? (
          <div
            className="p-12 text-center text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Betöltés…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldCheck
              size={40}
              className="mx-auto opacity-30"
              style={{ color: "var(--color-text-muted)" }}
            />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {search ? "Nincs találat." : "Önhöz jelenleg nem tartozik jótállási jegy."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead
                className="text-xs uppercase"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-muted)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                <tr>
                  <th className="px-5 py-3">Sorszám</th>
                  <th className="px-5 py-3">Számla sz.</th>
                  <th className="px-5 py-3">Tételek</th>
                  <th className="px-5 py-3">Kiállítva</th>
                  <th className="px-5 py-3">Legkorábbi lejárat</th>
                  <th className="px-5 py-3 text-center">Státusz</th>
                  <th className="px-5 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const earliestEnd = w.lines.length
                    ? [...w.lines].sort(
                        (a, b) =>
                          new Date(a.warranty_end).getTime() -
                          new Date(b.warranty_end).getTime(),
                      )[0]?.warranty_end
                    : null;

                  return (
                    <tr
                      key={w._id}
                      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    >
                      <td
                        className="px-5 py-4 font-mono font-medium"
                        style={{ color: "var(--color-accent-primary)" }}
                      >
                        {w.warranty_number}
                      </td>
                      <td
                        className="px-5 py-4"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {w.invoice_number ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          {w.lines.slice(0, 2).map((l, i) => (
                            <div
                              key={i}
                              className="text-xs"
                              style={{ color: "var(--color-text-secondary)" }}
                            >
                              {l.name}
                            </div>
                          ))}
                          {w.lines.length > 2 && (
                            <div
                              className="text-xs"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              +{w.lines.length - 2} további…
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-5 py-4"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {fmtDate(w.issue_date)}
                      </td>
                      <td
                        className="px-5 py-4"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {fmtDate(earliestEnd)}
                      </td>
                      <td className="px-5 py-4 text-center">{statusBadge(w.status)}</td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDownload(w)}
                          disabled={downloadingId === w._id}
                        >
                          <Download size={14} className="mr-1" />
                          {downloadingId === w._id ? "…" : "Letöltés"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
