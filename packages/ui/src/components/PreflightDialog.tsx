"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { Button } from "./Button";
import { InputControl } from "./ui/input-control";
import type {
  PreflightResult,
  PreflightMessage,
  StockImpactLine,
  DeliveryNotePreviewLine,
  RelatedDocument,
} from "@crm/types";

export interface PreflightDialogProps {
  open: boolean;
  onClose: () => void;
  /** Preflight eredmény az API-tól */
  result: PreflightResult | null;
  /** Betöltés alatt van-e */
  loading?: boolean;
  /** Szállítólevél tételek módosításai (felhasználó által szerkesztve) */
  onDeliveryLinesChange?: (lines: DeliveryNotePreviewLine[]) => void;
  /** Szállítólevél generálás be/ki */
  onToggleDeliveryNote?: (generate: boolean) => void;
  /** Megerősítés és végrehajtás */
  onConfirm: (overrides?: {
    deliveryLines?: DeliveryNotePreviewLine[];
    generateDeliveryNote?: boolean;
  }) => void;
  /** Fő akciógomb felirata */
  confirmLabel?: string;
  /** Bezárva lefutott-e a művelet (spinner) */
  confirming?: boolean;
}

/* ─── severity → stílus ──────────────────────────────────────────────────── */
const severityStyles = {
  error: {
    bg: "rgba(229, 57, 53, 0.10)",
    border: "rgba(229, 57, 53, 0.30)",
    text: "#ef5350",
    icon: "⛔",
  },
  warning: {
    bg: "rgba(245, 158, 11, 0.10)",
    border: "rgba(245, 158, 11, 0.30)",
    text: "#fbbf24",
    icon: "⚠️",
  },
  info: {
    bg: "rgba(59, 130, 246, 0.10)",
    border: "rgba(59, 130, 246, 0.30)",
    text: "#60a5fa",
    icon: "ℹ️",
  },
};

function MessageCard({ msg }: { msg: PreflightMessage }) {
  const s =
    severityStyles[msg.severity as keyof typeof severityStyles] || severityStyles.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "10px 14px",
        borderRadius: radius.sm,
        border: `1px solid ${s.border}`,
        backgroundColor: s.bg,
      }}
    >
      <span style={{ fontSize: "14px", flexShrink: 0 }}>{s.icon}</span>
      <span style={{ fontSize: "13px", color: s.text, lineHeight: 1.5 }}>
        {msg.message}
      </span>
    </div>
  );
}

