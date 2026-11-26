import { FileSignatureIcon, FileTextIcon, ShoppingCartIcon } from "lucide-react";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Értékesítés module (each link gated by its own key). */
export const ertekesitesNav: ModuleNavGroup = {
  label: "Értékesítés",
  tourId: "nav-ertekesites",
  items: [
    {
      permission: "ertekesites:ajanlat:read",
      item: {
        href: "/ertekesites/ajanlatok",
        label: "Ajánlatok",
        icon: <FileTextIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "ertekesites:szerzodes:read",
      item: {
        href: "/ertekesites/szerzodesek",
        label: "Szerződések",
        icon: <FileSignatureIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "ertekesites:megrendelo:read",
      item: {
        href: "/ertekesites/megrendelok",
        label: "Megrendelőlapok",
        icon: <ShoppingCartIcon className="h-4 w-4" />,
      },
    },
  ],
};
