import {
  CalendarRangeIcon,
  ClipboardListIcon,
  FolderKanbanIcon,
  ReceiptIcon,
} from "lucide-react";
import { PROJEKT_PERMISSIONS } from "@erp/projekt/client";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Projektek module (each link gated by its own key). */
export const projektNav: ModuleNavGroup = {
  label: "Projektek",
  tourId: "nav-projekt",
  items: [
    {
      permission: PROJEKT_PERMISSIONS.projektRead,
      item: {
        href: "/projekt",
        label: "Projektek",
        icon: <FolderKanbanIcon className="size-4" />,
      },
    },
    {
      permission: PROJEKT_PERMISSIONS.hetitervRead,
      item: {
        href: "/projekt/heti-terv",
        label: "Heti terv",
        icon: <CalendarRangeIcon className="size-4" />,
      },
    },
    {
      permission: PROJEKT_PERMISSIONS.koltsegRead,
      item: {
        href: "/projekt/koltsegek",
        label: "Költségek",
        icon: <ReceiptIcon className="size-4" />,
      },
    },
    {
      permission: PROJEKT_PERMISSIONS.sablonRead,
      item: {
        href: "/projekt/sablonok",
        label: "Ellenőrzőlista-sablonok",
        icon: <ClipboardListIcon className="size-4" />,
      },
    },
  ],
};
