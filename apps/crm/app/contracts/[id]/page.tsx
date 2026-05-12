"use client";

import { Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import {
  ArrowLeft,
  Download,
  Send,
  FileCheck2,
  XCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import type { Contract, ContractStatus } from "@crm/types";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockContract = {
  _id: "c1",
  contract_number: "SZ-000001",
  name: "Éves karbantartási szerződés 2026",
  category: "Karbantartási szerződés",
  type: "generated" as const,
  status: "sent" as ContractStatus,
  signing_type: "digital" as const,
  contact_id: "org1",
  contact_name: "Acme Kft.",
  project_id: "p1",
  project_name: "Irodaház infrastruktúra",
  ticket_id: null,
  pdf_url: "/fake/contract.pdf",
  portal_visible: true,
  valid_from: new Date("2026-01-01"),
  valid_until: new Date("2026-12-31"),
  client_name: null as string | null,
  client_signature: null as string | null,
  signed_at: null as Date | null,
  body: `<p>Ez a karbantartási szerződés az <strong>Acme Kft.</strong> és a SIRONIC Kft. között jött létre.</p>
<p>A szerződés tárgya: éves karbantartási szolgáltatás biztosítása az irodaház IT infrastruktúrájához.</p>
<p>A szerződés hatálya: 2026. január 1-jétől 2026. december 31-ig.</p>
<p>A felek megállapodnak a havi karbantartási díjban és a rendelkezésre állási feltételekben.</p>`,
  notes: null,
  created_at: new Date("2026-01-15"),
  updated_at: new Date("2026-01-15"),
};

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

const metaRow = (label: string, value: React.ReactNode) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
    <span
      style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "var(--text-muted, #888)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
    <span style={{ fontSize: "0.875rem", color: "var(--text-primary, #fff)" }}>
      {value}
    </span>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const contract = mockContract; // In real app: fetch by id
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [paperSignerName, setPaperSignerName] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Back + actions header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <button
          onClick={() => router.push("/contracts")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted, #888)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.875rem",
            padding: 0,
            width: "fit-content",
          }}
        >
          <ArrowLeft size={16} /> Vissza a szerződésekhez
        </button>

        {/* Header info */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  color: "var(--text-muted, #888)",
                }}
              >
                {contract.contract_number}
              </span>
              {statusBadge(contract.status)}
              <Badge variant={contract.type === "generated" ? "info" : "default"}>
                {contract.type === "generated" ? "Generált" : "Feltöltött"}
              </Badge>
              <Badge variant="default">{contract.category}</Badge>
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--text-primary, #fff)",
                margin: 0,
              }}
            >
              {contract.name}
            </h1>
            {(contract.valid_from || contract.valid_until) && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted, #888)",
                  margin: 0,
                }}
              >
                Érvényes:{" "}
                {contract.valid_from
                  ? new Date(contract.valid_from).toLocaleDateString("hu-HU")
                  : "?"}{" "}
                –{" "}
                {contract.valid_until
                  ? new Date(contract.valid_until).toLocaleDateString("hu-HU")
                  : "Határozatlan"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main layout: 2/3 + 1/3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* Left: contract body */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}
          >
            <Card className="p-6">
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted, #888)",
                  margin: "0 0 16px 0",
                }}
              >
                Szerződés tartalma
              </h3>
              {contract.type === "generated" && contract.body ? (
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary, #ccc)",
                    lineHeight: 1.8,
                  }}
                  dangerouslySetInnerHTML={{ __html: contract.body }}
                />
              ) : contract.pdf_url ? (
                <div style={{ overflow: "hidden", borderRadius: "8px" }}>
                  <iframe
                    src={contract.pdf_url}
                    style={{
                      width: "100%",
                      height: "600px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#fff",
                    }}
                    title="Szerződés PDF"
                  />
                </div>
              ) : (
                <p style={{ color: "var(--text-muted, #888)", fontSize: "0.875rem" }}>
                  Nincs megtekinthető tartalom.
                </p>
              )}
            </Card>
          </div>

          {/* Right: meta + actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Meta */}
            <Card className="p-5">
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted, #888)",
                  margin: "0 0 16px 0",
                }}
              >
                Adatok
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {metaRow(
                  "Kontakt",
                  <span
                    style={{ color: "var(--accent-primary, #e53935)", cursor: "pointer" }}
                    onClick={() => router.push(`/contacts/${contract.contact_id}`)}
                  >
                    {contract.contact_name}{" "}
                    <ExternalLink size={12} style={{ display: "inline" }} />
                  </span>,
                )}
                {contract.project_id &&
                  metaRow(
                    "Projekt",
                    <span
                      style={{
                        color: "var(--accent-primary, #e53935)",
                        cursor: "pointer",
                      }}
                      onClick={() => router.push(`/projects/${contract.project_id}`)}
                    >
                      {contract.project_name}{" "}
                      <ExternalLink size={12} style={{ display: "inline" }} />
                    </span>,
                  )}
                {metaRow(
                  "Aláírás módja",
                  {
                    digital: "Digitális (portálon)",
                    paper: "Papír alapú",
                    none: "Csak tárolás",
                  }[contract.signing_type],
                )}
                {metaRow(
                  "Portál láthatóság",
                  contract.portal_visible ? "✓ Látható" : "✗ Rejtett",
                )}
                {contract.signed_at &&
                  metaRow(
                    "Aláírás dátuma",
                    new Date(contract.signed_at).toLocaleDateString("hu-HU"),
                  )}
                {contract.client_name && metaRow("Aláíró neve", contract.client_name)}
              </div>
            </Card>

            {/* Signed confirmation */}
            {(contract.status === "signed_digital" ||
              contract.status === "signed_paper") && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "16px",
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: "10px",
                }}
              >
                <CheckCircle2 size={20} style={{ color: "#22c55e", flexShrink: 0 }} />
                <span style={{ fontSize: "0.875rem", color: "#22c55e" }}>
                  Aláírva: {contract.client_name} ·{" "}
                  {contract.signed_at
                    ? new Date(contract.signed_at).toLocaleDateString("hu-HU")
                    : ""}
                </span>
              </div>
            )}

            {/* Actions */}
            <Card className="p-5">
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted, #888)",
                  margin: "0 0 12px 0",
                }}
              >
                Műveletek
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {contract.pdf_url && (
                  <Button
                    variant="primary"
                    style={{ justifyContent: "flex-start", gap: "8px" }}
                  >
                    <Download size={16} /> PDF letöltése
                  </Button>
                )}
                {contract.status === "draft" && contract.portal_visible && (
                  <Button
                    variant="secondary"
                    style={{ justifyContent: "flex-start", gap: "8px" }}
                  >
                    <Send size={16} /> Küldés partnernek
                  </Button>
                )}
                {contract.signing_type === "paper" &&
                  contract.status !== "signed_paper" && (
                    <Button
                      variant="secondary"
                      style={{ justifyContent: "flex-start", gap: "8px" }}
                      onClick={() => setShowPaperModal(true)}
                    >
                      <FileCheck2 size={16} /> Papírosan aláírva jelölés
                    </Button>
                  )}
                {contract.type === "generated" && (
                  <Button
                    variant="secondary"
                    style={{ justifyContent: "flex-start", gap: "8px" }}
                  >
                    <RefreshCw size={16} /> PDF újragenerálás
                  </Button>
                )}
                {contract.status !== "cancelled" && (
                  <Button
                    variant="secondary"
                    style={{
                      justifyContent: "flex-start",
                      gap: "8px",
                      borderColor: "#e53935",
                      color: "#e53935",
                    }}
                  >
                    <XCircle size={16} /> Szerződés törlése
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Paper signed modal */}
      {showPaperModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "24px",
          }}
        >
          <Card className="p-6" style={{ maxWidth: "480px", width: "100%" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--text-primary, #fff)",
                margin: "0 0 16px 0",
              }}
            >
              Papír alapú aláírás rögzítése
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-muted, #888)",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Aláíró neve
                </label>
                <input
                  value={paperSignerName}
                  onChange={(e) => setPaperSignerName(e.target.value)}
                  placeholder="Teljes neve…"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle, #2a2a2a)",
                    background: "var(--bg-secondary, #141414)",
                    color: "var(--text-primary, #fff)",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted, #888)",
                  margin: 0,
                }}
              >
                Opcionálisan feltölthetsz egy beszkennelt aláírt PDF-et is.
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setShowPaperModal(false)}>
                  Mégse
                </Button>
                <Button variant="primary" onClick={() => setShowPaperModal(false)}>
                  Rögzítés
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
