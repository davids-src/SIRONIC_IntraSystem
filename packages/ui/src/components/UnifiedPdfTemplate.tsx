import React from "react";
import type { Contact, CompanyDetails } from "@crm/types";

export interface UnifiedPdfTemplateProps {
  documentTitle: string; // e.g. "Munkalap" or "Teljesítési igazolás"
  documentId: string; // e.g. "WL-2026-0089"
  date: Date;
  provider: CompanyDetails | null;
  client: Contact | null;
  children: React.ReactNode;
  showSignatures?: boolean;
}

export function UnifiedPdfTemplate({
  documentTitle,
  documentId,
  date,
  provider,
  client,
  children,
  showSignatures = true,
}: UnifiedPdfTemplateProps) {
  // Safe getters for address
  const clientAddress = client?.address
    ? `${client.address.zip || ""} ${client.address.city || ""}, ${client.address.street || ""}`.trim()
    : "—";

  return (
    <div
      className="pdf-container"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "20mm",
        margin: "0 auto",
        backgroundColor: "#fff",
        color: "#000",
        fontFamily: "Inter, sans-serif",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "2px solid #000",
          paddingBottom: "15px",
          marginBottom: "25px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ height: "40px", objectFit: "contain" }}
            onError={(e) => {
              // Ha nincs logo.png
              e.currentTarget.style.display = "none";
            }}
          />
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
              }}
            >
              {provider?.name?.toUpperCase() || "SZOLGÁLTATÓ"}
            </h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#666", fontWeight: 600 }}>
              HIVATALOS DOKUMENTUM
            </p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 300,
              color: "#333",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {documentTitle}
          </h2>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#000",
            }}
          >
            Azonosító: {documentId}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#666" }}>
            Kelt: {new Date(date).toLocaleDateString("hu-HU")}
          </p>
        </div>
      </div>

      {/* Cégek adatai */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
          gap: "30px",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
            border: "1px solid #e9ecef",
          }}
        >
          <h3
            style={{
              fontSize: "11px",
              color: "#6c757d",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
              margin: 0,
            }}
          >
            Szolgáltató
          </h3>
          <p style={{ margin: "6px 0 4px", fontSize: "14px", fontWeight: 700 }}>
            {provider?.name || "Nincs név megadva"}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>
            Székhely: {provider?.headquarters || "—"}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>
            Adószám: {provider?.tax_number || "—"}
          </p>
          {provider?.registration_number && (
            <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>
              Cégj. szám: {provider.registration_number}
            </p>
          )}
          {provider?.bank_account && (
            <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>
              Bankszámla: {provider.bank_account}
            </p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#333" }}>
            E-mail: {provider?.email || "—"} | Tel: {provider?.phone || "—"}
          </p>
        </div>

        <div
          style={{
            flex: 1,
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
            border: "1px solid #e9ecef",
          }}
        >
          <h3
            style={{
              fontSize: "11px",
              color: "#6c757d",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
              margin: 0,
            }}
          >
            Megrendelő
          </h3>
          <p style={{ margin: "6px 0 4px", fontSize: "14px", fontWeight: 700 }}>
            {client?.name || "Nincs név megadva"}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>
            Cím: {clientAddress}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>
            Adószám: {client?.tax_number || "—"}
          </p>
          {client?.registration_number && (
            <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>
              Cégj. szám: {client.registration_number}
            </p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#333" }}>
            E-mail: {client?.email || "—"} | Tel: {client?.phone || "—"}
          </p>
        </div>
      </div>

      {/* Fő tartalom (Munkalap tételek, leírás, stb.) */}
      <div style={{ minHeight: "200px" }}>{children}</div>

      {/* Aláírások */}
      {showSignatures && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "60px",
            pageBreakInside: "avoid",
          }}
        >
          <div style={{ width: "40%", textAlign: "center" }}>
            <div
              style={{
                borderBottom: "1px solid #000",
                height: "40px",
                marginBottom: "8px",
              }}
            ></div>
            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
              Szolgáltató (aláírás, pecsét)
            </p>
          </div>
          <div style={{ width: "40%", textAlign: "center" }}>
            <div
              style={{
                borderBottom: "1px solid #000",
                height: "40px",
                marginBottom: "8px",
              }}
            ></div>
            <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
              Megrendelő (aláírás, pecsét)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
