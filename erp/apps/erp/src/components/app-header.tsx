"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  ElementExportMenu,
  ListBackLink,
} from "@erp/ui";
import { SidebarTrigger } from "@erp/ui";
import { Container } from "@erp/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { JelzesCsengo } from "@/components/jelzes/jelzes-csengo";
import { useBranding } from "@/components/branding-provider";

export function translateSegment(segment: string): string {
  const map: Record<string, string> = {
    login: "Bejelentkezés",
    register: "Regisztráció",
    admin: "Adminisztráció",
    permissions: "Szerepkörök és jogosultságok",
    users: "Felhasználók",
    dashboard: "Vezérlőpult",
    account: "Fiók",
    create: "Létrehozás",
    edit: "Szerkesztés",
    new: "Új",
    branding: "Arculat",
    help: "Súgó",
    "my-tasks": "Feladatok",
    feladat: "Feladat",
    sajat: "Saját adataim",
    jelzesek: "Értesítési központ",
    kuldes: "Küldés",
    kereses: "Keresés",
  };
  // A record id says nothing to the reader — the page title names the record.
  if (/^[0-9a-f]{24}$/i.test(segment)) return "Részletek";
  return (
    map[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
  );
}

export default function AppHeader({
  jelzesOlvasatlan = 0,
}: {
  jelzesOlvasatlan?: number;
}) {
  const pathname = usePathname();
  const pathnameSegments = pathname.split("/").filter((segment) => segment !== "");
  const ref = useRef<HTMLDivElement>(null);
  const branding = useBranding();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollToEnd = () => {
      el.scrollLeft = el.scrollWidth;
    };

    scrollToEnd();
    window.addEventListener("resize", scrollToEnd);
    return () => window.removeEventListener("resize", scrollToEnd);
  }, [pathnameSegments.length]);

  return (
    <div data-print="hide" className="contents">
      <Container className="bg-background z-20 shrink-0 pb-0">
        <div className="flex flex-row items-center gap-2">
          <SidebarTrigger />
          <Breadcrumb className="invis-scroll flex-1 overflow-x-auto" ref={ref}>
            <BreadcrumbList className="flex flex-row flex-nowrap items-center gap-2">
              {pathnameSegments.length > 0 ? (
                pathnameSegments.map((segment, index) => (
                  <div key={`item-${index}`} className="flex flex-row items-center gap-2">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        {/* Back to a list keeps its filters (#62). */}
                        <ListBackLink
                          href={`/${pathnameSegments.slice(0, index + 1).join("/")}`}
                        >
                          {translateSegment(segment)}
                        </ListBackLink>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </div>
                ))
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/">Vezérlőpult</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          {/* Global search: a plain GET form, works without JavaScript. */}
          <form action="/kereses" method="get" role="search" className="hidden sm:block">
            <label htmlFor="globalis-kereses" className="sr-only">
              Keresés
            </label>
            <input
              id="globalis-kereses"
              name="q"
              type="search"
              minLength={2}
              placeholder="Keresés…"
              autoComplete="off"
              className="border-input bg-background h-9 w-40 rounded-md border px-3 text-sm lg:w-56"
            />
          </form>
          {/* Excel / print of whatever the current screen shows — for meetings. */}
          <ElementExportMenu
            getRoot={() => document.querySelector("main")}
            companyName={branding.companyName}
            logoUrl={branding.logoUrl}
          />
          <JelzesCsengo olvasatlan={jelzesOlvasatlan} />
          <ThemeToggle />
        </div>
        <hr className="mt-4" />
      </Container>
    </div>
  );
}
