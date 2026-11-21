import type { ReactNode } from "react";
import { WrenchIcon } from "lucide-react";
import type { SidebarNavItem } from "@/components/sidebar-nav-group";

/**
 * Sidebar menu groups of the domain modules — the one place a new module adds its navigation
 * (docs/03 §Definition of Done). A group is shown only when the user holds one of its keys.
 * Hiding a link is convenience, not security: every page still calls `requirePermission`.
 */
export type ModuleNavGroup = {
  label: string;
  tourId: string;
  /** Items (with the key that gates each); an empty result hides the group. */
  items: Array<{ permission: string; item: SidebarNavItem }>;
};

export const MODULE_NAV: ModuleNavGroup[] = [
  {
    label: "Eszközök",
    tourId: "nav-eszkoz",
    items: [
      {
        permission: "eszkoz:eszkoz:read",
        item: {
          href: "/eszkoz",
          label: "Eszközök",
          icon: <WrenchIcon className="size-4" />,
        },
      },
    ],
  },
];

export function buildModuleNav(hasPermission: (key: string) => boolean): Array<{
  label: string;
  tourId: string;
  items: SidebarNavItem[];
}> {
  return MODULE_NAV.map((g) => ({
    label: g.label,
    tourId: g.tourId,
    items: g.items.filter((i) => hasPermission(i.permission)).map((i) => i.item),
  })).filter((g) => g.items.length > 0);
}

export type { ReactNode };
