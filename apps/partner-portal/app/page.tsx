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
function IconShoppingCart() {
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
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
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
    icon: <IconTag />,
    description: "Új ajánlat érkezett: #P-2024-018",
    time: "5 perce",
  },
  {
    id: "2",
    icon: <IconPackage />,
    description: "Készletelem frissítve: SW-ENT-001",
    time: "32 perce",
  },
  {
    id: "3",
    icon: <IconShoppingCart />,
    description: "Megrendelés leadva: #MR-2024-007",
    time: "2 órája",
  },
  {
    id: "4",
    icon: <IconBell />,
    description: "Értesítés: Ajánlat lejárata közeledik",
    time: "5 órája",
  },
];

export default function PartnerDashboardPage() {
  const canViewOffers = hasPermission(
    { actorId: "partner-user", roleKeys: ["partner.viewer"], tenantId: "org-001" },
    {
      module: "offer",
      action: "view",
      scope: "organization",
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
        <StatCard label="Elérhető ajánlatok" value="8" icon={<IconTag />} trend="+2" />
        <StatCard label="Készletelemek" value="342" icon={<IconPackage />} />
        <StatCard label="Nyitott megrendelések" value="3" icon={<IconShoppingCart />} />
        <StatCard label="Értesítések" value="1" icon={<IconBell />} />
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
    </PartnerShell>
  );
}
