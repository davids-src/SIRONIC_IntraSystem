"use client";

import { Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { Plus, FileSignature } from "lucide-react";
import { useEffect, useState } from "react";
import type { Contract, ContractStatus } from "@crm/types";
import { apiJson, ApiError } from "@/lib/api-client";

const statusLabels: Record<
  ContractStatus,
  { label: string; variant: "default" | "info" | "success" | "error" }
> = {
  draft: { label: "Vázlat", variant: "default" },
  sent: { label: "Kiküldve", variant: "info" },
  signed_digital: { label: "Digitálisan aláírva", variant: "success" },
  signed_paper: { label: "Papíron aláírva", variant: "success" },
  cancelled: { label: "Törölve", variant: "error" },
};

function parseContract(raw: unknown): Contract {
  const c = raw as Record<string, unknown>;
  return {
    ...(c as unknown as Contract),
    valid_from: c["valid_from"] ? new Date(String(c["valid_from"])) : null,
    valid_until: c["valid_until"] ? new Date(String(c["valid_until"])) : null,
    signed_at: c["signed_at"] ? new Date(String(c["signed_at"])) : null,
    created_at: new Date(String(c["created_at"])),
    updated_at: new Date(String(c["updated_at"])),
  };
}

export function ContactContractsTab({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Contract[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const data = await apiJson<unknown[]>(
          `/api/contracts?contact_id=${encodeURIComponent(contactId)}`,
          { signal: ac.signal },
        );
        setRows(data.map(parseContract));
        setLoadErr(null);
      } catch (e) {
        if (!ac.signal.aborted) {
          setLoadErr(e instanceof ApiError ? e.message : "Betöltés sikertelen.");
        }
      }
    })();
    return () => ac.abort();
  }, [contactId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text-primary, #fff)",
            margin: 0,
          }}
        >
          Szerződések
        </h3>
        <Button
          variant="secondary"
          onClick={() => router.push(`/contracts/new?contact_id=${contactId}`)}
        >
          <Plus size={16} style={{ marginRight: "8px" }} />
          Új szerződés
        </Button>
      </div>

      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)]" role="alert">
          {loadErr}
        </p>
      )}

      {rows.length === 0 && !loadErr ? (
        <Card className="p-8" style={{ textAlign: "center" }}>
          <FileSignature
            size={40}
            style={{ color: "var(--text-muted, #888)", marginBottom: "12px" }}
          />
          <p
            style={{ color: "var(--text-muted, #888)", fontSize: "0.875rem", margin: 0 }}
          >
            Ehhez a kontakthoz még nincs szerződés.
          </p>
        </Card>
      ) : rows.length > 0 ? (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle, #2a2a2a)" }}>
                  {["Szám", "Megnevezés", "Kategória", "Státusz", "Érvényesség vége"].map(
                    (h) => (
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
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const s = statusLabels[c.status] ?? {
                    label: c.status,
                    variant: "default" as const,
                  };
                  return (
                    <tr
                      key={c._id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle, #1a1a1a)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--bg-secondary, #141414)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      onClick={() => router.push(`/contracts/${c._id}`)}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                          color: "var(--text-muted, #888)",
                        }}
                      >
                        {c.contract_number}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          maxWidth: "220px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 500,
                          color: "var(--text-primary, #fff)",
                        }}
                      >
                        {c.name}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge variant="default">{c.category}</Badge>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--text-secondary, #aaa)",
                          fontSize: "0.875rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.valid_until
                          ? new Date(c.valid_until).toLocaleDateString("hu-HU")
                          : "Határozatlan"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
