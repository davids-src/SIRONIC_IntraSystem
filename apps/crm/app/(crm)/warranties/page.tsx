"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button } from "@crm/ui";
import {
  ShieldCheck,
  Plus,
  Eye,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { apiJson } from "@/lib/api-client";
import type { WarrantyCard, Contact } from "@crm/types";

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

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("hu-HU").format(new Date(d as string));
}

interface WarrantyWithContact extends Omit<
  WarrantyCard,
  "issue_date" | "created_at" | "updated_at" | "lines"
> {
  issue_date: string;
  created_at: string;
  updated_at: string;
  lines: Array<{
    name: string;
    warranty_start: string;
    warranty_end: string;
    warranty_years: number;
    serial_number: string | null;
    price_list_item_id: string | null;
  }>;
  contactName?: string;
}

export default function WarrantiesPage() {
  const router = useRouter();
  const [warranties, setWarranties] = useState<WarrantyWithContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      apiJson<WarrantyWithContact[]>("/api/warranties", { signal: ac.signal }),
      apiJson<Contact[]>("/api/contacts", { signal: ac.signal }),
    ])
      .then(([ws, cs]) => {
        const map: Record<string, string> = {};
        cs.forEach((c) => {
          map[c._id] = c.name;
        });
        setWarranties(ws.map((w) => ({ ...w, contactName: map[w.contact_id] })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = warranties.filter((w) => {
    if (statusFilter && w.status !== statusFilter) return false;
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (
      w.warranty_number.toLowerCase().includes(lower) ||
      (w.contactName ?? "").toLowerCase().includes(lower) ||
      (w.invoice_number ?? "").toLowerCase().includes(lower)
    );
  });

  // Első lejárati dátum a sorban
  const earliestExpiry = (w: WarrantyWithContact): string | null => {
    if (!w.lines || w.lines.length === 0) return null;
    const sorted = [...w.lines].sort(
      (a, b) => new Date(a.warranty_end).getTime() - new Date(b.warranty_end).getTime(),
    );
    return sorted[0]?.warranty_end ?? null;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldCheck size={24} className="text-[var(--color-accent-primary)]" />
            Jótállási jegyek
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Kiadott jótállási jegyek kezelése, PDF generálás és letöltés.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push("/warranties/new")}>
          <Plus size={16} className="mr-2" /> Új jótállási jegy
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
              placeholder="Keresés sorszám, partner, számla alapján…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-[var(--color-text-primary)]"
          >
            <option value="">Minden státusz</option>
            <option value="active">Aktív</option>
            <option value="expired">Lejárt</option>
            <option value="claimed">Érvényesítve</option>
            <option value="void">Érvénytelen</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">Betöltés…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)] space-y-3">
            <ShieldCheck size={40} className="mx-auto opacity-30" />
            <p className="text-sm">
              {q || statusFilter
                ? "Nincs találat a keresési feltételre."
                : "Még nincs jótállási jegy."}
            </p>
            {!q && !statusFilter && (
              <Button variant="primary" onClick={() => router.push("/warranties/new")}>
                <Plus size={16} className="mr-2" /> Első jótállási jegy létrehozása
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
                  <th className="px-5 py-3">Számla sz.</th>
                  <th className="px-5 py-3">Kiállítva</th>
                  <th className="px-5 py-3">Tételek</th>
                  <th className="px-5 py-3">Legkorábbi lejárat</th>
                  <th className="px-5 py-3 text-center">Státusz</th>
                  <th className="px-5 py-3 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr
                    key={w._id}
                    className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                    onClick={() => router.push(`/warranties/${w._id}`)}
                  >
                    <td className="px-5 py-4 font-mono font-medium text-[var(--color-accent-primary)]">
                      {w.warranty_number}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {w.contactName ?? (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-muted)]">
                      {w.invoice_number ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-muted)]">
                      {fmtDate(w.issue_date)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-accent-badgeBg)] text-[var(--color-accent-primary)] text-xs font-bold">
                        {w.lines?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[var(--color-text-muted)]">
                      {fmtDate(earliestExpiry(w))}
                    </td>
                    <td className="px-5 py-4 text-center">{statusBadge(w.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/warranties/${w._id}`);
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
