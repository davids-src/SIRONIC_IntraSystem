"use client";

import { PageHeader, Card, Badge, Button, Table } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileSignature, Download, Eye, XCircle, Plus } from "lucide-react";
import type { Contract, ContractStatus } from "@crm/types";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockContracts: Array<Contract & { contact_name: string; contact_id: string }> = [
  {
    _id: "c1",
    contract_number: "SZ-000001",
    tenantId: "t1",
    contact_id: "org1",
    contact_name: "Acme Kft.",
    project_id: "p1",
    ticket_id: null,
    template_id: "tmpl1",
    created_by: "admin",
    type: "generated",
    category: "Karbantartási szerződés",
    name: "Éves karbantartási szerződés 2026",
    status: "sent",
    body: null,
    variables_filled: null,
    pdf_url: "/fake/contract.pdf",
    portal_visible: true,
    signing_type: "digital",
    client_name: null,
    client_signature: null,
    signed_at: null,
    valid_from: new Date("2026-01-01"),
    valid_until: new Date("2026-12-31"),
    notes: null,
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    contract_warning_dismissed: false,
  } as any,
  {
    _id: "c2",
    contract_number: "SZ-000002",
    tenantId: "t1",
    contact_id: "org2",
    contact_name: "GlobalTech Zrt.",
    project_id: null,
    ticket_id: null,
    template_id: null,
    created_by: "admin",
    type: "uploaded",
    category: "Titoktartási nyilatkozat (NDA)",
    name: "NDA – GlobalTech Zrt.",
    status: "signed_paper",
    body: null,
    variables_filled: null,
    pdf_url: "/fake/nda.pdf",
    portal_visible: false,
    signing_type: "paper",
    client_name: "Kiss Gábor",
    client_signature: null,
    signed_at: new Date("2026-02-20"),
    valid_from: new Date("2026-02-20"),
    valid_until: null,
    notes: null,
    created_at: new Date("2026-02-20"),
    updated_at: new Date("2026-02-20"),
    contract_warning_dismissed: false,
  } as any,
  {
    _id: "c3",
    contract_number: "SZ-000003",
    tenantId: "t1",
    contact_id: "org3",
    contact_name: "MegaCorp Kft.",
    project_id: "p2",
    ticket_id: null,
    template_id: "tmpl2",
    created_by: "admin",
    type: "generated",
    category: "Megbízási szerződés",
    name: "Webfejlesztési megbízás 2026",
    status: "draft",
    body: null,
    variables_filled: null,
    pdf_url: null,
    portal_visible: false,
    signing_type: "digital",
    client_name: null,
    client_signature: null,
    signed_at: null,
    valid_from: new Date("2026-03-01"),
    valid_until: new Date("2026-09-30"),
    notes: null,
    created_at: new Date("2026-03-10"),
    updated_at: new Date("2026-03-10"),
    contract_warning_dismissed: false,
  } as any,
  {
    _id: "c4",
    contract_number: "SZ-000004",
    tenantId: "t1",
    contact_id: "org1",
    contact_name: "Acme Kft.",
    project_id: null,
    ticket_id: null,
    template_id: "tmpl3",
    created_by: "admin",
    type: "generated",
    category: "Vagyonvédelmi szerződés",
    name: "Biztonsági rendszer üzemeltetési szerz.",
    status: "signed_digital",
    body: null,
    variables_filled: null,
    pdf_url: "/fake/security.pdf",
    portal_visible: true,
    signing_type: "digital",
    client_name: "Nagy Péter",
    client_signature: "data:image/png;base64,abc",
    signed_at: new Date("2026-04-01"),
    valid_from: new Date("2026-04-01"),
    valid_until: null,
    notes: null,
    created_at: new Date("2026-03-25"),
    updated_at: new Date("2026-04-01"),
    contract_warning_dismissed: false,
  } as any,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: ContractStatus) {
  const map: Record<
    ContractStatus,
    { label: string; variant: "default" | "info" | "success" | "warning" | "error" }
  > = {
    draft: { label: "Vázlat", variant: "default" },
    sent: { label: "Kiküldve", variant: "info" },
    signed_digital: { label: "Digitálisan aláírva", variant: "success" },
    signed_paper: { label: "Papíron aláírva", variant: "success" },
    cancelled: { label: "Törölve", variant: "error" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "default" };
  return <Badge variant={variant}>{label}</Badge>;
}

function typeBadge(type: "generated" | "uploaded") {
  return (
    <Badge variant={type === "generated" ? "info" : "default"}>
      {type === "generated" ? "Generált" : "Feltöltött"}
    </Badge>
  );
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Minden státusz" },
  { value: "draft", label: "Vázlat" },
  { value: "sent", label: "Kiküldve" },
  { value: "signed_digital", label: "Digitálisan aláírva" },
  { value: "signed_paper", label: "Papíron aláírva" },
  { value: "cancelled", label: "Törölve" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "Minden típus" },
  { value: "generated", label: "Generált" },
  { value: "uploaded", label: "Feltöltött" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractsListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockContracts.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    if (
      searchQuery &&
      !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.contract_number.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Szerződések"
        subtitle="Szerződések kezelése, generálása és aláírása"
        actions={
          <Button variant="primary" onClick={() => router.push("/contracts/new")}>
            <Plus size={16} style={{ marginRight: "8px" }} />
            Új szerződés
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Keresés (név, kontakt, szám)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: "1 1 200px",
              minWidth: "180px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle, #2a2a2a)",
              background: "var(--bg-secondary, #141414)",
              color: "var(--text-primary, #fff)",
              fontSize: "0.875rem",
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              flex: "0 1 180px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle, #2a2a2a)",
              background: "var(--bg-secondary, #141414)",
              color: "var(--text-primary, #fff)",
              fontSize: "0.875rem",
            }}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              flex: "0 1 180px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle, #2a2a2a)",
              background: "var(--bg-secondary, #141414)",
              color: "var(--text-primary, #fff)",
              fontSize: "0.875rem",
            }}
          >
            {TYPE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-subtle, #2a2a2a)",
                }}
              >
                {[
                  "Szám",
                  "Megnevezés",
                  "Kontakt",
                  "Kategória",
                  "Típus",
                  "Státusz",
                  "Érvényesség vége",
                  "Műveletek",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-muted, #555)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "48px 16px",
                      textAlign: "center",
                      color: "var(--text-muted, #555)",
                    }}
                  >
                    <FileSignature
                      size={40}
                      style={{
                        marginBottom: "12px",
                        opacity: 0.4,
                        display: "block",
                        margin: "0 auto 12px",
                      }}
                    />
                    Nincs találat a szűrési feltételek alapján.
                  </td>
                </tr>
              ) : (
                filtered.map((contract) => (
                  <tr
                    key={contract._id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle, #1a1a1a)",
                      transition: "background 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-secondary, #141414)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                    onClick={() => router.push(`/contracts/${contract._id}`)}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        color: "var(--text-muted, #888)",
                      }}
                    >
                      {contract.contract_number}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "240px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: 500,
                        color: "var(--text-primary, #fff)",
                      }}
                    >
                      {contract.name}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "180px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--accent-primary, #e53935)",
                          cursor: "pointer",
                          textDecoration: "none",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/contacts/${contract.contact_id}`);
                        }}
                      >
                        {contract.contact_name}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "160px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Badge variant="default">{contract.category}</Badge>
                    </td>
                    <td style={{ padding: "12px 16px", maxWidth: "120px" }}>
                      {typeBadge(contract.type)}
                    </td>
                    <td style={{ padding: "12px 16px", maxWidth: "140px" }}>
                      {statusBadge(contract.status)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "140px",
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary, #aaa)",
                        fontSize: "0.875rem",
                      }}
                    >
                      {contract.valid_until
                        ? new Date(contract.valid_until).toLocaleDateString("hu-HU")
                        : "Határozatlan"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "120px",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button
                          title="Megtekintés"
                          onClick={() => router.push(`/contracts/${contract._id}`)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted, #888)",
                            padding: "4px",
                            borderRadius: "4px",
                          }}
                        >
                          <Eye size={16} />
                        </button>
                        {contract.pdf_url && (
                          <button
                            title="PDF letöltése"
                            onClick={() => window.open(contract.pdf_url!, "_blank")}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-muted, #888)",
                              padding: "4px",
                              borderRadius: "4px",
                            }}
                          >
                            <Download size={16} />
                          </button>
                        )}
                        {contract.status !== "cancelled" && (
                          <button
                            title="Törlés"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#e53935",
                              padding: "4px",
                              borderRadius: "4px",
                            }}
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