function StockImpactTable({ lines }: { lines: StockImpactLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: `2px solid ${colors.border.default}`,
              color: colors.text.muted,
              textTransform: "uppercase",
              fontSize: "11px",
              letterSpacing: "0.05em",
            }}
          >
            <th style={{ textAlign: "left", padding: "8px" }}>Termék</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Kért</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Aktuális</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Foglalt</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Szabad</th>
            <th style={{ textAlign: "right", padding: "8px" }}>Maradék</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const rowColor = line.insufficient
              ? "rgba(229, 57, 53, 0.08)"
              : "transparent";
            return (
              <tr
                key={line.price_list_item_id}
                style={{
                  borderBottom: `1px solid ${colors.border.subtle}`,
                  backgroundColor: rowColor,
                }}
              >
                <td
                  style={{
                    padding: "8px",
                    fontWeight: 500,
                    color: colors.text.primary,
                  }}
                >
                  {line.name}
                  <span
                    style={{
                      marginLeft: "6px",
                      color: colors.text.muted,
                      fontSize: "11px",
                    }}
                  >
                    ({line.unit})
                  </span>
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: colors.text.primary,
                  }}
                >
                  {line.requested_quantity}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontFamily: "monospace",
                    color: colors.text.secondary,
                  }}
                >
                  {line.current_stock}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontFamily: "monospace",
                    color: colors.text.muted,
                  }}
                >
                  {line.allocated_stock}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontFamily: "monospace",
                    color: colors.text.secondary,
                  }}
                >
                  {line.available_stock}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: line.insufficient
                      ? colors.status.error
                      : line.stock_after <= 0
                        ? colors.status.warning
                        : colors.status.success,
                  }}
                >
                  {line.stock_after}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryNoteEditor({
  lines,
  onChange,
}: {
  lines: DeliveryNotePreviewLine[];
  onChange: (lines: DeliveryNotePreviewLine[]) => void;
}) {
  const updateLine = (idx: number, qty: number) => {
    const updated = lines.map((l, i) =>
      i === idx ? { ...l, quantity: qty, modified: true } : l,
    );
    onChange(updated);
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: `2px solid ${colors.border.default}`,
              color: colors.text.muted,
              textTransform: "uppercase",
              fontSize: "11px",
              letterSpacing: "0.05em",
            }}
          >
            <th style={{ textAlign: "left", padding: "8px" }}>Termék</th>
            <th style={{ textAlign: "right", padding: "8px", width: "120px" }}>
              Mennyiség
            </th>
            <th style={{ textAlign: "left", padding: "8px", width: "60px" }}>Me.</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr
              key={line.price_list_item_id}
              style={{
                borderBottom: `1px solid ${colors.border.subtle}`,
                backgroundColor: line.modified
                  ? "rgba(59, 130, 246, 0.06)"
                  : "transparent",
              }}
            >
              <td
                style={{
                  padding: "8px",
                  fontWeight: 500,
                  color: colors.text.primary,
                }}
              >
                {line.name}
              </td>
              <td style={{ textAlign: "right", padding: "4px 8px" }}>
                <InputControl
                  type="number"
                  min="0"
                  step="any"
                  value={line.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateLine(idx, parseFloat(e.target.value) || 0)
                  }
                  style={{
                    textAlign: "right",
                    width: "100px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                  }}
                />
              </td>
              <td
                style={{
                  padding: "8px",
                  color: colors.text.muted,
                }}
              >
                {line.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedDocsList({ docs }: { docs: RelatedDocument[] }) {
  if (docs.length === 0) return null;

  const typeLabels: Record<string, string> = {
    delivery_note: "Szállítólevél",
    worklog: "Munkalap",
    completion_certificate: "Teljesítésigazolás",
    offer: "Ajánlat",
    purchase_order: "Megrendelőlap",
    contract: "Szerződés",
  };

  const statusLabels: Record<string, string> = {
    draft: "Piszkozat",
    issued: "Kiadva",
    finalized: "Végleges",
    sent: "Kiküldve",
    accepted: "Elfogadva",
    cancelled: "Sztornó",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {docs.map((doc) => (
        <div
          key={doc._id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 12px",
            borderRadius: radius.sm,
            backgroundColor: colors.bg.secondary,
            border: `1px solid ${colors.border.subtle}`,
            fontSize: "13px",
          }}
        >
          <span style={{ color: colors.text.muted, fontSize: "11px" }}>
            {typeLabels[doc.type] ?? doc.type}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            {doc.number}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: radius.sm,
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor:
                doc.status === "issued" || doc.status === "finalized"
                  ? "rgba(34, 197, 94, 0.15)"
                  : "rgba(245, 158, 11, 0.15)",
              color:
                doc.status === "issued" || doc.status === "finalized"
                  ? colors.status.success
                  : colors.status.warning,
            }}
          >
            {statusLabels[doc.status] ?? doc.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PreflightDialog({
  open,
  onClose,
  result,
  loading = false,
  onDeliveryLinesChange,
  onToggleDeliveryNote,
  onConfirm,
  confirmLabel = "Végrehajtás",
  confirming = false,
}: PreflightDialogProps) {
  const [localLines, setLocalLines] = React.useState<DeliveryNotePreviewLine[]>([]);
  const [generateDN, setGenerateDN] = React.useState(true);

  React.useEffect(() => {
    if (result?.deliveryNotePreview) {
      setLocalLines(result.deliveryNotePreview);
    }
    if (result) {
      setGenerateDN(result.shouldGenerateDeliveryNote);
    }
  }, [result]);

  if (!open) return null;

  const handleLinesChange = (lines: DeliveryNotePreviewLine[]) => {
    setLocalLines(lines);
    onDeliveryLinesChange?.(lines);
  };

  const handleToggleDN = () => {
    const next = !generateDN;
    setGenerateDN(next);
    onToggleDeliveryNote?.(next);
  };

  const handleConfirm = () => {
    onConfirm({
      deliveryLines: generateDN ? localLines : undefined,
      generateDeliveryNote: generateDN,
    });
  };

  const errors = result?.messages.filter((m) => m.severity === "error") ?? [];
  const warnings = result?.messages.filter((m) => m.severity === "warning") ?? [];
  const infos = result?.messages.filter((m) => m.severity === "info") ?? [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "780px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.bg.card,
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: radius.lg,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.border.subtle}`,
            backgroundColor: colors.bg.card,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.25rem" }}>🔍</span>
            <h3
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 700,
                color: colors.text.primary,
              }}
            >
              Bizonylat kiállítás előtti ellenőrzés
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Bezárás"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: colors.text.secondary,
              fontSize: "1.25rem",
              lineHeight: 1,
              padding: "6px 10px",
              borderRadius: radius.sm,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body – scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {loading && (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: colors.text.muted,
              }}
            >
              Ellenőrzés futtatása…
            </div>
          )}

          {!loading && result && (
            <>
              {/* Összesített státusz */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: radius.md,
                  backgroundColor: result.canProceed
                    ? "rgba(34, 197, 94, 0.08)"
                    : "rgba(229, 57, 53, 0.08)",
                  border: `1px solid ${result.canProceed ? "rgba(34, 197, 94, 0.25)" : "rgba(229, 57, 53, 0.25)"}`,
                }}
              >
                <span style={{ fontSize: "20px" }}>
                  {result.canProceed ? "✅" : "❌"}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: result.canProceed
                      ? colors.status.success
                      : colors.status.error,
                  }}
                >
                  {result.canProceed
                    ? "Minden ellenőrzés sikeres – folytatható"
                    : `${errors.length} hiba – a kiállítás nem lehetséges`}
                </span>
              </div>

              {/* Üzenetek */}
              {errors.length > 0 && (
                <section>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: colors.status.error,
                    }}
                  >
                    Hibák ({errors.length})
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {errors.map((m, i) => (
                      <MessageCard key={`e-${i}`} msg={m} />
                    ))}
                  </div>
                </section>
              )}

              {warnings.length > 0 && (
                <section>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: colors.status.warning,
                    }}
                  >
                    Figyelmeztetések ({warnings.length})
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {warnings.map((m, i) => (
                      <MessageCard key={`w-${i}`} msg={m} />
                    ))}
                  </div>
                </section>
              )}

              {infos.length > 0 && (
                <section>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {infos.map((m, i) => (
                      <MessageCard key={`i-${i}`} msg={m} />
                    ))}
                  </div>
                </section>
              )}

              {/* Készlethatás táblázat */}
              {result.stockImpact.length > 0 && (
                <section>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: colors.text.muted,
                    }}
                  >
                    Készlethatás
                  </h4>
                  <StockImpactTable lines={result.stockImpact} />
                </section>
              )}

              {/* Szállítólevél tételek szerkesztése */}
              {result.deliveryNotePreview && result.deliveryNotePreview.length > 0 && (
                <section>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: colors.text.muted,
                      }}
                    >
                      Szállítólevél tételei
                    </h4>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: colors.text.secondary,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={generateDN}
                        onChange={handleToggleDN}
                        style={{ accentColor: colors.accent.primary }}
                      />
                      Szállítólevél generálása
                    </label>
                  </div>
                  {generateDN && (
                    <DeliveryNoteEditor lines={localLines} onChange={handleLinesChange} />
                  )}
                  {!generateDN && (
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: radius.sm,
                        backgroundColor: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.25)",
                        fontSize: "13px",
                        color: colors.status.warning,
                      }}
                    >
                      ⚠️ A szállítólevél generálás kikapcsolva – a készlet NEM kerül
                      levonásra.
                    </div>
                  )}
                </section>
              )}

              {/* Kapcsolódó bizonylatok */}
              {result.relatedDocuments.length > 0 && (
                <section>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: colors.text.muted,
                    }}
                  >
                    Kapcsolódó bizonylatok
                  </h4>
                  <RelatedDocsList docs={result.relatedDocuments} />
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "14px 20px",
            borderTop: `1px solid ${colors.border.subtle}`,
            backgroundColor: colors.bg.card,
            gap: "12px",
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={confirming}>
            Mégse
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!result?.canProceed || confirming || loading}
          >
            {confirming ? "Feldolgozás…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
