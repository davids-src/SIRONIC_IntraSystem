import { PackageIcon, SlidersHorizontalIcon, WrenchIcon } from "lucide-react";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Árlista module (each link gated by its own key). */
export const arlistaNav: ModuleNavGroup = {
  label: "Árlista",
  tourId: "arlista",
  items: [
    {
      permission: "arlista:termek:read",
      item: {
        href: "/arlista/termekek",
        label: "Termék árlista",
        icon: <PackageIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "arlista:szolgaltatas:read",
      item: {
        href: "/arlista/szolgaltatasok",
        label: "Szolgáltatás árlista",
        icon: <WrenchIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "arlista:beallitas:write",
      item: {
        href: "/arlista/beallitasok",
        label: "Árképzési beállítások",
        icon: <SlidersHorizontalIcon className="h-4 w-4" />,
      },
    },
  ],
};
