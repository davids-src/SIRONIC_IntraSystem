"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button } from "@crm/ui";

import {
  FileOutput,
  Plus,
  Eye,
  Search,
  Package,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { apiJson } from "@/lib/api-client";
import type { DeliveryNote, Contact } from "@crm/types";

function statusBadge(status: DeliveryNote["status"]) {
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

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("hu-HU").format(new Date(d as string));
}

interface DeliveryNoteWithContact extends Omit<
  DeliveryNote,
  "issue_date" | "created_at" | "updated_at"
> {
  issue_date: string;
  created_at: string;
  updated_at: string;
  contactName?: string;
}

export default function DeliveryNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<DeliveryNoteWithContact[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      apiJson<DeliveryNoteWithContact[]>("/api/delivery-notes", { signal: ac.signal }),
      apiJson<Contact[]>("/api/contacts", { signal: ac.signal }),
    ])
      .then(([ns, cs]) => {
        const map: Record<string, string> = {};
        cs.forEach((c) => {
          map[c._id] = c.name;
        });
        setContacts(map);
        setNotes(ns.map((n) => ({ ...n, contactName: map[n.contact_id] })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = notes.filter((n) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (
      n.delivery_number.toLowerCase().includes(lower) ||
      (n.contactName ?? "").toLowerCase().includes(lower) ||
      n.status.toLowerCase().includes(lower)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileOutput size={24} className="text-[var(--color-accent-primary)]" />
            Szállítólevelek
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Kiadott tételek dokumentálása partnerhez vagy projekthez kapcsolva.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push("/delivery-notes/new")}>
          <Plus size={16} className="mr-2" /> Új szállítólevél
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
            placeholder="Keresés száma, partner alapján…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">Betöltés…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] space-y-3">
            <Package size={40} className="mx-auto opacity-30" />
            <p className="text-sm">
              {q ? "Nincs találat a keresési feltételre." : "Még nincs szállítólevél."}
            </p>
            {!q && (
              <Button
                variant="primary"
                onClick={() => router.push("/delivery-notes/new")}
              >
                <Plus size={16} className="mr-2" /> Első szállítólevél létrehozása
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)]">
                <tr>
                  <th className="px-5 py-3">Sorszám</th>
                  <th className="px-5 py-3">Partner</th>
                  <th className="px-5 py-3">Kiadás dátuma</th>
                  <th className="px-5 py-3 text-center">Tételek</th>
                  <th className="px-5 py-3 text-center">Státusz</th>
                  <th className="px-5 py-3 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((note) => (
                  <tr
                    key={note._id}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                    onClick={() => router.push(`/delivery-notes/${note._id}`)}
                  >
                    <td className="px-5 py-4 font-mono font-medium text-[var(--color-accent-primary)]">
                      {note.delivery_number}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {note.contactName ?? (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-muted)]">
                      {fmtDate(note.issue_date)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-accent-badgeBg)] text-[var(--color-accent-primary)] text-xs font-bold">
                        {note.lines?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">{statusBadge(note.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/delivery-notes/${note._id}`);
                        }}
                      >
                        <Eye size={14} className="mr-1" /> Megnyitás
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
