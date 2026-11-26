import { AwardIcon, ClipboardCheckIcon, ReceiptIcon, TruckIcon } from "lucide-react";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Bizonylatok module (each link gated by its own key). */
export const bizonylatNav: ModuleNavGroup = {
  label: "Bizonylatok",
  tourId: "nav-bizonylat",
  items: [
    {
      permission: "bizonylat:szallitolevel:read",
      item: {
        href: "/bizonylat/szallitolevelek",
        label: "Szállítólevelek",
        icon: <TruckIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "bizonylat:igazolas:read",
      item: {
        href: "/bizonylat/igazolasok",
        label: "Teljesítésigazolások",
        icon: <ClipboardCheckIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "bizonylat:szamla:read",
      item: {
        href: "/bizonylat/szamlak",
        label: "Számlák",
        icon: <ReceiptIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "bizonylat:jotallas:read",
      item: {
        href: "/bizonylat/jotallasok",
        label: "Jótállási jegyek",
        icon: <AwardIcon className="h-4 w-4" />,
      },
    },
  ],
};
