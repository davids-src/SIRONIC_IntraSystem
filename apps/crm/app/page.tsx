"use client";

import * as React from "react";
import { StatCard, PageHeader, Card } from "@crm/ui";
import { hasPermission } from "@crm/rbac";
import { CrmShell } from "./crm-shell";

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

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  description: string;
  time: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: "1",
    icon: <IconBuilding2 />,
    description: "Új szervezet hozzáadva: Acme Kft.",
    time: "2 perce",
  },
  {
    id: "2",
    icon: <IconFileText />,
    description: "Ajánlat elküldve: #A-2024-042",
    time: "18 perce",
  },
  {
    id: "3",
    icon: <IconHandshake />,
    description: "Partner aktiválva: GlobalTech Zrt.",
    time: "1 órája",
  },
  {
    id: "4",
    icon: <IconPackage />,
    description: "Készlet frissítve: 12 tétel módosítva",
    time: "3 órája",
  },
];

export default function CrmDashboardPage() {
  const canViewOrganizations = hasPermission(
    { actorId: "seed-admin", roleKeys: ["crm.admin"], tenantId: "global" },
    { module: "organization", action: "view", scope: "global" },
  );

  return (
    <CrmShell>
      <PageHeader
        title="Vezérlőpult"
        subtitle={`Rendszergazda nézet · Szervezetek: ${canViewOrganizations ? "✓ elérhető" : "✗ nincs hozzáférés"}`}
      />

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard label="Szervezetek" value="24" icon={<IconBuilding2 />} trend="+2" />
        <StatCard label="Partnerek" value="138" icon={<IconHandshake />} trend="+5" />
        <StatCard label="Készletelemek" value="1 204" icon={<IconPackage />} />
        <StatCard label="Aktív ajánlatok" value="17" icon={<IconFileText />} trend="+3" />
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
    </CrmShell>
  );
}
