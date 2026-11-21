import type { ReactNode } from "react";
import { ContactIcon, HandshakeIcon, KeyRoundIcon, WrenchIcon } from "lucide-react";
import { PARTNER_PERMISSIONS } from "@erp/partner/client";
import type { SidebarNavItem } from "@/components/sidebar-nav-group";
import { arlistaNav } from "./arlista-nav";
import { projektNav } from "./projekt-nav";
import { keszletNav } from "./keszlet-nav";
import { ertekesitesNav } from "./ertekesites-nav";
import { szervizNav } from "./szerviz-nav";
import { bizonylatNav } from "./bizonylat-nav";

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
  arlistaNav,
  projektNav,
  keszletNav,
  ertekesitesNav,
  szervizNav,
  bizonylatNav,
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
  {
    label: "Partnerek",
    tourId: "nav-partner",
    items: [
      {
        permission: PARTNER_PERMISSIONS.partnerRead,
        item: {
          href: "/partner",
          label: "Partnerek",
          icon: <HandshakeIcon className="h-4 w-4" />,
        },
      },
      {
        permission: PARTNER_PERMISSIONS.erdeklodoRead,
        item: {
          href: "/partner/erdeklodok",
          label: "Érdeklődők",
          icon: <ContactIcon className="h-4 w-4" />,
        },
      },
    ],
  },
  {
    label: "Titoktár",
    tourId: "nav-secrets",
    items: [
      {
        permission: "secrets:titok:read",
        item: {
          href: "/secrets",
          label: "Titkok",
          icon: <KeyRoundIcon className="size-4" />,
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
