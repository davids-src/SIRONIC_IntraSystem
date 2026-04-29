"use client";

import * as React from "react";
import { AppShell } from "@crm/ui";
import type { NavItem, SidebarUser } from "@crm/ui";

import {
  LayoutDashboard,
  Building2,
  Tag,
  Settings,
  ShieldCheck,
  Ticket,
  ClipboardList,
  BadgeCheck,
  FolderKanban,
} from "lucide-react";

const allPartnerNavItems: NavItem[] = [
  {
    key: "dashboard",
    label: "Vezérlőpult",
    href: "/",
    icon: <LayoutDashboard size={16} />,
  },
  { key: "tickets", label: "Ticketek", href: "/tickets", icon: <Ticket size={16} /> },
  {
    key: "worklogs",
    label: "Munkalapok",
    href: "/worklogs",
    icon: <ClipboardList size={16} />,
  },
  { key: "offers", label: "Ajánlatok", href: "/offers", icon: <Tag size={16} /> },
  {
    key: "completion_certificates",
    label: "Teljesítési igazolások",
    href: "/completion-certificates",
    icon: <BadgeCheck size={16} />,
  },
  {
    key: "projects",
    label: "Projektjeim",
    href: "/projects",
    icon: <FolderKanban size={16} />,
  },
  {
    key: "company-profile",
    label: "Cégprofil",
    href: "/company-profile",
    icon: <Building2 size={16} />,
  },
  {
    key: "settings",
    label: "Beállítások",
    href: "/settings",
    icon: <Settings size={16} />,
  },
];

// Mocking organization portal permissions
const mockPortalPermissions = {
  menu_tickets: true,
  menu_worklogs: true,
  menu_offers: false, // Hidden for this org
  menu_completion_certificates: true,
  menu_projects: true,
  menu_company_profile: true,
  menu_settings: true,
};

const partnerNavItems = allPartnerNavItems.filter((item) => {
  if (item.key === "dashboard") return true;
  if (item.key === "tickets") return mockPortalPermissions.menu_tickets;
  if (item.key === "worklogs") return mockPortalPermissions.menu_worklogs;
  if (item.key === "offers") return mockPortalPermissions.menu_offers;
  if (item.key === "completion_certificates")
    return mockPortalPermissions.menu_completion_certificates;
  if (item.key === "projects") return mockPortalPermissions.menu_projects;
  if (item.key === "company-profile") return mockPortalPermissions.menu_company_profile;
  if (item.key === "settings") return mockPortalPermissions.menu_settings;
  return true;
});

const partnerUser: SidebarUser = {
  name: "Partner Felhasználó",
  role: "Partner Viewer",
  avatarInitials: "PF",
};

export function PartnerShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={{
        appName: "Partner Portal",
        appIcon: <ShieldCheck size={20} />,
        navItems: partnerNavItems,
        currentPath: "",
        user: partnerUser,
      }}
      topbar={{
        breadcrumb: "Partner Portal",
        notificationCount: 1,
        userInitials: "PF",
        userMenuItems: [
          { label: "Cégprofil", onClick: () => {} },
          { label: "Beállítások", onClick: () => {} },
          { label: "Kijelentkezés", onClick: () => {} },
        ],
      }}
    >
      {children}
    </AppShell>
  );
}
