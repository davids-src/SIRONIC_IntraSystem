"use client";

import * as React from "react";
import { colors, radius } from "../tokens";
import { Button } from "./Button";

export interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  title?: string;
}

export function PdfViewerModal({
  open,
  onClose,
  pdfUrl,
  title = "Szerződés megtekintése",
}: PdfViewerModalProps) {
  if (!open) return null;

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
          maxWidth: "1000px",
          height: "92vh",
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

        {/* Viewer Body */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#2a2a2a",
            display: "flex",
          }}
        >
          <iframe
            src={`${pdfUrl}#toolbar=0`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title={title}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "14px 20px",
            borderTop: `1px solid ${colors.border.subtle || "#334155"}`,
            backgroundColor: colors.bg.card || "#0f172a",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <Button variant="secondary" onClick={onClose}>
              Bezárás
            </Button>
            <Button variant="primary" onClick={() => window.open(pdfUrl, "_blank")}>
              Letöltés
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
