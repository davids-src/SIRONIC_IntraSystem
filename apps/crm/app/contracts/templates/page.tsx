"use client";

import { PageHeader, Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { Plus, Edit, Copy, Power, Eye } from "lucide-react";

const mockTemplates = [
  {
    _id: "tmpl1",
    name: "Karbantartási szerződés alap",
    category: "Karbantartási szerződés",
    requires_digital_signature: true,
    is_active: true,
    variables: [
      "contact_name",
      "site_address",
      "work_description",
      "valid_from",
      "valid_until",
    ],
    created_at: new Date("2026-01-01"),
  },
  {
    _id: "tmpl2",
    name: "Megbízási szerződés standard",
    category: "Megbízási szerződés",
    requires_digital_signature: true,
    is_active: true,
    variables: ["contact_name", "contact_address", "project_name", "technician_name"],
    created_at: new Date("2026-02-10"),
  },
  {
    _id: "tmpl3",
    name: "NDA sablon (magyar)",
    category: "Titoktartási nyilatkozat (NDA)",
    requires_digital_signature: false,
    is_active: false,
    variables: ["contact_name", "contact_address", "company_name", "contract_date"],
    created_at: new Date("2026-03-05"),
  },
];

export default function ContractTemplatesPage() {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Szerződés sablonok"
        subtitle="Sablonok kezelése változókkal és digitális aláírással"
        actions={
          <Button
            variant="primary"
            onClick={() => router.push("/contracts/templates/new")}
          >
            <Plus size={16} style={{ marginRight: "8px" }} />
            Új sablon
          </Button>
        }
      />

      <Card>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle, #2a2a2a)" }}>
                {[
                  "Megnevezés",
                  "Kategória",
                  "Digitális aláírás",
                  "Aktív",
                  "Változók",
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
              {mockTemplates.map((tmpl) => (
                <tr
                  key={tmpl._id}
                  style={{ borderBottom: "1px solid var(--border-subtle, #1a1a1a)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-secondary, #141414)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      maxWidth: "260px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                      color: "var(--text-primary, #fff)",
                    }}
                  >
                    {tmpl.name}
                  </td>
                  <td style={{ padding: "12px 16px", maxWidth: "180px" }}>
                    <Badge variant="default">{tmpl.category}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge
                      variant={tmpl.requires_digital_signature ? "success" : "default"}
                    >
                      {tmpl.requires_digital_signature ? "Igen" : "Nem"}
                    </Badge>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge variant={tmpl.is_active ? "success" : "default"}>
                      {tmpl.is_active ? "Aktív" : "Inaktív"}
                    </Badge>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--text-muted, #888)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {tmpl.variables.length} változó
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        title="Szerkesztés"
                        onClick={() =>
                          router.push(`/contracts/templates/${tmpl._id}/edit`)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted, #888)",
                          padding: "4px",
                          borderRadius: "4px",
                        }}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        title="Másolás"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted, #888)",
                          padding: "4px",
                          borderRadius: "4px",
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        title={tmpl.is_active ? "Inaktiválás" : "Aktiválás"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: tmpl.is_active ? "#f59e0b" : "#22c55e",
                          padding: "4px",
                          borderRadius: "4px",
                        }}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
