import { CalendarClockIcon, ClipboardListIcon, TicketIcon } from "lucide-react";
import type { ModuleNavGroup } from "./modules";

/** Sidebar group of the Szerviz module (each link gated by its own key). */
export const szervizNav: ModuleNavGroup = {
  label: "Szerviz",
  tourId: "nav-szerviz",
  items: [
    {
      permission: "szerviz:hibajegy:read",
      item: {
        href: "/szerviz/hibajegyek",
        label: "Hibajegyek",
        icon: <TicketIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "szerviz:munkalap:read",
      item: {
        href: "/szerviz/munkalapok",
        label: "Munkalapok",
        icon: <ClipboardListIcon className="h-4 w-4" />,
      },
    },
    {
      permission: "szerviz:karbantartas:read",
      item: {
        href: "/szerviz/karbantartas",
        label: "Karbantartás",
        icon: <CalendarClockIcon className="h-4 w-4" />,
      },
    },
  ],
};
