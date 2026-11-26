"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Főmenü" className="flex flex-wrap gap-1">
      {items.map((i) => {
        const aktiv = i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={aktiv ? "page" : undefined}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              aktiv ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
