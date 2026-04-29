"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { Shield } from "lucide-react";

export default function WorklogPrintPage() {
  const params = useParams();
  const id = params.id as string;

  // Auto-print after 1 second (allows fonts/styles to load)
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
            Azonosító: WL-2026-0089
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
            Szolgáltató
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
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#333" }}>
            Tel: +36 1 234 5678
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
            Megrendelő (Partner)
          </h3>
          <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600 }}>
            Acme Corporation Zrt.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            2040 Budaörs, Gyár u. 2.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>
            Kapcsolattartó: Kovács János
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#333" }}>
            Projekt: Központi hálózat fejlesztés
          </p>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div style={{ marginBottom: "40px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          Elvégzett feladatok leírása
        </h3>
        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #eaeaea",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#333",
          }}
        >
          Az Acme Corp. központi irodájában elvégeztük az 1. emeleti szerver rack
          áthelyezését és az új switchek (2 db Cisco Meraki) konfigurálását. A hálózat
          kábelezésének ellenőrzése megtörtént, a portok patch-elése a terveknek
          megfelelően lezajlott. Üzempróba sikeres, a hálózat stabil.
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div style={{ marginBottom: "50px" }}>
        <h3
          style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px", color: "#000" }}
        >
          Felhasznált anyagok és szolgáltatások
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #333" }}>
              <th style={{ padding: "10px", textAlign: "left", width: "40%" }}>
                Megnevezés
              </th>
              <th style={{ padding: "10px", textAlign: "center", width: "15%" }}>
                Egység
              </th>
              <th style={{ padding: "10px", textAlign: "right", width: "15%" }}>
                Mennyiség
              </th>
              <th style={{ padding: "10px", textAlign: "right", width: "30%" }}>
                Megjegyzés
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px", color: "#000" }}>
                Helyszíni munkadíj (Hálózatépítés)
              </td>
              <td style={{ padding: "10px", textAlign: "center", color: "#333" }}>óra</td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: "#333",
                  fontWeight: 600,
                }}
              >
                4.5
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: "#666",
                  fontSize: "12px",
                }}
              >
                2 technikus
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px", color: "#000" }}>Kiszállási díj (Budaörs)</td>
              <td style={{ padding: "10px", textAlign: "center", color: "#333" }}>
                alkalom
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: "#333",
                  fontWeight: 600,
                }}
              >
                1
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: "#666",
                  fontSize: "12px",
                }}
              >
                Gépjármű: ABC-123
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "10px", color: "#000" }}>
                UTP Cat6 Patch kábel (2m)
              </td>
              <td style={{ padding: "10px", textAlign: "center", color: "#333" }}>db</td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: "#333",
                  fontWeight: 600,
                }}
              >
                24
              </td>
              <td
                style={{
                  padding: "10px",
                  textAlign: "right",
                  color: "#666",
                  fontSize: "12px",
                }}
              >
                Szerver patch
              </td>
            </tr>
          </tbody>
        </table>
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
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
            SIRONIC IT Services Kft.
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
            Szolgáltató képviselője
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
            Megrendelő képviselője
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          marginTop: "60px",
          paddingTop: "20px",
          borderTop: "1px solid #eaeaea",
          textAlign: "center",
          fontSize: "11px",
          color: "#999",
        }}
      >
        A munkalap elektronikus formában készült a SIRONIC IntraSystem rendszerből. Az
        aláírással a Megrendelő igazolja a feltüntetett munkák és anyagok teljesítését.
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
