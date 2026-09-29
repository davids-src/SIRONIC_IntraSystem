"use client";

import * as React from "react";
import { AppShell } from "@crm/ui";
import type { NavItem, SidebarUser } from "@crm/ui";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { NotificationCenter } from "@/components/NotificationCenter";

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
  Calendar,
  Wrench,
  CheckSquare,
  Activity,
  Map,
  Settings2,
  Rocket,
  TrendingUp,
  Target,
} from "lucide-react";

const crmNavItems: NavItem[] = [
  // Kezdőlap
  {
    key: "dashboard",
    label: "Vezérlőpult",
    href: "/",
    icon: <LayoutDashboard size={16} />,
  },

  // Értékesítés
  {
    key: "leads",
    label: "Megkeresések & Leadek",
    href: "/leads",
    icon: <Target size={16} />,
    section: "Értékesítés",
  },
  {
    key: "offers",
    label: "Ajánlatok",
    href: "/offers",
    icon: <FileText size={16} />,
    section: "Értékesítés",
  },
  {
    key: "sales-dashboard",
    label: "Sales Dashboard",
    href: "/sales/dashboard",
    icon: <TrendingUp size={16} />,
    section: "Értékesítés",
  },

  // Ügyfelek
  {
    key: "partners",
    label: "Partnerek (360°)",
    href: "/partners",
    icon: <Handshake size={16} />,
    section: "Ügyfelek",
  },
  {
    key: "contracts",
    label: "Szerződések",
    href: "/contracts",
    icon: <FileSignature size={16} />,
    section: "Ügyfelek",
  },

  // Munkavégzés
  {
    key: "projects",
    label: "Projektek",
    href: "/projects",
    icon: <FolderKanban size={16} />,
    section: "Munkavégzés",
  },
  {
    key: "tickets",
    label: "Ticketek",
    href: "/tickets",
    icon: <Ticket size={16} />,
    section: "Munkavégzés",
  },
  {
    key: "worklogs",
    label: "Munkalapok",
    href: "/worklogs",
    icon: <ClipboardList size={16} />,
    section: "Munkavégzés",
  },
  {
    key: "weekly-plans",
    label: "Heti tervek",
    href: "/weekly-plans",
    icon: <Calendar size={16} />,
    section: "Munkavégzés",
  },
  {
    key: "checklists",
    label: "Checklisták",
    href: "/checklists",
    icon: <CheckSquare size={16} />,
    section: "Munkavégzés",
  },
  {
    key: "maintenance",
    label: "Karbantartás",
    href: "/maintenance",
    icon: <Activity size={16} />,
    section: "Munkavégzés",
  },

  // Kereskedelem / Logisztika
  {
    key: "price-list",
    label: "Termék Árlista",
    href: "/price-list",
    icon: <Tag size={16} />,
    section: "Kereskedelem & Raktár",
  },
  {
    key: "service-price-list",
    label: "Szolgáltatás Árlista",
    href: "/service-price-list",
    icon: <Settings2 size={16} />,
    section: "Kereskedelem & Raktár",
  },
  {
    key: "suppliers",
    label: "Beszállítók",
    href: "/suppliers",
    icon: <Truck size={16} />,
    section: "Kereskedelem & Raktár",
  },
  {
    key: "purchase-orders",
    label: "Megrendelőlapok",
    href: "/purchase-orders",
    icon: <ShoppingCart size={16} />,
    section: "Kereskedelem & Raktár",
  },
  {
    key: "inventory",
    label: "Raktárkészlet",
    href: "/inventory",
    icon: <ShoppingCart size={16} />,
    section: "Kereskedelem & Raktár",
  },
  {
    key: "delivery-notes",
    label: "Szállítólevelek",
    href: "/delivery-notes",
    icon: <FileOutput size={16} />,
    section: "Kereskedelem & Raktár",
  },

  // Pénzügy
  {
    key: "invoices",
    label: "Számlák",
    href: "/invoices",
    icon: <Receipt size={16} />,
    section: "Pénzügy",
  },
  {
    key: "completion_certificates",
    label: "Teljesítési igazolások",
    href: "/completion-certificates",
    icon: <BadgeCheck size={16} />,
    section: "Pénzügy",
  },

  // Eszközök & BIM
  {
    key: "tools",
    label: "Eszközök & Szerszámok",
    href: "/tools",
    icon: <Wrench size={16} />,
    section: "Eszközök & Létesítmény",
  },
  {
    key: "warranties",
    label: "Garanciák & Jótállás",
    href: "/warranties",
    icon: <ShieldCheck size={16} />,
    section: "Eszközök & Létesítmény",
  },
  {
    key: "deployments",
    label: "Kiszállások & Üzembehelyezés",
    href: "/deployments",
    icon: <Rocket size={16} />,
    section: "Eszközök & Létesítmény",
  },
  {
    key: "floorplans",
    label: "Alaprajzok & BIM",
    href: "/floorplans",
    icon: <Map size={16} />,
    section: "Eszközök & Létesítmény",
  },

  // Rendszer
  {
    key: "team",
    label: "Munkatársak",
    href: "/team",
    icon: <Users size={16} />,
    section: "Rendszer",
  },
  {
    key: "settings",
    label: "Beállítások",
    href: "/settings",
    icon: <Settings size={16} />,
    section: "Rendszer",
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
  const [notificationOpen, setNotificationOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  if (pathname.endsWith("/print")) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#fff" }}>{children}</div>;
  }

  return (
    <>
      <AppShell
        sidebar={{
          appName: "SIROTECH ERP",
          appIcon: <ShieldCheck size={20} className="text-red-500" />,
          navItems: crmNavItems,
          currentPath: pathname,
          user: sidebarUser,
        }}
        topbar={{
          breadcrumb: "SIROTECH ERP",
          notificationCount: unreadCount,
          onNotificationClick: () => setNotificationOpen((prev) => !prev),
          userInitials: sidebarUser.avatarInitials,
          userMenuItems: [
            { label: "Profil & Beállítások", onClick: () => {} },
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
      <NotificationCenter
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        onCountUpdate={setUnreadCount}
      />
      <SpotlightSearch />
    </>
  );
}
