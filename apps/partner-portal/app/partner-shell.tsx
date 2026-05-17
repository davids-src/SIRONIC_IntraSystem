"use client";

import * as React from "react";
import { AppShell } from "@crm/ui";
import type { NavItem, SidebarUser } from "@crm/ui";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { Contact, PortalPermissions } from "@crm/types";
import type { Session } from "next-auth";
import { apiJson, ApiError } from "@/lib/api-client";

import {
  LayoutDashboard,
  Building2,
  FileText,
  Settings,
  ShieldCheck,
  Ticket,
  ClipboardList,
  BadgeCheck,
  FolderKanban,
  FileSignature,
  Receipt,
  Server,
} from "lucide-react";

const allPartnerNavItems: NavItem[] = [
  {
    key: "dashboard",
    label: "Vezérlőpult",
    href: "/",
    icon: <LayoutDashboard size={16} />,
  },
  {
    key: "projects",
    label: "Projektjeim",
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
    key: "inventory",
    label: "Leltár",
    href: "/inventory",
    icon: <Server size={16} />,
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

const defaultPerms: PortalPermissions = {
  menu_tickets: true,
  menu_worklogs: true,
  menu_offers: true,
  menu_completion_certificates: true,
  menu_projects: true,
  menu_contracts: true,
  menu_invoices: true,
  menu_company_profile: true,
  menu_settings: true,
};

function filterNav(perms: PortalPermissions) {
  return allPartnerNavItems.filter((item) => {
    if (item.key === "dashboard") return true;
    if (item.key === "projects") return perms.menu_projects;
    if (item.key === "tickets") return perms.menu_tickets;
    if (item.key === "worklogs") return perms.menu_worklogs;
    if (item.key === "inventory") return perms.menu_contracts;
    if (item.key === "contracts") return perms.menu_contracts;
    if (item.key === "offers") return perms.menu_offers;
    if (item.key === "invoices") return perms.menu_invoices;
    if (item.key === "completion_certificates") return perms.menu_completion_certificates;
    if (item.key === "company-profile") return perms.menu_company_profile;
    if (item.key === "settings") return perms.menu_settings;
    return true;
  });
}

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { data: session, status } = useSession();
  const [contact, setContact] = React.useState<Contact | null>(null);

  React.useEffect(() => {
    if (pathname.startsWith("/public") || pathname.startsWith("/set-password")) return;
    if (status === "unauthenticated" && pathname !== "/login") {
      router.replace("/login");
    }
  }, [status, pathname, router]);

  React.useEffect(() => {
    if (status !== "authenticated") return;
    const ac = new AbortController();
    (async () => {
      try {
        const c = await apiJson<Contact>("/api/me", { signal: ac.signal });
        setContact(c);
      } catch (e) {
        if (!ac.signal.aborted && e instanceof ApiError && e.status === 401) {
          await signOut({ redirect: false });
          router.replace("/login");
        }
      }
    })();
    return () => ac.abort();
  }, [status, router]);

  if (pathname.endsWith("/print")) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#fff" }}>{children}</div>;
  }

  if (
    pathname === "/login" ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/set-password")
  ) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted">
        Betöltés…
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const perms = contact?.portal_permissions ?? defaultPerms;
  const partnerNavItems = filterNav(perms);
  const sessionUser = session?.user as Session["user"] | undefined;
  const partnerUser: SidebarUser = {
    name: contact?.name ?? sessionUser?.name ?? "Partner",
    role: sessionUser?.roleKeys?.includes("partner.admin") ? "Partner Admin" : "Partner",
    avatarInitials: (contact?.name ?? sessionUser?.name ?? "P").slice(0, 2).toUpperCase(),
  };

  return (
    <AppShell
      sidebar={{
        appName: "SIRONIC Partner",
        appIcon: <ShieldCheck size={20} />,
        navItems: partnerNavItems,
        currentPath: "",
        user: partnerUser,
      }}
      topbar={{
        breadcrumb: "SIRONIC Partner",
        notificationCount: 0,
        userInitials: partnerUser.avatarInitials,
        userMenuItems: [
          { label: "Cégprofil", onClick: () => router.push("/company-profile") },
          {
            label: "Kijelentkezés",
            onClick: () => void signOut({ callbackUrl: "/login" }),
          },
        ],
      }}
    >
      {children}
    </AppShell>
  );
}
