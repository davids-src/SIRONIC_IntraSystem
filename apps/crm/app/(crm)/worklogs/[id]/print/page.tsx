"use client";
import React, { useEffect } from "react";
import { useParams } from "next/navigation";

export default function WorklogPrintPage() {
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
              fontSize: "28px",
              fontWeight: 300,
              color: "#333",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Munkalap
          </h2>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#000",
            }}
          >
            Azonos�t�: WL-2026-0089
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
            Szolg�ltat�
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
            Kapcsolattart�: Kov�cs J�nos
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "40px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          Elv�gzett feladatok
        </h3>
        <div
          style={{
            padding: "12px",
            borderLeft: "3px solid #e53935",
            backgroundColor: "#fff5f5",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#333",
          }}
        >
          Az Acme Corp. k�zponti irod�j�ban elv�gezt�k az 1. emeleti szerver rack
          �thelyez�s�t �s az �j switchek konfigur�l�s�t. �zempr�ba sikeres, a h�l�zat
          stabil.
        </div>
      </div>

      <div style={{ marginBottom: "50px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          Felhaszn�lt t�telek
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #333" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>Megnevez�s</th>
              <th style={{ padding: "10px", textAlign: "center", width: "15%" }}>
                M.egys.
              </th>
              <th style={{ padding: "10px", textAlign: "right", width: "15%" }}>
                Menny.
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "10px", color: "#000" }}>Helysz�ni munkad�j</td>
              <td style={{ padding: "10px", textAlign: "center" }}>�ra</td>
              <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>
                4.5
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "10px", color: "#000" }}>Kisz�ll�si d�j</td>
              <td style={{ padding: "10px", textAlign: "center" }}>alk.</td>
              <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>1</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "10px", color: "#000" }}>
                UTP Cat6 Patch k�bel (2m)
              </td>
              <td style={{ padding: "10px", textAlign: "center" }}>db</td>
              <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>24</td>
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
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Szolg�ltat�</p>
        </div>
        <div style={{ width: "40%", textAlign: "center" }}>
          <div
            style={{
              borderBottom: "1px solid #000",
              height: "40px",
              marginBottom: "10px",
            }}
          ></div>
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
