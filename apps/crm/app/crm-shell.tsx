"use client";

import * as React from "react";
import { AppShell } from "@crm/ui";
import type { NavItem, SidebarUser } from "@crm/ui";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Handshake,
  Tag,
  FileText,
  Settings,
  ShieldCheck,
  Ticket,
  ClipboardList,
  BadgeCheck,
  FolderKanban,
  FileSignature,
  Receipt,
  Truck,
  ShoppingCart,
  Users,
  FileOutput,
} from "lucide-react";

const crmNavItems: NavItem[] = [
  {
    key: "dashboard",
    label: "Vezérlőpult",
    href: "/",
    icon: <LayoutDashboard size={16} />,
  },
  {
    key: "partners",
    label: "Partnerek",
    href: "/partners",
    icon: <Handshake size={16} />,
  },
  {
    key: "projects",
    label: "Projektek",
    href: "/projects",
    icon: <FolderKanban size={16} />,
  },
  { key: "tickets", label: "Ticketek", href: "/tickets", icon: <Ticket size={16} /> },
  {
    key: "worklogs",
    label: "Munkalapok",
    href: "/worklogs",
    icon: <ClipboardList size={16} />,
  },
  {
    key: "contracts",
    label: "Szerződések",
    href: "/contracts",
    icon: <FileSignature size={16} />,
  },
  { key: "offers", label: "Ajánlatok", href: "/offers", icon: <FileText size={16} /> },
  {
    key: "invoices",
    label: "Számlák",
    href: "/invoices",
    icon: <Receipt size={16} />,
  },
  {
    key: "completion_certificates",
    label: "Teljesítési igazolások",
    href: "/completion-certificates",
    icon: <BadgeCheck size={16} />,
  },
  { key: "price-list", label: "Árlista", href: "/price-list", icon: <Tag size={16} /> },
  {
    key: "inventory",
    label: "Raktár",
    href: "/inventory",
    icon: <ShoppingCart size={16} />,
  },
  {
    key: "delivery-notes",
    label: "Szállítólevelek",
    href: "/delivery-notes",
    icon: <FileOutput size={16} />,
  },
  {
    key: "suppliers",
    label: "Beszállítók",
    href: "/suppliers",
    icon: <Truck size={16} />,
  },
  {
    key: "purchase-orders",
    label: "Megrendelőlapok",
    href: "/purchase-orders",
    icon: <ShoppingCart size={16} />,
  },
  { key: "team", label: "Munkatársak", href: "/team", icon: <Users size={16} /> },
  {
    key: "settings",
    label: "Beállítások",
    href: "/settings",
    icon: <Settings size={16} />,
  },
];

export function CrmShell({
  children,
  sidebarUser,
}: {
  children: React.ReactNode;
  sidebarUser: SidebarUser;
}) {
  const pathname = usePathname() || "";

  if (pathname.endsWith("/print")) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#fff" }}>{children}</div>;
  }

  return (
    <AppShell
      sidebar={{
        appName: "SIRONIC CRM",
        appIcon: <ShieldCheck size={20} />,
        navItems: crmNavItems,
        currentPath: "",
        user: sidebarUser,
      }}
      topbar={{
        breadcrumb: "SIRONIC CRM",
        notificationCount: 0,
        userInitials: sidebarUser.avatarInitials,
        userMenuItems: [
          { label: "Profil", onClick: () => {} },
          { label: "Beállítások", onClick: () => {} },
          {
            label: "Kijelentkezés",
            onClick: () => {
              void signOut({ callbackUrl: "/login" });
            },
          },
        ],
      }}
    >
      {children}
    </AppShell>
  );
}
