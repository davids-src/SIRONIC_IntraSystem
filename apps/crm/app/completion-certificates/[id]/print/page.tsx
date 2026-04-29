"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { Shield } from "lucide-react";

export default function CertificatePrintPage() {
  const params = useParams();
  const id = params.id as string;

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
        fontFamily: "'Inter', sans-serif",
        color: "#000",
        backgroundColor: "#fff",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
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
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#000",
              color: "#fff",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={24} />
          </div>
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
            Teljesítési Igazolás
          </h2>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#000",
            }}
          >
            Azonosító: CERT-2026-0042
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            Kelt: {new Date().toLocaleDateString("hu-HU")}
          </p>
        </div>
      </div>

      {/* PARTIES */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "40px",
          gap: "40px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "12px",
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
              borderBottom: "1px solid #eee",
              paddingBottom: "4px",
            }}
          >
            Szolgáltató / Kivitelező
          </h3>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600 }}>
            SIRONIC IT Services Kft.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            1111 Budapest, Minta utca 12.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            Adószám: 12345678-2-41
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "12px",
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
              borderBottom: "1px solid #eee",
              paddingBottom: "4px",
            }}
          >
            Megrendelő
          </h3>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600 }}>
            Acme Corporation Zrt.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            2040 Budaörs, Gyár u. 2.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            Adószám: 87654321-2-11
          </p>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div style={{ marginBottom: "40px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          1. A teljesítés tárgya és leírása
        </h3>
        <div
          style={{ padding: "16px 0", fontSize: "13px", lineHeight: 1.6, color: "#222" }}
        >
          Alulírott felek igazolják, hogy a Szolgáltató az{" "}
          <strong>Acme Központi hálózat fejlesztés</strong> projekt keretében foglalt
          vállalásait – a felek által elfogadott ütemtervnek és minőségi követelményeknek
          megfelelően – hiánytalanul teljesítette. A teljesítés magában foglalja az
          eszközök beszerzését, telepítését, valamint a hálózat konfigurálását és
          tesztelését a 2026. március hónapra vonatkozó fázisban.
        </div>
      </div>

      {/* SUMMARY */}
      <div style={{ marginBottom: "40px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          2. Teljesítés adatai
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
              <td style={{ padding: "12px 8px", color: "#666" }}>
                Hivatkozott Árajánlat / Szerződés:
              </td>
              <td style={{ padding: "12px 8px", color: "#000", fontWeight: 600 }}>
                #P-2026-018
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px 8px", color: "#666" }}>
                Teljesítés ideje (készre jelentés):
              </td>
              <td style={{ padding: "12px 8px", color: "#000", fontWeight: 600 }}>
                2026. április 25.
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee", backgroundColor: "#f9f9f9" }}>
              <td style={{ padding: "12px 8px", color: "#000", fontWeight: 700 }}>
                Teljesítési nettó érték:
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

      {/* CLAUSE */}
      <div
        style={{ marginBottom: "50px", fontSize: "12px", color: "#555", lineHeight: 1.5 }}
      >
        A Megrendelő jelen igazolás aláírásával elismeri a teljesítés tényét és
        hibátlanságát, továbbá hozzájárul a Szolgáltató részéről a fent említett összegről
        szóló számla kiállításához. A jótállási és garanciális feltételeket a felek
        közötti fővállalkozói szerződés szabályozza.
      </div>

      {/* SIGNATURES */}
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
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Kovács Péter</p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            SIRONIC IT Services Kft.
          </p>
          <p style={{ margin: 0, fontSize: "11px", color: "#999", marginTop: "4px" }}>
            Kelt: Budapest, 2026.04.29.
          </p>
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
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            Megrendelő (Cégszerű aláírás)
          </p>
          <p style={{ margin: 0, fontSize: "11px", color: "#999", marginTop: "4px" }}>
            Kelt: ................................, 2026......
          </p>
        </div>
      </div>

      {/* Global styles for printing */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          @page { size: A4; margin: 0; }
        }
      `,
        }}
      />
    </div>
  );
}
