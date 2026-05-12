"use client";

import { Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { Plus, FileSignature } from "lucide-react";

const mockContactContracts = [
  {
    _id: "c1",
    contract_number: "SZ-000001",
    name: "Éves karbantartási szerződés 2026",
    category: "Karbantartási szerződés",
    status: "sent" as const,
    valid_until: new Date("2026-12-31"),
  },
  {
    _id: "c4",
    contract_number: "SZ-000004",
    name: "Biztonsági rendszer üzemeltetési szerz.",
    category: "Vagyonvédelmi szerződés",
    status: "signed_digital" as const,
    valid_until: null,
  },
];

const statusLabels: Record<string, { label: string; variant: any }> = {
  draft: { label: "Vázlat", variant: "default" },
  sent: { label: "Kiküldve", variant: "info" },
  signed_digital: { label: "Digitálisan aláírva", variant: "success" },
  signed_paper: { label: "Papíron aláírva", variant: "success" },
  cancelled: { label: "Törölve", variant: "danger" },
};

export function ContactContractsTab({ contactId }: { contactId: string }) {
  const router = useRouter();

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

      {mockContactContracts.length === 0 ? (
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
      ) : (
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
                {mockContactContracts.map((c) => {
                  const s = statusLabels[c.status];
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
      )}
    </div>
  );
}
