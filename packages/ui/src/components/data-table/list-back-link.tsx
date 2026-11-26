"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type React from "react";
import { rememberedListHref } from "./list-memory";

/**
 * `href` plus the list query remembered for it in this browser tab (#62). Renders the bare
 * `href` on the server and on the first client render, so hydration matches.
 */
export function useRememberedListHref(href: string): string {
  const [resolved, setResolved] = useState(href);
  useEffect(() => {
    setResolved(rememberedListHref(href));
  }, [href]);
  return resolved;
}

/**
 * A link back to a DataTable list ("Vissza a gépekhez", breadcrumb) that returns to the list
 * with the search, filters, sort and page the user left it with.
 */
export function ListBackLink({
  href,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }) {
  const resolved = useRememberedListHref(href);
  return <Link href={resolved} {...props} />;
}
