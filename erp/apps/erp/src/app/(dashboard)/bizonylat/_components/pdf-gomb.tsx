"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@erp/ui";
import type { PdfRenderer } from "@erp/bizonylat/client";

/**
 * Browser implementation of the `PdfRenderer` seam (decision #11): the print dialog
 * ("Save as PDF"). Swapping in html2pdf.js or server-side pdfmake only means replacing this
 * object — the HTML is built by the domain's pure `jotallasiJegyHtml`.
 */
const nyomtatoRenderer: PdfRenderer = {
  render(html) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      win.focus();
      win.print();
      setTimeout(() => iframe.remove(), 120_000);
    }, 250);
  },
};

export function PdfGomb({ html, fajlNev }: { html: string; fajlNev: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => nyomtatoRenderer.render(html, fajlNev)}
    >
      <PrinterIcon className="mr-1 size-4" />
      PDF / nyomtatás
    </Button>
  );
}
