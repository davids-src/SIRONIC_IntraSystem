"use client";

import { UnifiedPdfTemplate, generatePdfFromElement } from "@crm/ui";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Offer, Contact, CompanyDetails } from "@crm/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

// ─── PDF tétel szekció helper ───────────────────────────────────────────────
function OfferLinesSection({ lines }: { lines: any[] }) {
  const tableHead = (
    <thead>
      <tr style={{ borderBottom: "2px solid #c41230", backgroundColor: "#f8fafc" }}>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Megnevezés
        </th>
        <th
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Menny.
        </th>
        <th
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Nettó egységár
        </th>
        <th
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Nettó összesen
        </th>
      </tr>
    </thead>
  );

  const renderRow = (l: any, i: number) => {
    const discountedPrice = l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
    return (
      <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
        <td style={{ padding: "7px 10px", fontWeight: 600, fontSize: "12px" }}>
          {l.description}
          {l.discount_percent ? (
            <span
              style={{
                marginLeft: "6px",
                color: "#16a34a",
                fontSize: "10px",
                fontWeight: 400,
              }}
            >
              (-{l.discount_percent}%)
            </span>
          ) : null}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "7px 10px",
            fontSize: "12px",
            whiteSpace: "nowrap",
          }}
        >
          {l.quantity} {l.unit}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "7px 10px",
            fontSize: "12px",
            whiteSpace: "nowrap",
          }}
        >
          {fmt(discountedPrice)}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "7px 10px",
            fontSize: "12px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {fmt(l.quantity * discountedPrice)}
        </td>
      </tr>
    );
  };

  const topLevel = lines.filter((l: any) => !l.group_id || l.is_group_parent);
  const products = topLevel.filter((l: any) => !l.line_type || l.line_type === "product");
  const services = topLevel.filter(
    (l: any) => l.line_type === "labor" || l.line_type === "service",
  );
  const hasProducts = products.length > 0;
  const hasServices = services.length > 0;
  const hasBoth = hasProducts && hasServices;

  const sectionLabel = (text: string) => (
    <tr>
      <td
        colSpan={4}
        style={{
          padding: "10px 10px 4px",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color: "#0f172a",
          borderBottom: "1px solid #0f172a33",
        }}
      >
        {text}
      </td>
    </tr>
  );

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "12px",
        marginBottom: "24px",
      }}
    >
      {tableHead}
      <tbody>
        {hasBoth ? (
          <>
            {sectionLabel("🔧 Termékek")}
            {products.map((l: any, i: number) => renderRow(l, i))}
            {sectionLabel("⚙️ Munkadíj / Szolgáltatások")}
            {services.map((l: any, i: number) => renderRow(l, i + products.length))}
          </>
        ) : hasProducts ? (
          <>
            {sectionLabel("🔧 Termékek")}
            {products.map((l: any, i: number) => renderRow(l, i))}
          </>
        ) : (
          <>
            {sectionLabel("⚙️ Munkadíj / Szolgáltatások")}
            {services.map((l: any, i: number) => renderRow(l, i))}
          </>
        )}
      </tbody>
    </table>
  );
}

export default function PublicOfferPdfDownloadPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [data, setData] = useState<{
    offer: Offer;
    contact: Contact | null;
    provider: CompanyDetails | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      setError("Hiányzó biztonsági azonosító (token).");
      return;
    }

    const ac = new AbortController();
    fetch(`/api/public/offers/${id}?token=${token}`, { signal: ac.signal })
      .then((res) => {
        if (!res.ok)
          throw new Error("Az ajánlat nem található vagy a token érvénytelen.");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => {
        if (!ac.signal.aborted) setError(err.message);
      });

    return () => ac.abort();
  }, [id, token]);

  useEffect(() => {
    if (data && printRef.current && !downloading) {
      setDownloading(true);
      generatePdfFromElement(
        printRef.current,
        `Arajanlat_${data.offer.offer_number}.pdf`,
      ).catch((e) => {
        console.error("PDF hiba", e);
      });
    }
  }, [data, downloading]);

  if (error) {
    return (
      <div
        style={{
          padding: "40px",
          fontFamily: "sans-serif",
          textAlign: "center",
          color: "#e53935",
        }}
      >
        <h2>Hiba történt</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          padding: "40px",
          fontFamily: "sans-serif",
          textAlign: "center",
          color: "#666",
        }}
      >
        <h2>Dokumentum betöltése...</h2>
        <p>Kérlek várj, az adatok betöltése folyamatban van.</p>
      </div>
    );
  }

  const { offer, contact, provider } = data;
  const totalNet = offer.lines.reduce(
    (sum, l) =>
      sum + l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100) * l.quantity,
    0,
  );
  const totalVat = offer.lines.reduce(
    (sum, l) =>
      sum +
      l.net_unit_price *
        (1 - (l.discount_percent ?? 0) / 100) *
        l.quantity *
        (l.tax_rate / 100),
    0,
  );

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "sans-serif",
        textAlign: "center",
        color: "#333",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          backgroundColor: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: "20px", marginBottom: "16px" }}>PDF Letöltése</h1>
        <p style={{ color: "#666", marginBottom: "24px" }}>
          Az árajánlat ({offer.offer_number}) letöltése automatikusan megkezdődött.
        </p>
        <p style={{ fontSize: "14px", color: "#888" }}>
          Ha a letöltés nem indul el, ellenőrizd a böngésződ beállításait. Be is zárhatod
          ezt az ablakot.
        </p>
      </div>

      {/* Hidden PDF Container */}
      <div
        ref={printRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0px",
          width: "210mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          textAlign: "left",
          zIndex: 99999,
        }}
      >
        <UnifiedPdfTemplate
          documentTitle="ÁRAJÁNLAT"
          documentId={offer.offer_number}
          date={new Date(offer.created_at)}
          validUntil={(offer as any).valid_until ?? null}
          provider={provider}
          client={contact}
          showSignatures={false}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                fontSize: "15px",
                marginBottom: "8px",
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              {offer.title}
            </h3>
            {offer.notes && (
              <p
                style={{
                  fontSize: "11px",
                  color: "#475569",
                  marginBottom: "16px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {offer.notes}
              </p>
            )}
          </div>

          <OfferLinesSection lines={offer.lines} />

          <div
            style={{
              width: "260px",
              marginLeft: "auto",
              fontSize: "12px",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                color: "#475569",
              }}
            >
              <span>Nettó összesen:</span>
              <span>{fmt(totalNet)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                color: "#475569",
              }}
            >
              <span>ÁFA (27%):</span>
              <span>{fmt(totalVat)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "14px",
                paddingTop: "8px",
                borderTop: "2px solid #c41230",
                color: "#0f172a",
              }}
            >
              <span>Fizetendő (bruttó):</span>
              <span style={{ color: "#c41230" }}>{fmt(totalNet + totalVat)}</span>
            </div>
          </div>
        </UnifiedPdfTemplate>
      </div>
    </div>
  );
}
