"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { Button } from "./Button";
import { generatePdfFromElement } from "../lib/pdf-generator";

export interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onDownload?: (paperEl: HTMLElement | null) => void | Promise<void>;
  filename?: string;
  title?: string;
  children: React.ReactNode;
}

export function PdfPreviewModal({
  open,
  onClose,
  onDownload,
  filename = "dokumentum.pdf",
  title = "Dokumentum előnézet",
  children,
}: PdfPreviewModalProps) {
  const paperRef = React.useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = React.useState(false);

  if (!open) return null;

  const handleDownloadClick = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (onDownload) {
        await onDownload(paperRef.current);
      } else if (paperRef.current) {
        await generatePdfFromElement(paperRef.current, filename);
      }
    } catch (err) {
      console.error("PDF letöltési hiba:", err);
      alert("Hiba történt a PDF generálása során.");
    } finally {
      setDownloading(false);
    }
  };

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
          maxWidth: "920px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: colors.bg.card || "#1e293b",
          border: `1px solid ${colors.border.subtle || "#334155"}`,
          borderRadius: radius.lg || "8px",
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
            borderBottom: `1px solid ${colors.border.subtle || "#334155"}`,
            backgroundColor: colors.bg.card || "#0f172a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.25rem" }}>📄</span>
            <h3
              style={{
                margin: 0,
                fontSize: "1.125rem",
                fontWeight: 700,
                color: colors.text.primary || "#f8fafc",
              }}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Bezárás"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: colors.text.secondary || "#94a3b8",
              fontSize: "1.25rem",
              lineHeight: 1,
              padding: "6px 10px",
              borderRadius: radius.sm || "4px",
              transition: "background-color 0.2s",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Preview Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            backgroundColor: "#0f172a",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            ref={paperRef}
            style={{
              width: "210mm",
              maxWidth: "100%",
              backgroundColor: "#ffffff",
              color: "#000000",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            {children}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: `1px solid ${colors.border.subtle || "#334155"}`,
            backgroundColor: colors.bg.card || "#0f172a",
          }}
        >
          <span
            style={{
              fontSize: "0.875rem",
              color: colors.text.muted || "#64748b",
            }}
          >
            Nyomtatási A4 elrendezés
          </span>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button variant="secondary" onClick={onClose} disabled={downloading}>
              Bezárás
            </Button>
            <Button
              variant="primary"
              onClick={handleDownloadClick}
              disabled={downloading}
            >
              {downloading ? "PDF generálása…" : "📥 Letöltés (PDF)"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
