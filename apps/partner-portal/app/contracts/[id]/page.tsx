"use client";

import { Card, Button, Badge, Input } from "@crm/ui";
import { useRouter } from "next/navigation";
import { use, useState, useRef } from "react";
import { ArrowLeft, Download, CheckCircle2, PenLine } from "lucide-react";

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockContract = {
  _id: "c1",
  contract_number: "SZ-000001",
  name: "Éves karbantartási szerződés 2026",
  category: "Karbantartási szerződés",
  status: "sent" as "sent" | "signed_digital" | "signed_paper" | "draft" | "cancelled",
  signing_type: "digital" as "digital" | "paper" | "none",
  project_name: "Irodaház infrastruktúra",
  pdf_url: null as string | null,
  valid_from: new Date("2026-01-01"),
  valid_until: new Date("2026-12-31"),
  client_name: null as string | null,
  signed_at: null as Date | null,
  body: `<p>Ez a karbantartási szerződés az <strong>Acme Kft.</strong> és a SIRONIC Kft. között jött létre.</p>
<p>A szerződés tárgya: éves karbantartási szolgáltatás biztosítása az irodaház IT infrastruktúrájához.</p>
<p>A szerződés hatálya: 2026. január 1-jétől 2026. december 31-ig.</p>
<p>A felek megállapodnak a havi karbantartási díjban és a rendelkezésre állási feltételekben.</p>
<p>Kelt: Budapest, 2026. január 15.</p>`,
};

const portalStatusMap: Record<string, { label: string; variant: any }> = {
  sent: { label: "Aláírásra vár", variant: "info" },
  signed_digital: { label: "Aláírva", variant: "success" },
  signed_paper: { label: "Aláírva", variant: "success" },
  cancelled: { label: "Törölve", variant: "error" },
  draft: { label: "—", variant: "default" },
};

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({ onSign }: { onSign: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch?.clientX ?? 0) - rect.left,
        y: (touch?.clientY ?? 0) - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasStrokes(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const submit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSign(canvas.toDataURL());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          width: "100%",
          height: "160px",
          border: "1px solid var(--border-subtle, #2a2a2a)",
          borderRadius: "8px",
          background: "var(--bg-secondary, #111)",
          cursor: "crosshair",
          touchAction: "none",
        }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={clear}
          style={{
            background: "none",
            border: "1px solid var(--border-subtle, #333)",
            borderRadius: "6px",
            color: "var(--text-muted, #888)",
            fontSize: "0.8rem",
            padding: "4px 12px",
            cursor: "pointer",
          }}
        >
          Törlés
        </button>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted, #888)",
            alignSelf: "center",
          }}
        >
          {hasStrokes ? "Aláírás megadva" : "Rajzold be az aláírásod"}
        </span>
      </div>
      <Button
        variant="primary"
        style={{ gap: "8px" }}
        onClick={submit}
        disabled={!hasStrokes}
      >
        <PenLine size={16} />
        Aláírom a szerződést
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PortalContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [contract, setContract] = useState({ ...mockContract });
  const [clientName, setClientName] = useState("");

  const handleSign = (signatureData: string) => {
    if (!clientName.trim()) {
      alert("Kérjük add meg a teljes neved az aláírás előtt.");
      return;
    }
    setContract((prev) => ({
      ...prev,
      status: "signed_digital",
      client_name: clientName,
      signed_at: new Date(),
    }));
  };

  const s = portalStatusMap[contract.status] || {
    label: "Ismeretlen",
    variant: "default",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 700,
                  color: "var(--text-primary, #fff)",
                  margin: 0,
                }}
              >
                {contract.name}
              </h1>
              <Badge variant={s.variant}>{s.label}</Badge>
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted, #888)",
                fontFamily: "monospace",
              }}
            >
              {contract.contract_number}
            </span>
          </div>
          {contract.pdf_url && (
            <Button variant="secondary" style={{ gap: "8px" }}>
              <Download size={16} /> PDF letöltése
            </Button>
          )}
        </div>
      </div>

      {/* Content + Meta */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Contract body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
            {contract.pdf_url ? (
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
            ) : contract.body ? (
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary, #ccc)",
                  lineHeight: 1.8,
                }}
                dangerouslySetInnerHTML={{ __html: contract.body }}
              />
            ) : (
              <p style={{ color: "var(--text-muted, #888)", fontSize: "0.875rem" }}>
                Nincs megtekinthető tartalom.
              </p>
            )}
          </Card>

          {/* Signature block */}
          {contract.signing_type === "digital" && contract.status === "sent" && (
            <Card
              className="p-6"
              style={{ border: "1px solid var(--border-default, #2a2a2a)" }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--text-primary, #fff)",
                  margin: "0 0 8px 0",
                }}
              >
                Aláírás
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-muted, #888)",
                  margin: "0 0 20px 0",
                  lineHeight: 1.6,
                }}
              >
                Az aláírással igazolom, hogy a szerződés tartalmát megismertem és
                elfogadom.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <Input
                  label="Teljes neve *"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Pl. Kiss Gábor"
                />
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
                    Aláírás
                  </label>
                  <SignaturePad onSign={handleSign} />
                </div>
              </div>
            </Card>
          )}

          {/* Already signed */}
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
        </div>

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
            Részletek
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "Kategória", value: contract.category },
              {
                label: "Érvényesség kezdete",
                value: contract.valid_from
                  ? new Date(contract.valid_from).toLocaleDateString("hu-HU")
                  : "—",
              },
              {
                label: "Érvényesség vége",
                value: contract.valid_until
                  ? new Date(contract.valid_until).toLocaleDateString("hu-HU")
                  : "Határozatlan",
              },
              ...(contract.project_name
                ? [{ label: "Kapcsolódó projekt", value: contract.project_name }]
                : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{ display: "flex", flexDirection: "column", gap: "2px" }}
              >
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
                <span
                  style={{ fontSize: "0.875rem", color: "var(--text-primary, #fff)" }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
