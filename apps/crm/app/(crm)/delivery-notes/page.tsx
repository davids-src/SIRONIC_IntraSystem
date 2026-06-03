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
  Archive,
  RotateCcw,
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
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<DeliveryNoteWithContact | null>(
    null,
  );
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [ns, cs] = await Promise.all([
        apiJson<DeliveryNoteWithContact[]>(
          `/api/delivery-notes?include_archived=${includeArchived}`,
        ),
        apiJson<Contact[]>("/api/contacts"),
      ]);
      const map: Record<string, string> = {};
      cs.forEach((c) => {
        map[c._id] = c.name;
      });
      setContacts(map);
      setNotes(ns.map((n) => ({ ...n, contactName: map[n.contact_id] })));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [includeArchived]);

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTarget) return;
    const res = await fetch(`/api/delivery-notes/${archiveTarget._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_archived: true,
        archived_at: new Date(),
        archive_reason: archiveReason.trim(),
      }),
    });
    if (res.ok) {
      setArchiveTarget(null);
      setArchiveReason("");
      loadData();
    } else alert("Sikertelen archiválás.");
  };

  const handleRestore = async (id: string) => {
    if (!confirm("Vissza szeretnéd állítani ezt a szállítólevelet?")) return;
    const res = await fetch(`/api/delivery-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_archived: false,
        archived_at: null,
        archive_reason: null,
      }),
    });
    if (res.ok) loadData();
    else alert("Sikertelen visszaállítás.");
  };

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
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative max-w-sm flex-1">
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="dn-include-archived"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{
                width: "16px",
                height: "16px",
                cursor: "pointer",
                accentColor: "var(--color-accent-primary)",
              }}
            />
            <label
              htmlFor="dn-include-archived"
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Archivált elemek megjelenítése
            </label>
          </div>
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
                    <td
                      className="px-5 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/delivery-notes/${note._id}`)}
                        >
                          <Eye size={14} className="mr-1" /> Megnyitás
                        </Button>
                        {note.is_archived ? (
                          <button
                            onClick={() => handleRestore(note._id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-text-secondary)",
                              padding: "4px",
                              borderRadius: "6px",
                            }}
                            title="Visszaállítás"
                          >
                            <RotateCcw size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setArchiveTarget(note);
                              setArchiveReason("");
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-status-error, #f87171)",
                              padding: "4px",
                              borderRadius: "6px",
                            }}
                            title="Archiválás"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {archiveTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setArchiveTarget(null)}
        >
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              width: "100%",
              maxWidth: "450px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 12px 0", color: "#fff" }}>
              Szállítólevél archiválása
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
              }}
            >
              Biztosan archiválni szeretnéd:{" "}
              <strong>{archiveTarget.delivery_number}</strong>?<br />
              Kérjük, add meg az archiválás indokát.
            </p>
            <form
              onSubmit={handleArchive}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                  Archiválás oka *
                </label>
                <input
                  className="w-full px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md text-[var(--color-text-primary)] focus:outline-none"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Pl. Sztornózva, duplikátum..."
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setArchiveTarget(null)}
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{
                    backgroundColor: "var(--color-status-error, #f87171)",
                    borderColor: "var(--color-status-error, #f87171)",
                  }}
                >
                  Archiválás
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
