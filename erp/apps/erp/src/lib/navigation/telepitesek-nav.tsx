import { CloudIcon, FileCodeIcon, PackageIcon, PlugIcon, WalletIcon } from "lucide-react";
import { DEPLOYMENTS_PERMISSIONS as P } from "@erp/deployments/client";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Telepítések (platform) module, each link gated by its own key. */
export const telepitesekNav: ModuleNavGroup = {
  label: "Telepítések",
  tourId: "nav-telepitesek",
  items: [
    {
      permission: P.telepitesRead,
      item: {
        href: "/telepitesek",
        label: "Telepítések",
        icon: <CloudIcon className="size-4" />,
      },
    },
    {
      permission: P.csomagRead,
      item: {
        href: "/telepitesek/csomagok",
        label: "Csomagok",
        icon: <PackageIcon className="size-4" />,
      },
    },
    {
      permission: P.fizetesRead,
      item: {
        href: "/telepitesek/fizetesek",
        label: "Fizetések",
        icon: <WalletIcon className="size-4" />,
      },
    },
    {
      permission: P.integracioRead,
      item: {
        href: "/telepitesek/integraciok",
        label: "Integrációk",
        icon: <PlugIcon className="size-4" />,
      },
    },
    {
      permission: P.sablonRead,
      item: {
        href: "/telepitesek/sablonok",
        label: "Stack sablonok",
        icon: <FileCodeIcon className="size-4" />,
      },
    },
  ],
};
