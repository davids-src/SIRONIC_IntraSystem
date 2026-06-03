"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Contact, Offer } from "@crm/types";
import {
  Search,
  Filter,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OfferRow = Offer & { contact_name: string };

function parseOffer(raw: unknown, contactName: string): OfferRow {
  const o = raw as Record<string, unknown>;
  return {
    ...(o as unknown as Offer),
    contact_name: contactName,
    valid_until: o["valid_until"] ? new Date(String(o["valid_until"])) : null,
    created_at: new Date(String(o["created_at"])),
    updated_at: new Date(String(o["updated_at"])),
  };
}

const statusVariant = {
  draft: "default",
  sent: "info",
  accepted: "success",
  rejected: "error",
} as const;
const statusLabel = {
  draft: "Piszkozat",
  sent: "Elküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
} as const;

export default function OffersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<OfferRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = async () => {
    try {
      const [rc, ro] = await Promise.all([
        fetch("/api/contacts"),
        fetch(`/api/offers?include_archived=${includeArchived}`),
      ]);
      if (!rc.ok || !ro.ok) {
        setLoadError("Az ajánlat lista nem elérhető.");
        return;
      }
      const contacts = (await rc.json()) as Contact[];
      const offersRaw = (await ro.json()) as unknown[];
      const nameById = new Map(contacts.map((c) => [c._id, c.name]));
      setRows(
        offersRaw.map((raw) => {
          const o = raw as Offer;
          const nm = nameById.get(o.contact_id) ?? o.contact_id;
          return parseOffer(raw, nm);
        }),
      );
    } catch {
      setLoadError("Az ajánlat lista nem elérhető.");
    }
  };

  useEffect(() => {
    loadData();
  }, [includeArchived]);

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTarget) return;
    const res = await fetch(`/api/offers/${archiveTarget._id}`, {
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
    if (!confirm("Vissza szeretnéd állítani ezt az ajánlatot?")) return;
    const res = await fetch(`/api/offers/${id}`, {
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

  const filtered = rows.filter(
    (o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.offer_number.toLowerCase().includes(search.toLowerCase()) ||
      o.contact_name.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    sent: rows.filter((o) => o.status === "sent").length,
    accepted: rows.filter((o) => o.status === "accepted").length,
    rejected: rows.filter((o) => o.status === "rejected").length,
  };

  const columns: Column<OfferRow>[] = [
    {
      key: "offer_number",
      header: "Azonosító",
      width: "120px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.offer_number}
        </span>
      ),
    },
    {
      key: "title",
      header: "Ajánlat tárgya",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.title}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.contact_name}
          </div>
        </div>
      ),
    },
    {
      key: "total_amount",
      header: "Összeg",
      width: "120px",
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {new Intl.NumberFormat("hu-HU", {
            style: "currency",
            currency: "HUF",
            maximumFractionDigits: 0,
          }).format(row.total_amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      width: "120px",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{statusLabel[row.status]}</Badge>
      ),
    },
    {
      key: "valid_until",
      header: "Érvényesség",
      width: "120px",
      render: (row) => {
        if (!row.valid_until) {
          return (
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
              —
            </span>
          );
        }
        const d = new Date(row.valid_until);
        const expired = d < new Date() && row.status === "sent";
        return (
          <span
            style={{
              fontSize: "0.8rem",
              color: expired ? "#e53935" : "var(--color-text-primary, #fff)",
            }}
          >
            {d.toLocaleDateString("hu-HU")}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "72px",
      render: (row) => (
        <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
          {row.is_archived ? (
            <button
              onClick={() => handleRestore(row._id)}
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
                setArchiveTarget(row);
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
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Ajánlatok"
        subtitle="Ügyfélajánlatok készítése, kiküldése és nyomon követése"
        actions={
          <Button variant="primary" onClick={() => router.push("/offers/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új ajánlat
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          {
            label: "Nyitott",
            count: counts.sent,
            icon: <FileText size={16} />,
            color: "#3b82f6",
          },
          {
            label: "Elfogadva",
            count: counts.accepted,
            icon: <CheckCircle size={16} />,
            color: "#22c55e",
          },
          {
            label: "Elutasítva",
            count: counts.rejected,
            icon: <XCircle size={16} />,
            color: "#e53935",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-muted, #555)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </span>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "var(--color-text-primary, #fff)",
                lineHeight: 1,
              }}
            >
              {stat.count}
            </div>
          </Card>
        ))}
      </div>

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      <Card className="p-4">
        <div
          style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}
        >
          <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted, #555)",
                pointerEvents: "none",
              }}
            />
            <Input
              label=""
              placeholder="Keresés ajánlatban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="of-include-archived"
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
              htmlFor="of-include-archived"
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
          <Button variant="secondary">
            <Filter size={15} style={{ marginRight: "6px" }} />
            Szűrők
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<OfferRow>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/offers/${row._id}`)}
          emptyMessage="Nincs megjeleníthető ajánlat"
        />
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
            <h2 style={{ margin: "0 0 12px 0", color: "#fff" }}>Ajánlat archiválása</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
              }}
            >
              Biztosan archiválni szeretnéd: <strong>{archiveTarget.offer_number}</strong>
              ?<br />
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
                <Input
                  id="of-archive-reason"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Pl. Elavult, visszavont..."
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
