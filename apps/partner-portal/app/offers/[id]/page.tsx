"use client";

import { PageHeader, Card, Badge, Button, UnifiedPdfTemplate } from "@crm/ui";
import { Download, ChevronLeft, Check, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import type { Contact, Offer, CompanyDetails, Settings } from "@crm/types";

const statusVariant = {
  draft: "default",
  sent: "info",
  accepted: "success",
  rejected: "error",
} as const;

const statusLabel = {
  draft: "Piszkozat",
  sent: "Döntésre vár",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
} as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function PartnerOfferDetailsPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [offer, setOffer] = useState<Offer | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [provider, setProvider] = useState<CompanyDetails | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [oRes, setRes, cRes] = await Promise.all([
          fetch(`/api/offers/${id}`, { signal: ac.signal }),
          fetch(`/api/settings`, { signal: ac.signal }),
          fetch(`/api/company-profile`, { signal: ac.signal }),
        ]);

        if (!oRes.ok) throw new Error("Ajánlat nem található.");
        const oData = (await oRes.json()) as Offer;
        setOffer(oData);

        if (setRes.ok) {
          const sData = (await setRes.json()) as Settings;
          setProvider(sData.company_details || null);
        }

        if (cRes.ok) {
          setContact(await cRes.json());
        }
      } catch (err) {
        if (!ac.signal.aborted) setLoadErr((err as Error).message);
      }
    })();
    return () => ac.abort();
  }, [id]);

  const handleStatusUpdate = async (status: "accepted" | "rejected") => {
    if (
      !confirm(
        `Biztosan szeretnéd beállítani az ajánlat státuszát: ${statusLabel[status]}?`,
      )
    )
      return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Nem sikerült módosítani a státuszt.");
      setOffer(await res.json());
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const element = printRef.current;

    element.style.display = "block";

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: `Arajanlat_${offer?.offer_number || id}.pdf`,
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

  if (loadErr) return <div className="p-8 text-red-500">{loadErr}</div>;
  if (!offer) return <div className="p-8">Betöltés...</div>;

  const totalNet = offer.lines.reduce((sum, l) => sum + l.net_unit_price * l.quantity, 0);
  const totalVat = offer.lines.reduce(
    (sum, l) => sum + l.net_unit_price * l.quantity * (l.tax_rate / 100),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Ajánlat: ${offer.offer_number}`}
        subtitle={offer.title}
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/offers")}>
              <ChevronLeft size={16} /> Vissza
            </Button>
            <Button variant="secondary" onClick={handleDownloadPdf}>
              <Download size={16} className="mr-2" /> PDF Letöltés
            </Button>
          </>
        }
      />

      {offer.status === "sent" && (
        <Card className="p-4 bg-blue-950/20 border-blue-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            <span className="font-semibold text-blue-400">Döntésre vár.</span> Kérlek
            tekintsd át az ajánlatot, és jelezd vissza nekünk a döntésedet!
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => handleStatusUpdate("rejected")}
              disabled={updating}
              style={{ color: "#ef4444" }}
            >
              <X size={16} className="mr-2" /> Elutasítom
            </Button>
            <Button
              variant="primary"
              onClick={() => handleStatusUpdate("accepted")}
              disabled={updating}
              style={{ background: "#22c55e", color: "#fff" }}
            >
              <Check size={16} className="mr-2" /> Elfogadom
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Tételek</h3>
            <Badge variant={statusVariant[offer.status]}>
              {statusLabel[offer.status]}
            </Badge>
          </div>

          <div className="flex flex-col gap-4">
            {offer.lines.map((l, i) => (
              <div
                key={i}
                className="flex justify-between items-start border-b border-[#222] pb-4"
              >
                <div>
                  <div className="font-semibold text-sm">{l.description}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {l.quantity} {l.unit} x {fmt(l.net_unit_price)}
                  </div>
                </div>
                <div className="font-bold text-sm">
                  {fmt(l.quantity * l.net_unit_price)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 text-sm border-t border-[#333] pt-4">
            <div className="flex justify-between text-gray-400">
              <span>Nettó összesen:</span>
              <span>{fmt(totalNet)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>ÁFA:</span>
              <span>{fmt(totalVat)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Bruttó összesen:</span>
              <span className="text-red-500">{fmt(offer.total_amount)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Részletek</h3>
          <div className="text-sm flex flex-col gap-2">
            <div>
              <span className="text-gray-400 block text-xs uppercase mb-1">
                Érvényesség
              </span>
              <span className="font-medium">
                {offer.valid_until
                  ? new Date(offer.valid_until).toLocaleDateString("hu-HU")
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs uppercase mb-1">
                Kiadás dátuma
              </span>
              <span className="font-medium">
                {new Date(offer.created_at).toLocaleDateString("hu-HU")}
              </span>
            </div>
          </div>

          {offer.notes && (
            <div className="mt-6 pt-4 border-t border-[#333]">
              <span className="text-gray-400 block text-xs uppercase mb-2">
                Megjegyzések
              </span>
              <p className="text-sm whitespace-pre-wrap">{offer.notes}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Hidden PDF Container */}
      <div style={{ display: "none" }} ref={printRef}>
        <UnifiedPdfTemplate
          documentTitle="ÁRAJÁNLAT"
          documentId={offer.offer_number}
          date={new Date(offer.created_at)}
          provider={provider}
          client={contact}
          showSignatures={false}
        >
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "10px", color: "#333" }}>
              {offer.title}
            </h3>
            {offer.notes && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "20px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {offer.notes}
              </p>
            )}
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              marginBottom: "30px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #000" }}>
                <th style={{ textAlign: "left", padding: "8px" }}>Megnevezés</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Mennyiség</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Nettó egységár</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Nettó összesen</th>
              </tr>
            </thead>
            <tbody>
              {offer.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{l.description}</td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    {l.quantity} {l.unit}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    {fmt(l.net_unit_price)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px" }}>
                    {fmt(l.quantity * l.net_unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ width: "250px", marginLeft: "auto", fontSize: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>Nettó összesen:</span>
              <span>{fmt(totalNet)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span>ÁFA:</span>
              <span>{fmt(totalVat)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "14px",
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "2px solid #000",
              }}
            >
              <span>Fizetendő:</span>
              <span>{fmt(offer.total_amount)}</span>
            </div>
          </div>
        </UnifiedPdfTemplate>
      </div>
    </div>
  );
}
