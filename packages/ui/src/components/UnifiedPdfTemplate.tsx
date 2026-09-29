import React from "react";
import type { Contact, CompanyDetails } from "@crm/types";

export interface UnifiedPdfTemplateProps {
  documentTitle: string; // pl. "Ajánlat", "Munkalap", "Teljesítési igazolás", "Jótállási jegy", "Szállítólevél", "Megrendelőlap", "Szerződés"
  documentId: string; // pl. "AJ-2026-0001", "WL-2026-0089"
  date: Date | string;
  validUntil?: Date | string | null;
  provider: CompanyDetails | null;
  client: Contact | null;
  children: React.ReactNode;
  showSignatures?: boolean;
  providerSignerTitle?: string;
  clientSignerTitle?: string;
  footerNote?: string;
}

export function UnifiedPdfTemplate({
  documentTitle,
  documentId,
  date,
  validUntil,
  provider,
  client,
  children,
  showSignatures = true,
  providerSignerTitle = "Szolgáltató (aláírás, pecsét)",
  clientSignerTitle = "Megrendelő (aláírás, pecsét)",
  footerNote,
}: UnifiedPdfTemplateProps) {
  // Safe getters for address
  const rawAddress =
    typeof client?.address === "string"
      ? client.address
      : client?.address
        ? `${client.address.zip || ""} ${client.address.city || ""}, ${client.address.street || ""}`.trim()
        : "";

  const clientAddress = rawAddress.replace(/^,\s*|\s*,\s*$/g, "").trim() || "—";
  const brandName = provider?.display_brand || provider?.name || "SIROTECH";
  const legalName = provider?.legal_name || provider?.name || "SIROTECH Kft.";

  return (
    <div
      className="pdf-container sirotech-document-shell"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "16mm 18mm 20mm 18mm",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pdf-container {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
        }
        .sirotech-document-shell tr,
        .sirotech-document-shell table,
        .sirotech-document-shell p,
        .sirotech-document-shell h1,
        .sirotech-document-shell h2,
        .sirotech-document-shell h3,
        .sirotech-document-shell h4,
        .sirotech-document-shell .avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      `}</style>

      <div>
        {/* Document Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2px solid #c41230",
            paddingBottom: "14px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                backgroundColor: "#c41230",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 900,
                fontSize: "20px",
                letterSpacing: "-0.5px",
                flexShrink: 0,
              }}
            >
              S
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.5px",
                }}
              >
                {brandName.toUpperCase()}
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  color: "#64748b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {legalName} • Hivatalos bizonylat
              </p>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 700,
                color: "#c41230",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {documentTitle}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Iktatószám: {documentId}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
              Kelt: {new Date(date).toLocaleDateString("hu-HU")}
              {validUntil && (
                <> | Érvényes: {new Date(validUntil).toLocaleDateString("hu-HU")}</>
              )}
            </p>
          </div>
        </div>

        {/* Company and Partner Header Cards */}
        <div
          className="avoid-break"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          {/* Provider Card */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#f8fafc",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#c41230",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "4px",
              }}
            >
              Kiállító / Szolgáltató
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "2px",
              }}
            >
              {legalName}
            </div>
            <div style={{ color: "#334155" }}>
              Székhely: {provider?.headquarters || "8000 Székesfehérvár"}
            </div>
            <div style={{ color: "#334155" }}>
              Adószám: {provider?.tax_number || "—"}
              {provider?.registration_number
                ? ` | Cg.: ${provider.registration_number}`
                : ""}
            </div>
            {provider?.bank_account && (
              <div style={{ color: "#334155" }}>Bankszámla: {provider.bank_account}</div>
            )}
            <div style={{ color: "#334155", marginTop: "2px" }}>
              {provider?.email ? `E-mail: ${provider.email}` : ""}
              {provider?.phone ? ` | Tel: ${provider.phone}` : ""}
            </div>
          </div>

          {/* Client Card */}
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "#f8fafc",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "4px",
              }}
            >
              Partner / Megrendelő
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "2px",
              }}
            >
              {client?.name || "Nincs partner megadva"}
            </div>
            <div style={{ color: "#334155" }}>Cím: {clientAddress}</div>
            <div style={{ color: "#334155" }}>
              Adószám: {client?.tax_number || "—"}
              {client?.registration_number ? ` | Cg.: ${client.registration_number}` : ""}
            </div>
            <div style={{ color: "#334155", marginTop: "2px" }}>
              {client?.email ? `E-mail: ${client.email}` : ""}
              {client?.phone ? ` | Tel: ${client.phone}` : ""}
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div style={{ marginBottom: "30px" }}>{children}</div>
      </div>

      {/* Signatures & Standard Document Footer */}
      <div className="avoid-break" style={{ marginTop: "auto", paddingTop: "20px" }}>
        {showSignatures && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "40px",
              marginBottom: "30px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  borderBottom: "1px solid #94a3b8",
                  height: "45px",
                  marginBottom: "6px",
                }}
              />
              <p
                style={{ margin: 0, fontSize: "11px", color: "#64748b", fontWeight: 500 }}
              >
                {providerSignerTitle}
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  borderBottom: "1px solid #94a3b8",
                  height: "45px",
                  marginBottom: "6px",
                }}
              />
              <p
                style={{ margin: 0, fontSize: "11px", color: "#64748b", fontWeight: 500 }}
              >
                {clientSignerTitle}
              </p>
            </div>
          </div>
        )}

        {footerNote && (
          <div
            style={{
              fontSize: "10px",
              color: "#64748b",
              textAlign: "center",
              marginBottom: "12px",
              fontStyle: "italic",
            }}
          >
            {footerNote}
          </div>
        )}

        {/* Global Footer Bar */}
        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            paddingTop: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "10px",
            color: "#94a3b8",
          }}
        >
          <div>
            <strong>{legalName}</strong> • {provider?.website || "https://sirotech.hu"} •{" "}
            {provider?.email || "info@sirotech.hu"}
          </div>
          <div>
            Iktatószám: <strong>{documentId}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
