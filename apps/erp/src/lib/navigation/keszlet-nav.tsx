import {
  BoxesIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  PackagePlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import { KESZLET_PERMISSIONS as P } from "@erp/keszlet/client";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Készlet module (each link gated by its own key). */
export const keszletNav: ModuleNavGroup = {
  label: "Készlet",
  tourId: "nav-keszlet",
  items: [
    {
      permission: P.keszletRead,
      item: {
        href: "/keszlet",
        label: "Műszerfal",
        icon: <LayoutDashboardIcon className="h-4 w-4" />,
      },
    },
    {
      permission: P.keszletRead,
      item: {
        href: "/keszlet/lista",
        label: "Készletlista",
        icon: <BoxesIcon className="h-4 w-4" />,
      },
    },
    {
      permission: P.bevetelWrite,
      item: {
        href: "/keszlet/bevetel",
        label: "Bevételezés",
        icon: <PackagePlusIcon className="h-4 w-4" />,
      },
    },
    {
      permission: P.keszletRead,
      item: {
        href: "/keszlet/leltar",
        label: "Leltár",
        icon: <ClipboardCheckIcon className="h-4 w-4" />,
      },
    },
    {
      permission: P.rmaRead,
      item: {
        href: "/keszlet/rma",
        label: "RMA ügyek",
        icon: <RotateCcwIcon className="h-4 w-4" />,
      },
    },
    {
      permission: P.keszletRead,
      item: {
        href: "/keszlet/raktarhelyek",
        label: "Raktárhelyek",
        icon: <MapPinIcon className="h-4 w-4" />,
      },
    },
  ],
};
