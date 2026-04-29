"use client";

import * as React from "react";
import { AppShell } from "@crm/ui";
import type { NavItem, SidebarUser } from "@crm/ui";

import {
  LayoutDashboard,
  Users,
  Tag,
  FileText,
  Settings,
  ShieldCheck,
  Ticket,
  ClipboardList,
  BadgeCheck,
  FolderKanban,
} from "lucide-react";

const crmNavItems: NavItem[] = [
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
  {
    key: "projects",
    label: "Projektek",
    href: "/projects",
    icon: <FolderKanban size={16} />,
  },
  {
    key: "contacts",
    label: "Kontaktok",
    href: "/contacts",
    icon: <Users size={16} />,
  },
  { key: "price-list", label: "Árlista", href: "/price-list", icon: <Tag size={16} /> },
  { key: "offers", label: "Ajánlatok", href: "/offers", icon: <FileText size={16} /> },
  {
    key: "completion_certificates",
    label: "Teljesítési igazolások",
    href: "/completion-certificates",
    icon: <BadgeCheck size={16} />,
  },
  {
    key: "settings",
    label: "Beállítások",
    href: "/settings",
    icon: <Settings size={16} />,
  },
];

const seedUser: SidebarUser = {
  name: "Admin",
  role: "CRM Adminisztrátor",
  avatarInitials: "AD",
};

export function CrmShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={{
        appName: "SIRONIC CRM",
        appIcon: <ShieldCheck size={20} />,
        navItems: crmNavItems,
        currentPath: "",
        user: seedUser,
      }}
      topbar={{
        breadcrumb: "SIRONIC CRM",
        notificationCount: 3,
        userInitials: "AD",
        userMenuItems: [
          { label: "Profil", onClick: () => {} },
          { label: "Beállítások", onClick: () => {} },
          { label: "Kijelentkezés", onClick: () => {} },
        ],
      }}
    >
      {children}
    </AppShell>
  );
}
