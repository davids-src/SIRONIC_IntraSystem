import {
  FileCodeIcon,
  GaugeIcon,
  GlobeIcon,
  LayersIcon,
  PlugIcon,
  ServerIcon,
} from "lucide-react";
import { INFRA_PERMISSIONS as P } from "@erp/infra/client";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Infrastruktúra module, each link gated by its own key. */
export const infraNav: ModuleNavGroup = {
  label: "Infrastruktúra",
  tourId: "nav-infra",
  items: [
    {
      permission: P.stackRead,
      item: {
        href: "/infra",
        label: "Áttekintés",
        icon: <GaugeIcon className="size-4" />,
      },
    },
    {
      permission: P.stackRead,
      item: {
        href: "/infra/stackek",
        label: "Stackek",
        icon: <LayersIcon className="size-4" />,
      },
    },
    {
      permission: P.oldalRead,
      item: {
        href: "/infra/oldalak",
        label: "Oldalak",
        icon: <GlobeIcon className="size-4" />,
      },
    },
    {
      permission: P.webhelyRead,
      item: {
        href: "/infra/webhelyek",
        label: "Webhelyek",
        icon: <ServerIcon className="size-4" />,
      },
    },
    {
      permission: P.sablonRead,
      item: {
        href: "/infra/sablonok",
        label: "Sablonok",
        icon: <FileCodeIcon className="size-4" />,
      },
    },
    {
      permission: P.integracioRead,
      item: {
        href: "/infra/integraciok",
        label: "Integrációk",
        icon: <PlugIcon className="size-4" />,
      },
    },
  ],
};
