"use client";

import { Card, Button, Badge, PageHeader } from "@crm/ui";
import { useRouter } from "next/navigation";
import { FileCheck, PenLine, Files, FileSignature, Eye } from "lucide-react";

const mockContracts = [
  {
    _id: "c1",
    contract_number: "SZ-000001",
    name: "Éves karbantartási szerződés 2026",
    category: "Karbantartási szerződés",
    status: "sent",
    valid_until: new Date("2026-12-31"),
  },
  {
    _id: "c4",
    contract_number: "SZ-000004",
    name: "Biztonsági rendszer üzemeltetési szerz.",
    category: "Vagyonvédelmi szerződés",
    status: "signed_digital",
    valid_until: null,
  },
];

const portalStatusMap: Record<string, { label: string; variant: any }> = {
  sent: { label: "Aláírásra vár", variant: "info" },
  signed_digital: { label: "Aláírva", variant: "success" },
  signed_paper: { label: "Aláírva", variant: "success" },
  draft: { label: "—", variant: "default" },
  cancelled: { label: "Törölve", variant: "error" },
};

export default function PortalContractsPage() {
  const router = useRouter();

  const signed = mockContracts.filter(
    (c) => c.status === "signed_digital" || c.status === "signed_paper",
  ).length;
  const pending = mockContracts.filter((c) => c.status === "sent").length;
  const total = mockContracts.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader title="Szerződések" subtitle="Az Önnel kötött érvényes szerződések" />

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "24px",
        }}
      >
        {[
          {
            label: "Aktív szerződések",
            value: signed,
            icon: <FileCheck size={20} />,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.08)",
          },
          {
            label: "Aláírásra vár",
            value: pending,
            icon: <PenLine size={20} />,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.08)",
          },
          {
            label: "Összes",
            value: total,
            icon: <Files size={20} />,
            color: "#888",
            bg: "var(--bg-secondary, #1a1a1a)",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: stat.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: stat.color,
                  flexShrink: 0,
                }}
              >
                {stat.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "var(--text-primary, #fff)",
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted, #888)",
                    marginTop: "4px",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Contracts table */}
      <Card>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle, #2a2a2a)" }}>
                {[
                  "Szám",
                  "Megnevezés",
                  "Kategória",
                  "Státusz",
                  "Érvényesség vége",
                  "",
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
              {mockContracts.map((c) => {
                const s = portalStatusMap[c.status] || {
                  label: "Ismeretlen",
                  variant: "default",
                };
                return (
                  <tr
                    key={c._id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle, #1a1a1a)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-secondary, #141414)")
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
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.contract_number}
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
                      {c.name}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "160px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Badge variant="default">{c.category}</Badge>
                    </td>
                    <td style={{ padding: "12px 16px", maxWidth: "140px" }}>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "var(--text-secondary, #aaa)",
                        whiteSpace: "nowrap",
                        maxWidth: "140px",
                      }}
                    >
                      {c.valid_until
                        ? new Date(c.valid_until).toLocaleDateString("hu-HU")
                        : "Határozatlan"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        maxWidth: "160px",
                        whiteSpace: "nowrap",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="secondary"
                        style={{ height: "32px", fontSize: "0.8rem", gap: "6px" }}
                        onClick={() => router.push(`/contracts/${c._id}`)}
                      >
                        <Eye size={14} />
                        {c.status === "sent" ? "Megtekintés és aláírás" : "Megtekintés"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
