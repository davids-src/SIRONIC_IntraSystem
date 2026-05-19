"use client";

import {
  PageHeader,
  Card,
  Badge,
  Button,
  Table,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileSignature, Download, Eye, XCircle, Plus } from "lucide-react";
import type { Contact, Contract, ContractStatus } from "@crm/types";

type ContractRow = Contract & { contact_name: string };

function parseContract(raw: unknown, contactName: string): ContractRow {
  const c = raw as Record<string, unknown>;
  return {
    ...(c as unknown as Contract),
    contact_name: contactName,
    valid_from: c["valid_from"] ? new Date(String(c["valid_from"])) : null,
    valid_until: c["valid_until"] ? new Date(String(c["valid_until"])) : null,
    signed_at: c["signed_at"] ? new Date(String(c["signed_at"])) : null,
    created_at: new Date(String(c["created_at"])),
    updated_at: new Date(String(c["updated_at"])),
  };
}

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
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [rc, rct] = await Promise.all([
          fetch("/api/contacts", { signal: ac.signal }),
          fetch("/api/contracts", { signal: ac.signal }),
        ]);
        if (!rc.ok || !rct.ok) {
          setLoadError("A szerződés lista nem elérhető.");
          return;
        }
        const contacts = (await rc.json()) as Contact[];
        const contractsRaw = (await rct.json()) as unknown[];
        const nameById = new Map(contacts.map((c) => [c._id, c.name]));
        setRows(
          contractsRaw.map((raw) => {
            const c = raw as Contract;
            const nm = nameById.get(c.contact_id) ?? c.contact_id;
            return parseContract(raw, nm);
          }),
        );
      } catch {
        if (!ac.signal.aborted) {
          setLoadError("A szerződés lista nem elérhető.");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = rows.filter((c) => {
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
    <div className="flex flex-col gap-6">
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

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="contracts-search" className="sr-only">
              Keresés
            </Label>
            <Input
              id="contracts-search"
              placeholder="Keresés (név, kontakt, szám)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex w-full min-w-[160px] flex-col gap-1.5 sm:w-auto sm:max-w-[220px]">
            <Label htmlFor="contracts-status" className="sr-only">
              Státusz szűrő
            </Label>
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger id="contracts-status" className="w-full">
                <SelectValue placeholder="Státusz" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "all"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full min-w-[160px] flex-col gap-1.5 sm:w-auto sm:max-w-[220px]">
            <Label htmlFor="contracts-type" className="sr-only">
              Típus szűrő
            </Label>
            <Select
              value={typeFilter || "all"}
              onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger id="contracts-type" className="w-full">
                <SelectValue placeholder="Típus" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value || "all"} value={o.value || "all"}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                          router.push(`/organizations/${contract.contact_id}`);
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
