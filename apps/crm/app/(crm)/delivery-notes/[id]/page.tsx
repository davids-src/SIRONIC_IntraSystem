"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, UnifiedPdfTemplate } from "@crm/ui";
import {
  ChevronLeft,
  FileOutput,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Calendar,
  FileText,
  Download,
  Mail,
  Loader2,
} from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type { Contact, Settings } from "@crm/types";

interface DeliveryNoteLine {
  price_list_item_id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface DeliveryNoteDoc {
  _id: string;
  delivery_number: string;
  contact_id: string;
  project_id: string | null;
  status: "draft" | "issued" | "cancelled";
  issue_date: string;
  lines: DeliveryNoteLine[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function statusBadge(status: DeliveryNoteDoc["status"]) {
  switch (status) {
    case "issued":
      return (
        <Badge variant="success">
          <CheckCircle size={10} className="mr-1" /> Kiadva
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="error">
          <XCircle size={10} className="mr-1" /> Stornó
        </Badge>
      );
    default:
      return (
        <Badge variant="warning">
          <Clock size={10} className="mr-1" /> Piszkozat
        </Badge>
      );
  }
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("hu-HU").format(new Date(d));
}

export default function DeliveryNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [note, setNote] = useState<DeliveryNoteDoc | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [companyDetails, setCompanyDetails] = useState<
    Settings["company_details"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      apiJson<DeliveryNoteDoc>(`/api/delivery-notes/${id}`, { signal: ac.signal }),
      apiJson<Settings>("/api/settings", { signal: ac.signal }),
    ])
      .then(([data, settings]) => {
        setNote(data);
        setCompanyDetails(settings.company_details ?? null);
        return apiJson<Contact>(`/api/contacts/${data.contact_id}`, {
          signal: ac.signal,
        });
      })
      .then((c) => setContact(c))
      .catch(() => setError("Nem sikerült betölteni a szállítólevelet."))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [id]);

  const changeStatus = async (status: "issued" | "cancelled") => {
    if (!note) return;
    const msg =
      status === "issued"
        ? "Biztosan ki akarod adni a szállítólevelet? A készlet levonásra kerül."
        : "Biztosan sztornózni akarod? A készlet visszakerül.";
    if (!confirm(msg)) return;
    setActing(true);
    setError(null);
    try {
      const updated = await apiJsonBody<DeliveryNoteDoc>(
        `/api/delivery-notes/${id}`,
        "PATCH",
        { status, _prevStatus: note.status },
      );
      setNote(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Státuszváltás sikertelen.");
    } finally {
      setActing(false);
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
        filename: `Szallitolevel_${note?.delivery_number ?? id}.pdf`,
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
      console.error("PDF hiba:", e);
      alert("Hiba történt a PDF generálása során.");
    } finally {
      element.style.display = "none";
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!note) return;
    setSendingEmail(true);
    setEmailSuccess(false);
    setError(null);
    try {
      await apiJsonBody(`/api/delivery-notes/${id}/send-email`, "POST", {});
      setEmailSuccess(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Hiba az e-mail küldése során.");
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[var(--color-text-muted)]">Betöltés…</div>
    );
  }

  if (error && !note) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="text-[var(--color-status-error)]">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/delivery-notes")}>
          Vissza
        </Button>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" onClick={() => router.push("/delivery-notes")}>
            <ChevronLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
                {note.delivery_number}
              </h1>
              {statusBadge(note.status)}
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
              <Calendar size={13} />
              {fmtDate(note.issue_date)}
              {note.project_id && (
                <>
                  <span>•</span>
                  <FileText size={13} />
                  <span className="font-mono text-xs">{note.project_id}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PDF download */}
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
            {generatingPdf ? "PDF…" : "PDF letöltés"}
          </Button>

          {/* Send email */}
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
            {sendingEmail ? "Küldés…" : "E-mail küldés"}
          </Button>

          {note.status === "draft" && (
            <Button
              variant="primary"
              onClick={() => void changeStatus("issued")}
              disabled={acting}
            >
              <FileOutput size={15} className="mr-1.5" />
              {acting ? "Feldolgozás…" : "Kiadás & Készletlevonás"}
            </Button>
          )}
          {note.status === "issued" && (
            <Button
              variant="secondary"
              onClick={() => void changeStatus("cancelled")}
              disabled={acting}
              className="text-[var(--color-status-error)] border-[var(--color-status-error)]/30 hover:bg-[var(--color-status-error)]/10"
            >
              <XCircle size={15} className="mr-1.5" />
              {acting ? "Feldolgozás…" : "Sztornózás (visszavétel)"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-4 py-2">
          {error}
        </p>
      )}
      {emailSuccess && (
        <div className="bg-green-950/30 text-green-400 p-4 rounded-lg border border-green-900/50">
          E-mail sikeresen elküldve a partnernek.
        </div>
      )}

      {/* Partner info */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent-badgeBg)] flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-[var(--color-accent-primary)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
              Partner
            </p>
            <p className="font-semibold text-[var(--color-text-primary)]">
              {contact?.name ?? note.contact_id}
            </p>
            {contact?.address && (
              <p className="text-xs text-[var(--color-text-muted)]">
                {[contact.address.zip, contact.address.city, contact.address.street]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Lines table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
          <Package size={16} className="text-[var(--color-accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Kiadott tételek
          </h2>
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            {note.lines.length} sor
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-5 py-3 text-left">Termék</th>
                <th className="px-5 py-3 text-right">Mennyiség</th>
                <th className="px-5 py-3 text-left">Me.</th>
              </tr>
            </thead>
            <tbody>
              {note.lines.map((line, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--color-border-subtle)] last:border-0"
                >
                  <td className="px-5 py-3 font-medium">{line.name}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold">
                    {line.quantity}
                  </td>
                  <td className="px-5 py-3 text-[var(--color-text-muted)]">
                    {line.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {note.notes && (
          <div className="px-5 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold">Megjegyzés: </span>
              {note.notes}
            </p>
          </div>
        )}
      </Card>

      {/* Hidden PDF template */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <UnifiedPdfTemplate
            documentTitle="Szállítólevél"
            documentId={note.delivery_number}
            date={new Date(note.issue_date)}
            provider={companyDetails}
            client={contact}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                marginTop: "8px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderBottom: "2px solid #e5e7eb",
                  }}
                >
                  <th style={{ padding: "8px", textAlign: "left" }}>Termék</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Mennyiség</th>
                  <th style={{ padding: "8px", textAlign: "left" }}>Me.</th>
                </tr>
              </thead>
              <tbody>
                {note.lines.map((line, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "7px 8px", fontWeight: 600 }}>{line.name}</td>
                    <td style={{ padding: "7px 8px", textAlign: "center" }}>
                      {line.quantity}
                    </td>
                    <td style={{ padding: "7px 8px" }}>{line.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {note.notes && (
              <div style={{ marginTop: "16px", fontSize: "12px", color: "#6b7280" }}>
                <strong>Megjegyzés:</strong> {note.notes}
              </div>
            )}
          </UnifiedPdfTemplate>
        </div>
      </div>
    </div>
  );
}
