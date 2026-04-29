"use client";

import * as React from "react";
import { StatCard, PageHeader, Card, Button } from "@crm/ui";
import { hasPermission } from "@crm/rbac";
import { CrmShell } from "./crm-shell";
import { useRouter } from "next/navigation";

// Inline icons
function IconBuilding2() {
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
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
function IconHandshake() {
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
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </svg>
  );
}
function IconPackage() {
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
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
function IconFileText() {
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
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
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
    description: "Új ticket érkezett: Szerver leállás a központi irodában (Acme Kft.)",
    time: "12 perce",
  },
  {
    id: "2",
    icon: <IconBadgeCheck />,
    description: "Teljesítési igazolás aláírva (GlobalTech Zrt.)",
    time: "45 perce",
  },
  {
    id: "3",
    icon: <IconClipboard />,
    description: "Munkalap véglegesítve: WL-000001 (Kovács János)",
    time: "1 órája",
  },
  {
    id: "4",
    icon: <IconBuilding2 />,
    description: "Új szervezet hozzáadva: Acme Kft.",
    time: "3 órája",
  },
];

export default function CrmDashboardPage() {
  const router = useRouter();
  const canViewOrganizations = hasPermission(
    { actorId: "seed-admin", roleKeys: ["crm.admin"], tenantId: "global" },
    { module: "contact", action: "view", scope: "global" },
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Vezérlőpult"
        subtitle={`Rendszergazda nézet · Kontaktok: ${canViewOrganizations ? "✓ elérhető" : "✗ nincs hozzáférés"}`}
        actions={
          <Button variant="primary" onClick={() => router.push("/worklogs/new?quick=1")}>
            ⚡ Gyors munkalap
          </Button>
        }
      />

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard label="Nyitott ticketek" value="12" icon={<IconTicket />} trend="+3" />
        <StatCard
          label="Aktív projektek"
          value="8"
          icon={<IconFolderKanban />}
          trend="+1"
        />
        <StatCard
          label="Mai munkalapok"
          value="48"
          icon={<IconClipboard />}
          trend="+12"
        />
        <StatCard
          label="Aláírásra váró igazolások"
          value="3"
          icon={<IconBadgeCheck />}
          trend="+2"
        />
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
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

      {/* Upcoming Deadlines */}
      <Card>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            marginBottom: "16px",
          }}
        >
          Közelgő határidők
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
                Projekt - Acme Kft.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.875rem", color: "#ffffff" }}>2026.05.25.</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#e53935",
                  background: "#3b0a0a",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                12 nap
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
                acme.hu lejárat
              </div>
              <div style={{ fontSize: "0.75rem", color: "#555555" }}>
                Domain - Acme Kft.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.875rem", color: "#ffffff" }}>2026.05.11.</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#e53935",
                  background: "#3b0a0a",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                Kritikus
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
