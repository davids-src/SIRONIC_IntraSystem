"use client";

import { useSearchParams } from "next/navigation";
import { FileSpreadsheetIcon } from "lucide-react";
import { Button } from "@erp/ui";

/**
 * "Excel letöltése" for a list page: points the export route at the page's current URL state, so
 * the file holds what the table shows with its filters, search and sort — all pages of it.
 */
export function ExcelLetoltes({
  href,
  label = "Excel letöltése",
}: {
  href: string;
  label?: string;
}) {
  const params = useSearchParams();
  const qs = params.toString();
  return (
    <Button asChild variant="outline" size="sm">
      <a href={qs ? `${href}?${qs}` : href} download>
        <FileSpreadsheetIcon className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
