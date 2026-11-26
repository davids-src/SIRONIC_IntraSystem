"use client";

import { ExportMenu } from "./export-menu";
import { exportFileName } from "./export-values";
import { elementTitle, extractElementTables, printElement } from "./page-export";
import { XLSX_MIME, buildXlsx, downloadFile } from "./xlsx";

export type ElementExportMenuProps = {
  /** The element to export (looked up on click, so it is the current screen). */
  getRoot: () => Element | null;
  /** Fixed title; default: the element's first heading. */
  title?: string;
  companyName?: string;
  logoUrl?: string;
  label?: string;
  className?: string;
};

/** Export menu for a whole screen or an open sheet: Excel of its data, or a print view. */
export function ElementExportMenu({
  getRoot,
  title,
  companyName,
  logoUrl,
  label,
  className,
}: ElementExportMenuProps) {
  const root = () => {
    const el = getRoot();
    if (!el) throw new Error("Nincs mit exportálni ezen az oldalon.");
    return el;
  };
  return (
    <ExportMenu
      label={label}
      className={className}
      onExcel={async () => {
        const el = root();
        const t = title ?? elementTitle(el);
        const buf = await buildXlsx(extractElementTables(el, t));
        downloadFile(buf, exportFileName(t, "xlsx"), XLSX_MIME);
      }}
      onPrint={() => {
        const el = root();
        printElement(el, { title: title ?? elementTitle(el), companyName, logoUrl });
      }}
    />
  );
}
