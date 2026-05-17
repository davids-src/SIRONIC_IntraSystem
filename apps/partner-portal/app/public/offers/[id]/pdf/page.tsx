"use client";

import { UnifiedPdfTemplate } from "@crm/ui";
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
      const element = printRef.current;
      element.style.display = "block";

      import("html2pdf.js").then((html2pdfModule) => {
        const html2pdf = html2pdfModule.default;
        const opt = {
          margin: 0,
          filename: `Arajanlat_${data.offer.offer_number}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: {
            unit: "mm" as const,
            format: "a4" as const,
            orientation: "portrait" as const,
          },
        };
        html2pdf()
          .from(element)
          .set(opt)
          .save()
          .then(() => {
            element.style.display = "none";
          })
          .catch((e: any) => {
            console.error("PDF hiba", e);
            element.style.display = "none";
          });
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
  const totalNet = offer.lines.reduce((sum, l) => sum + l.net_unit_price * l.quantity, 0);
  const totalVat = offer.lines.reduce(
    (sum, l) => sum + l.net_unit_price * l.quantity * (l.tax_rate / 100),
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
      <div style={{ display: "none", textAlign: "left" }} ref={printRef}>
        <UnifiedPdfTemplate
          documentTitle="ÁRAJÁNLAT"
          documentId={offer.offer_number}
          date={new Date(offer.created_at)}
          provider={provider}
          client={contact}
          showSignatures={false}
        >
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>
              {offer.title}
            </h3>
            {offer.notes && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "20px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {offer.notes}
              </p>
            )}
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              marginBottom: "30px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #000" }}>
                <th style={{ textAlign: "left", padding: "8px" }}>Megnevezés</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Mennyiség</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Nettó egységár</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Nettó összesen</th>
              </tr>
            </thead>
            <tbody>
              {offer.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{l.description}</td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    {l.quantity} {l.unit}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    {fmt(l.net_unit_price)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    {fmt(l.quantity * l.net_unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ width: "250px", marginLeft: "auto", fontSize: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>Nettó összesen:</span>
              <span>{fmt(totalNet)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>ÁFA:</span>
              <span>{fmt(totalVat)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "14px",
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "2px solid #000",
              }}
            >
              <span>Fizetendő:</span>
              <span>{fmt(offer.total_amount)}</span>
            </div>
          </div>
        </UnifiedPdfTemplate>
      </div>
    </div>
  );
}
