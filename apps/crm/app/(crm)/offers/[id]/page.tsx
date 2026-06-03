"use client";

import { PageHeader, Card, Badge, Button, UnifiedPdfTemplate } from "@crm/ui";
import { Download, Edit, ChevronLeft, Send } from "lucide-react";
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
  sent: "Elküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
} as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function OfferDetailsPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [offer, setOffer] = useState<Offer | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [provider, setProvider] = useState<CompanyDetails | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  const handleSendEmail = async () => {
    if (!confirm("Szeretnél e-mail értesítést küldeni a partnernek erről az ajánlatról?"))
      return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/offers/${id}/send-email`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Hiba történt az e-mail küldése során.");
      }
      const updatedOffer = await res.json();
      setOffer(updatedOffer);
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 5000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [oRes, setRes] = await Promise.all([
          fetch(`/api/offers/${id}`, { signal: ac.signal }),
          fetch(`/api/settings`, { signal: ac.signal }),
        ]);

        if (!oRes.ok) throw new Error("Ajánlat nem található.");
        const oData = (await oRes.json()) as Offer;
        setOffer(oData);

        if (setRes.ok) {
          const sData = (await setRes.json()) as Settings;
          setProvider(sData.company_details || null);
        }

        if (oData.contact_id) {
          const cRes = await fetch(`/api/contacts/${oData.contact_id}`, {
            signal: ac.signal,
          });
          if (cRes.ok) {
            setContact(await cRes.json());
          }
        }
      } catch (err) {
        if (!ac.signal.aborted) setLoadErr((err as Error).message);
      }
    })();
    return () => ac.abort();
  }, [id]);

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

  const totalNet = offer.lines.reduce(
    (sum, l) =>
      sum + l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100) * l.quantity,
    0,
  );
  const totalVat = offer.lines.reduce(
    (sum, l) =>
      sum +
      l.net_unit_price *
        (1 - (l.discount_percent ?? 0) / 100) *
        l.quantity *
        (l.tax_rate / 100),
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
            <Button
              variant="primary"
              onClick={handleSendEmail}
              disabled={sendingEmail || !contact?.email}
            >
              <Send size={16} className="mr-2" />
              {sendingEmail ? "Küldés..." : "E-mail küldése"}
            </Button>
          </>
        }
      />

      {emailSuccess && (
        <div className="bg-green-950/30 text-green-400 p-4 rounded-lg border border-green-900/50">
          Az e-mail sikeresen elküldve a partnernek ({contact?.email}).
        </div>
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
            {offer.lines.map((l, i) => {
              const discountedPrice =
                l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
              return (
                <div
                  key={i}
                  className="flex justify-between items-start border-b border-[#222] pb-4"
                >
                  <div>
                    <div
                      className="font-semibold text-sm"
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      {l.description}
                      {l.discount_percent ? (
                        <Badge variant="success">-{l.discount_percent}%</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {l.quantity} {l.unit} x {fmt(l.net_unit_price)}
                      {l.discount_percent
                        ? ` (Kedvezményes: ${fmt(discountedPrice)} / ${l.unit})`
                        : ""}
                    </div>
                  </div>
                  <div className="font-bold text-sm">
                    {fmt(l.quantity * discountedPrice)}
                  </div>
                </div>
              );
            })}
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
          <h3 className="font-bold text-lg mb-4">Ügyfél adatok</h3>
          <div className="text-sm flex flex-col gap-2">
            <div>
              <span className="text-gray-400 block text-xs uppercase mb-1">Név</span>
              <span className="font-medium">{contact?.name || "Ismeretlen"}</span>
            </div>
            {contact?.email && (
              <div>
                <span className="text-gray-400 block text-xs uppercase mb-1">E-mail</span>
                <span>{contact.email}</span>
              </div>
            )}
            {contact?.phone && (
              <div>
                <span className="text-gray-400 block text-xs uppercase mb-1">
                  Telefon
                </span>
                <span>{contact.phone}</span>
              </div>
            )}
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
              {offer.lines.map((l, i) => {
                const discountedPrice =
                  l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px", fontWeight: 600 }}>
                      {l.description}
                      {l.discount_percent ? (
                        <span
                          style={{
                            marginLeft: "6px",
                            color: "#22c55e",
                            fontSize: "10px",
                          }}
                        >
                          (-{l.discount_percent}%)
                        </span>
                      ) : null}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px" }}>
                      {l.quantity} {l.unit}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px" }}>
                      {fmt(discountedPrice)}
                    </td>
                    <td style={{ textAlign: "right", padding: "8px" }}>
                      {fmt(l.quantity * discountedPrice)}
                    </td>
                  </tr>
                );
              })}
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
