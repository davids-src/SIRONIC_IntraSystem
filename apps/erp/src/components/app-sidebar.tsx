"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { signOut } from "next-auth/react";
import {
  BellIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ShieldIcon,
  ImagesIcon,
  PaletteIcon,
  TagsIcon,
  MailIcon,
  LogOutIcon,
  UserIcon,
  CircleHelpIcon,
  ListChecksIcon,
} from "lucide-react";
import { MEDIA_READ_PERMISSION_KEYS } from "@erp/media/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
  Button,
  Avatar,
  AvatarFallback,
  Skeleton,
  cn,
} from "@erp/ui";
import { getInitials } from "@erp/lib";
import { useAuth } from "@erp/auth/client";
import { useBranding } from "@/components/branding-provider";
import { SidebarNavGroup, type SidebarNavItem } from "@/components/sidebar-nav-group";
import { buildModuleNav } from "@/lib/navigation/modules";
import type { FeladatJelzes } from "@/lib/teendo";

type SidebarUser = {
  id: string;
  email: string;
  name: string;
  permissions: string[];
};

export function MenuItem({
  href,
  icon,
  label,
  onClick,
  tourId,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  tourId?: string;
  /** A coloured count on the right (e.g. open tasks); hidden at 0. */
  badge?: { count: number; className: string; title?: string };
}) {
  return (
    <SidebarMenuItem data-tour={tourId}>
      <Link
        href={href}
        onClick={onClick}
        title={badge && badge.count > 0 ? badge.title : undefined}
        className={cn(
          "bg-muted flex flex-row items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-300 hover:tracking-wider md:py-1",
        )}
      >
        {icon}
        <span className="flex-1">{label}</span>
        {badge && badge.count > 0 && (
          <span
            className={cn(
              "min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums leading-5",
              badge.className,
            )}
          >
            {badge.count > 99 ? "99+" : badge.count}
          </span>
        )}
      </Link>
    </SidebarMenuItem>
  );
}

/**
 * Status tones: danger when something is overdue, note (violet) when a colleague's task waits
 * for acceptance, else info.
 */
function feladatSzin(j: FeladatJelzes): { ikon: string; badge: string } {
  if (j.lejart > 0)
    return { ikon: "text-danger", badge: "bg-danger text-danger-foreground" };
  if (j.uj > 0) return { ikon: "text-note", badge: "bg-note text-note-foreground" };
  return { ikon: "text-info", badge: "bg-info text-info-foreground" };
}

