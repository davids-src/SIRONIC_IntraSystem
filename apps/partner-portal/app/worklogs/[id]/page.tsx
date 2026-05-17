"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import { UnifiedPdfTemplate } from "@crm/ui";
import type { Worklog, CompanyDetails, Contact } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseWorklog } from "@/lib/entity-parsers";
import { useRouter } from "next/navigation";
import { use, useEffect, useState, useRef } from "react";
import { Download } from "lucide-react";

export default function PartnerWorklogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [wl, setWl] = useState<Worklog | null>(null);
  const [provider, setProvider] = useState<CompanyDetails | null>(null);
  const [client, setClient] = useState<Contact | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [rawWl, rawPrintData] = await Promise.all([
          apiJson<unknown>(`/api/worklogs/${id}`, { signal: ac.signal }),
          apiJson<{ provider: CompanyDetails; client: Contact }>(`/api/print-data`, {
            signal: ac.signal,
          }),
        ]);
        setWl(parseWorklog(rawWl));
        setProvider(rawPrintData.provider);
        setClient(rawPrintData.client);
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A munkalap nem elérhető.");
      }
    })();
    return () => ac.abort();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!printRef.current || !wl) return;
    const element = printRef.current;

    // Temporarily make it visible for html2pdf
    element.style.display = "block";

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: `Munkalap_${wl.worklog_number}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
      };
      await html2pdf().from(element).set(opt).save();
    } catch (e) {
      console.error("PDF generálási hiba:", e);
      alert("Hiba történt a PDF generálása során.");
    } finally {
      element.style.display = "none";
    }
  };

  if (!wl && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (loadErr && !wl) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-400">{loadErr}</p>
        <Button variant="secondary" onClick={() => router.push("/worklogs")}>
          Vissza
        </Button>
      </div>
    );
  }
  if (!wl) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Munkalap: ${wl.worklog_number}`}
        subtitle={`${wl.work_category} — ${wl.work_date.toLocaleDateString("hu-HU")}`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleDownloadPdf}>
              <Download size={15} style={{ marginRight: "6px" }} />
              PDF letöltése
            </Button>
            <Button variant="primary" onClick={() => router.push("/worklogs")}>
              Vissza
            </Button>
          </div>
        }
      />
      <Badge variant={wl.status === "finalized" ? "success" : "default"}>
        {wl.status === "finalized" ? "Véglegesített" : "Piszkozat"}
      </Badge>
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Elvégzett feladatok
          </h3>
          <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
            <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
              {wl.work_description}
            </p>
          </div>
        </div>

        {wl.site_address && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
              Helyszín
            </h3>
            <p className="text-sm text-white">{wl.site_address}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Felhasznált tételek
          </h3>
          {wl.items && wl.items.length > 0 && wl.items[0]?.description !== "—" ? (
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border-subtle)]">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Megnevezés</th>
                    <th className="px-4 py-3 font-semibold text-center">Egység</th>
                    <th className="px-4 py-3 font-semibold text-right">Mennyiség</th>
                  </tr>
                </thead>
                <tbody>
                  {wl.items.map((it, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-[var(--color-border-subtle)] last:border-0"
                    >
                      <td className="px-4 py-3 text-white">{it.description}</td>
                      <td className="px-4 py-3 text-center text-[var(--color-text-muted)]">
                        {it.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {it.quantity}
                      </td>
                    </tr>
                  ))}
                  {wl.travel_km && Number(wl.travel_km) > 0 ? (
                    <tr className="border-b border-[var(--color-border-subtle)] last:border-0 bg-[var(--color-bg-secondary)]/30">
                      <td className="px-4 py-3 text-white">Kiszállás / Útiköltség</td>
                      <td className="px-4 py-3 text-center text-[var(--color-text-muted)]">
                        km
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {wl.travel_km}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">
              Nincsenek rögzített tételek.
            </p>
          )}
        </div>
      </Card>

      {/* Rejtett PDF sablon */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <UnifiedPdfTemplate
            documentTitle="Munkalap"
            documentId={wl.worklog_number}
            date={new Date(wl.work_date)}
            provider={provider}
            client={client}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 10px",
                  color: "#000",
                }}
              >
                Elvégzett feladatok
              </h3>
              <div
                style={{
                  padding: "12px",
                  borderLeft: "3px solid #e53935",
                  backgroundColor: "#fff5f5",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "#333",
                  whiteSpace: "pre-wrap",
                }}
              >
                {wl.work_description}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  margin: "0 0 10px",
                  color: "#000",
                }}
              >
                Felhasznált tételek
              </h3>
              {wl.items && wl.items.length > 0 && wl.items[0]?.description !== "—" ? (
                <table
                  style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
                >
                  <thead>
                    <tr style={{ borderBottom: "2px solid #333" }}>
                      <th style={{ padding: "8px", textAlign: "left" }}>Megnevezés</th>
                      <th style={{ padding: "8px", textAlign: "center", width: "15%" }}>
                        M.egys.
                      </th>
                      <th style={{ padding: "8px", textAlign: "right", width: "15%" }}>
                        Menny.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {wl.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px", color: "#000" }}>
                          {it.description}
                        </td>
                        <td style={{ padding: "8px", textAlign: "center" }}>{it.unit}</td>
                        <td
                          style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}
                        >
                          {it.quantity}
                        </td>
                      </tr>
                    ))}
                    {wl.travel_km && Number(wl.travel_km) > 0 && (
                      <tr style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "8px", color: "#000" }}>
                          Kiszállás / Útiköltség
                        </td>
                        <td style={{ padding: "8px", textAlign: "center" }}>km</td>
                        <td
                          style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}
                        >
                          {wl.travel_km}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontSize: "13px", color: "#666" }}>
                  Nincsenek rögzített tételek.
                </p>
              )}
            </div>
          </UnifiedPdfTemplate>
        </div>
      </div>
    </div>
  );
}
