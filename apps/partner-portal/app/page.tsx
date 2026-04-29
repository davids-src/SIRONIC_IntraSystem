"use client";

import * as React from "react";
import { StatCard, PageHeader, Card } from "@crm/ui";
import { hasPermission } from "@crm/rbac";
import { PartnerShell } from "./partner-shell";

function IconTag() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}
function IconFolderKanban() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M8 10v4" />
      <path d="M12 10v2" />
      <path d="M16 10v6" />
    </svg>
  );
}
function IconTicket() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
function IconBadgeCheck() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  description: string;
  time: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: "1",
    icon: <IconTicket />,
    description: "Új ticket beküldve: Kamera rendszer hiba",
    time: "32 perce",
  },
  {
    id: "2",
    icon: <IconBadgeCheck />,
    description: "Teljesítési igazolás vár aláírásra (Központi iroda)",
    time: "2 órája",
  },
  {
    id: "3",
    icon: <IconClipboard />,
    description: "Munkalap kiállítva (Kovács János technikus)",
    time: "1 napja",
  },
  {
    id: "4",
    icon: <IconTag />,
    description: "Új árajánlat érkezett: #P-2024-018",
    time: "2 napja",
  },
];

export default function PartnerDashboardPage() {
  const canViewOffers = hasPermission(
    { actorId: "partner-user", roleKeys: ["partner.viewer"], tenantId: "org-001" },
    {
      module: "offer",
      action: "view",
      scope: "contact",
      resourceTenantId: "org-001",
    },
  );

  return (
    <PartnerShell>
      <PageHeader
        title="Vezérlőpult"
        subtitle={`Partner nézet · Ajánlatok: ${canViewOffers ? "✓ elérhető" : "✗ nincs hozzáférés"}`}
      />

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Folyamatban lévő Ticketek"
          value="2"
          icon={<IconTicket />}
          trend="-1"
        />
        <StatCard label="Aktív Projektek" value="2" icon={<IconFolderKanban />} />
        <StatCard label="Elérhető Ajánlatok" value="8" icon={<IconTag />} trend="+2" />
        <StatCard label="Olvasatlan Értesítések" value="3" icon={<IconBell />} />
      </div>

      {/* Recent activity */}
      <Card>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            marginBottom: "16px",
          }}
        >
          Legutóbbi aktivitás
        </h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recentActivity.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 0",
                borderBottom:
                  idx < recentActivity.length - 1 ? "1px solid #1a1a1a" : "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#3b0a0a",
                  color: "#e53935",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                  {item.description}
                </div>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#555555",
                  whiteSpace: "nowrap",
                }}
              >
                {item.time}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Project Status */}
      <Card>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            marginBottom: "16px",
          }}
        >
          Projektek státusza
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 0",
              borderBottom: "1px solid #1a1a1a",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.875rem", color: "#ffffff", fontWeight: 500 }}>
                Új irodaház hálózatépítés
              </div>
              <div style={{ fontSize: "0.75rem", color: "#555555" }}>
                Aktuális fázis: Telepítés
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
            >
              <span style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                1/3 anyag feltöltve
              </span>
              <span style={{ fontSize: "0.75rem", color: "#555555" }}>
                Határidő: 2026.05.25.
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 0",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.875rem", color: "#ffffff", fontWeight: 500 }}>
                Céges weboldal megújítása
              </div>
              <div style={{ fontSize: "0.75rem", color: "#555555" }}>
                Aktuális fázis: Tervezés
              </div>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
            >
              <span style={{ fontSize: "0.875rem", color: "#ffffff" }}>
                0/5 anyag feltöltve
              </span>
              <span style={{ fontSize: "0.75rem", color: "#555555" }}>
                Határidő: 2026.06.20.
              </span>
            </div>
          </div>
        </div>
      </Card>
    </PartnerShell>
  );
}