export function AppSidebar({
  serverUser,
  feladatJelzes = { db: 0, lejart: 0, uj: 0 },
  jelzesOlvasatlan = 0,
}: {
  /** Unread Jelzések — the count on "Jelzések" (8l). */
  jelzesOlvasatlan?: number;
  serverUser?: SidebarUser;
  /** Open items waiting on the user — the coloured count on "Feladatok". */
  feladatJelzes?: FeladatJelzes;
}) {
  const { user: clientUser, isLoading } = useAuth();
  const user = serverUser ?? clientUser ?? null;
  const authLoading = isLoading && !user;
  const branding = useBranding();
  const { setOpenMobile } = useSidebar();

  const linkClick = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const hasPermission = (key: string) => user?.permissions.includes(key) ?? false;

  const adminItems = useMemo((): SidebarNavItem[] => {
    if (!hasPermission("admin:access")) return [];
    const items: SidebarNavItem[] = [];
    if (hasPermission("users:read")) {
      items.push({
        href: "/admin/users",
        icon: <UsersIcon className="h-4 w-4" />,
        label: "Felhasználók",
      });
    }
    if (hasPermission("roles:manage")) {
      items.push({
        href: "/admin/permissions",
        icon: <ShieldIcon className="h-4 w-4" />,
        label: "Szerepkörök",
      });
    }
    if (hasPermission("mail:manage")) {
      items.push({
        href: "/admin/mail-templates",
        icon: <MailIcon className="h-4 w-4" />,
        label: "E-mail sablonok",
      });
    }
    if (MEDIA_READ_PERMISSION_KEYS.some((key) => hasPermission(key))) {
      items.push({
        href: "/admin/media",
        icon: <ImagesIcon className="h-4 w-4" />,
        label: "Médiatár",
      });
    }
    items.push({
      href: "/admin/feladat-kategoriak",
      icon: <TagsIcon className="h-4 w-4" />,
      label: "Feladat kategóriák",
    });
    items.push({
      href: "/admin/branding",
      icon: <PaletteIcon className="h-4 w-4" />,
      label: "Arculat",
    });
    return items;
  }, [user?.permissions]);

  // Domain modules register their menu groups in lib/navigation/modules.tsx.
  const moduleGroups = useMemo(() => buildModuleNav(hasPermission), [user?.permissions]);

  return (
    <Sidebar className="max-w-full">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex flex-row items-center gap-2">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.appName}
              className="size-8 shrink-0 rounded-md object-contain"
            />
          ) : null}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium leading-none">{branding.appName}</span>
            <span className="text-muted-foreground truncate text-xs">
              {branding.companyName}
            </span>
          </div>
        </div>
        {/* The signed-in user sits at the top (client request, 2026-11-19): always visible,
            even when the menu is long enough to push a footer off-screen. */}
        <div className="bg-sidebar-accent/60 rounded-lg px-2 py-2">
          {authLoading ? (
            <div className="flex h-9 w-full flex-row items-center justify-between">
              <div className="flex h-full w-full flex-row items-center gap-2">
                <Skeleton className="aspect-square w-9 rounded-full" />
                <div className="flex w-full flex-col gap-2">
                  <Skeleton className="h-2 w-32" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            </div>
          ) : user ? (
            <div className="flex flex-row items-center justify-between gap-1">
              <div className="flex min-w-0 flex-row items-center gap-2">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground lowercase">
                    {user.name ? getInitials(user.name, 2) : user.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <span className="truncate font-medium leading-none">
                    {user.name || user.email}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                title="Kijelentkezés"
                aria-label="Kijelentkezés"
                onClick={() => {
                  linkClick();
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOutIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link href="/login" onClick={linkClick}>
                Bejelentkezés
              </Link>
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Általános</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem
                href="/"
                icon={<LayoutDashboardIcon className="h-4 w-4" />}
                label="Vezérlőpult"
                onClick={linkClick}
                tourId="dashboard"
              />
              <MenuItem
                href="/feladatok"
                icon={
                  <ListChecksIcon
                    className={cn(
                      "h-4 w-4",
                      feladatJelzes.db > 0 && feladatSzin(feladatJelzes).ikon,
                    )}
                  />
                }
                label="Feladatok"
                onClick={linkClick}
                tourId="feladatok"
                badge={{
                  count: feladatJelzes.db,
                  className: feladatSzin(feladatJelzes).badge,
                  title: [
                    `${feladatJelzes.db} nyitott teendő`,
                    feladatJelzes.lejart ? `${feladatJelzes.lejart} lejárt` : "",
                    feladatJelzes.uj ? `${feladatJelzes.uj} új, elfogadásra vár` : "",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                }}
              />
              <MenuItem
                href="/jelzesek"
                icon={
                  <BellIcon
                    className={cn("h-4 w-4", jelzesOlvasatlan > 0 && "text-danger")}
                  />
                }
                label="Értesítések"
                onClick={linkClick}
                tourId="jelzesek-menu"
                badge={{
                  count: jelzesOlvasatlan,
                  className: "bg-danger text-danger-foreground",
                  title: `${jelzesOlvasatlan} olvasatlan jelzés`,
                }}
              />
              <MenuItem
                href="/help"
                icon={<CircleHelpIcon className="h-4 w-4" />}
                label="Súgó"
                onClick={linkClick}
                tourId="help"
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {moduleGroups.map((g) => (
          <SidebarNavGroup
            key={g.tourId}
            label={g.label}
            items={g.items}
            onLinkClick={linkClick}
            tourId={g.tourId}
          />
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Beállítások</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuItem
                href="/account"
                icon={<UserIcon className="h-4 w-4" />}
                label="Fiók"
                onClick={linkClick}
                tourId="account"
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarNavGroup
            label="Adminisztráció"
            items={adminItems}
            onLinkClick={linkClick}
            tourId="admin"
          />
        )}
      </SidebarContent>
    </Sidebar>
  );
}
