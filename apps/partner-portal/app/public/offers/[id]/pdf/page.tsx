"use client";

import { UnifiedPdfTemplate, generatePdfFromElement, OfferLinesTable } from "@crm/ui";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Offer, Contact, CompanyDetails } from "@crm/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

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

          <OfferLinesTable lines={offer.lines} />

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
