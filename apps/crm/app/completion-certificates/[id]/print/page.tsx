"use client";
import React, { useEffect } from "react";
import { useParams } from "next/navigation";

export default function CertificatePrintPage() {
  const params = useParams();
  const id = params.id;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        maxWidth: "210mm",
        margin: "0 auto",
        padding: "20mm",
        fontFamily: "Inter, sans-serif",
        color: "#000",
        backgroundColor: "#fff",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "2px solid #000",
          paddingBottom: "20px",
          marginBottom: "30px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/logo.png"
            alt="Sironic Logo"
            style={{ height: "40px", objectFit: "contain" }}
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
              SIRONIC
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#666", fontWeight: 600 }}>
              INTRASYSTEM SERVICES
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
            Teljes�t�si Igazol�s
          </h2>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#000",
            }}
          >
            Azonos�t�: CERT-2026-0042
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            Kelt: {new Date().toLocaleDateString("hu-HU")}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "40px",
          gap: "40px",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "16px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
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
            }}
          >
            Kivitelez�
          </h3>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600 }}>
            Skoda D�vid Andr�s EV
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            Ad�sz�m: 46278854-1-27
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            Web: sironic.eu | Tel: +36702735532
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            E-mail: hello@sironic.hu
          </p>
        </div>
        <div
          style={{
            flex: 1,
            padding: "16px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
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
            }}
          >
            Megrendel�
          </h3>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600 }}>
            Acme Corporation Zrt.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            2040 Buda�rs, Gy�r u. 2.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            Ad�sz�m: 87654321-2-11
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "40px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          Teljes�t�s t�rgya
        </h3>
        <div
          style={{
            padding: "12px",
            borderLeft: "3px solid #22c55e",
            backgroundColor: "#f0fdf4",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#222",
          }}
        >
          A Kivitelez� az <strong>Acme K�zponti h�l�zat fejleszt�s</strong> projekt
          keret�ben v�llalt feladatokat hi�nytalanul teljes�tette.
        </div>
      </div>

      <div style={{ marginBottom: "40px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          Adatok
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px 8px", color: "#666", width: "40%" }}>
                Hivatkozott Munkalapok:
              </td>
              <td style={{ padding: "12px 8px", color: "#000", fontWeight: 600 }}>
                WL-2026-0089, WL-2026-0092
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px 8px", color: "#666" }}>Teljes�t�s ideje:</td>
              <td style={{ padding: "12px 8px", color: "#000", fontWeight: 600 }}>
                2026. �prilis 25.
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee", backgroundColor: "#f9f9f9" }}>
              <td style={{ padding: "12px 8px", color: "#000", fontWeight: 700 }}>
                Teljes�t�si nett� �rt�k:
              </td>
              <td
                style={{
                  padding: "12px 8px",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: "14px",
                }}
              >
                450 000 Ft
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{ display: "flex", justifyContent: "space-between", marginTop: "80px" }}
      >
        <div style={{ width: "40%", textAlign: "center" }}>
          <div
            style={{
              borderBottom: "1px solid #000",
              height: "40px",
              marginBottom: "10px",
            }}
          ></div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Kov�cs P�ter</p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Kivitelez�</p>
        </div>
        <div style={{ width: "40%", textAlign: "center" }}>
          <div
            style={{
              borderBottom: "1px solid #000",
              height: "40px",
              marginBottom: "10px",
            }}
          ></div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
            Acme Corporation Zrt.
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Megrendel�</p>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; } @page { size: A4; margin: 0; } }",
        }}
      />
    </div>
  );
}
