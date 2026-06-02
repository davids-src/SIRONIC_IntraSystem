"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button } from "@crm/ui";
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
} from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type { Contact } from "@crm/types";

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
  const [note, setNote] = useState<DeliveryNoteDoc | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    apiJson<DeliveryNoteDoc>(`/api/delivery-notes/${id}`, { signal: ac.signal })
      .then((data) => {
        setNote(data);
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
        <div className="flex items-center gap-2">
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
    </div>
  );
}
