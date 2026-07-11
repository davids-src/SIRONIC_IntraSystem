"use client";

import { Card, Button, Badge, Input } from "@crm/ui";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Send,
  FileCheck2,
  XCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Edit,
} from "lucide-react";
import type { Contract, ContractStatus, Contact } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

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

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [contract, setContract] = useState<Contract | null>(null);
  const [contactName, setContactName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [paperSignerName, setPaperSignerName] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const doc = await apiJson<Contract>(`/api/contracts/${id}`, {
          signal: ac.signal,
        });
        setContract(doc);

        try {
          const contact = await apiJson<Contact>(`/api/contacts/${doc.contact_id}`, {
            signal: ac.signal,
          });
          setContactName(contact.name);
        } catch {
          setContactName(doc.contact_id);
        }
        setError(null);
      } catch (e) {
        if (!ac.signal.aborted) {
          setError("A szerződés nem tölthető be.");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id]);

  const handleStatusChange = async (
    newStatus: ContractStatus,
    additionalPatch: Record<string, any> = {},
  ) => {
    if (!contract) return;
    setUpdating(true);
    try {
      const updated = await apiJsonBody<Contract>(`/api/contracts/${id}`, "PATCH", {
        status: newStatus,
        ...additionalPatch,
      });
      setContract(updated);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Művelet sikertelen.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSignPaper = async () => {
    if (!paperSignerName.trim()) {
      alert("Kérlek add meg az aláíró nevét!");
      return;
    }
    await handleStatusChange("signed_paper", {
      client_name: paperSignerName.trim(),
      signed_at: new Date().toISOString(),
    });
    setShowPaperModal(false);
  };

  const handleDelete = async () => {
    if (!confirm("Biztosan törölni szeretnéd ezt a szerződést?")) return;
    setUpdating(true);
    try {
      await apiJson(`/api/contracts/${id}`, { method: "DELETE" });
      router.push("/contracts");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Törlés sikertelen.");
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }

  if (error && !contract) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-[var(--color-status-error)]">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/contracts")}>
          Vissza
        </Button>
      </div>
    );
  }

  if (!contract) return null;

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

      {error && (
        <p className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-4 py-2">
          {error}
        </p>
      )}

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
                    onClick={() => router.push(`/organizations/${contract.contact_id}`)}
                  >
                    {contactName} <ExternalLink size={12} style={{ display: "inline" }} />
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
                      {contract.project_id}{" "}
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
                {contract.status === "draft" && (
                  <Button
                    variant="primary"
                    style={{ justifyContent: "flex-start", gap: "8px" }}
                    onClick={() => router.push(`/contracts/${id}/edit`)}
                    disabled={updating}
                  >
                    <Edit size={16} /> Szerkesztés
                  </Button>
                )}
                {contract.pdf_url && (
                  <Button
                    variant="secondary"
                    style={{ justifyContent: "flex-start", gap: "8px" }}
                    onClick={() => window.open(contract.pdf_url || "", "_blank")}
                  >
                    <Download size={16} /> PDF letöltése
                  </Button>
                )}
                {contract.status === "draft" && (
                  <Button
                    variant="secondary"
                    style={{ justifyContent: "flex-start", gap: "8px" }}
                    onClick={() => handleStatusChange("sent")}
                    disabled={updating}
                  >
                    <Send size={16} /> Küldés partnernek
                  </Button>
                )}
                {contract.signing_type === "paper" && contract.status === "sent" && (
                  <Button
                    variant="secondary"
                    style={{ justifyContent: "flex-start", gap: "8px" }}
                    onClick={() => setShowPaperModal(true)}
                    disabled={updating}
                  >
                    <FileCheck2 size={16} /> Papírosan aláírva jelölés
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
                    onClick={handleDelete}
                    disabled={updating}
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
              <Input
                label="Aláíró neve"
                value={paperSignerName}
                onChange={(e) => setPaperSignerName(e.target.value)}
                placeholder="Teljes neve…"
              />
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted, #888)",
                  margin: 0,
                }}
              >
                Papír alapú aláírás rögzítésével a szerződés státusza azonnal 'Papíron
                aláírva' lesz.
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setShowPaperModal(false)}>
                  Mégse
                </Button>
                <Button variant="primary" onClick={handleSignPaper}>
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
