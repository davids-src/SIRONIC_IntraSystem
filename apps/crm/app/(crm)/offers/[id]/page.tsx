"use client";

import {
  PageHeader,
  Card,
  Badge,
  Button,
  UnifiedPdfTemplate,
  PdfPreviewModal,
  generatePdfFromElement,
} from "@crm/ui";
import {
  Download,
  Edit,
  ChevronLeft,
  Send,
  Eye,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import type { Contact, Offer, CompanyDetails, Settings, Project } from "@crm/types";

const statusVariant = {
  draft: "default",
  ready: "warning",
  sent: "info",
  accepted: "success",
  rejected: "error",
} as const;

const statusLabel = {
  draft: "Piszkozat",
  ready: "Elkészült",
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

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
        // Projektek betöltése az import modalhoz
        const pRes = await fetch("/api/projects", { signal: ac.signal });
        if (pRes.ok) {
          const pData = await pRes.json();
          setProjects(pData.filter((p: any) => p.status !== "closed"));
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
    try {
      await generatePdfFromElement(
        printRef.current,
        `Arajanlat_${offer?.offer_number || id}.pdf`,
      );
    } catch (e) {
      console.error("PDF generálási hiba:", e);
      alert("Hiba történt a PDF generálása során.");
    }
  };

  const handleImport = async () => {
    if (!selectedProjectId) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/offers/${id}/import-to-shopping-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: selectedProjectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import sikertelen.");
      setShowImportModal(false);
      setImportSuccess(
        `Sikeresen importálva ${data.imported_count} tétel a projekt bevásárlólistájára.`,
      );
      setTimeout(() => setImportSuccess(null), 6000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  if (loadErr) return <div className="p-8 text-red-500">{loadErr}</div>;
  if (!offer) return <div className="p-8">Betöltés...</div>;

  const totalNet = offer.lines.reduce((sum, l) => {
    if ((l as any).group_id && !(l as any).is_group_parent) return sum;
    return sum + l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100) * l.quantity;
  }, 0);
  const totalVat = offer.lines.reduce((sum, l) => {
    if ((l as any).group_id && !(l as any).is_group_parent) return sum;
    return (
      sum +
      l.net_unit_price *
        (1 - (l.discount_percent ?? 0) / 100) *
        l.quantity *
        (l.tax_rate / 100)
    );
  }, 0);

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
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedProjectId("");
                setShowImportModal(true);
              }}
            >
              <ShoppingCart size={16} className="mr-2" /> Importálás bevásárlólistába
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/offers/${id}/edit`)}>
              <Edit size={16} className="mr-2" /> Szerkesztés
            </Button>
            <Button variant="secondary" onClick={() => setShowPreviewModal(true)}>
              <Eye size={16} className="mr-2" /> Előnézet
            </Button>
            <Button variant="secondary" onClick={() => setShowPreviewModal(true)}>
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

      {importSuccess && (
        <div className="bg-green-950/30 text-green-400 p-4 rounded-lg border border-green-900/50 flex items-center gap-2">
          <CheckCircle size={16} />
          {importSuccess}
          <button
            className="ml-auto text-green-400/60 hover:text-green-400"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setImportSuccess(null)}
          >
            ×
          </button>
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
              if ((l as any).group_id && !(l as any).is_group_parent) return null;

              const discountedPrice =
                l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
              const isParent = (l as any).is_group_parent;
              const children = isParent
                ? offer.lines.filter(
                    (cl) =>
                      (cl as any).group_id === (l as any).group_id &&
                      !(cl as any).is_group_parent,
                  )
                : [];

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
                    {isParent && children.length > 0 && (
                      <div className="text-xs text-gray-400 mt-1 italic">
                        Tartalmazza:{" "}
                        {children
                          .map((cl) => `${cl.quantity} ${cl.unit} ${cl.description}`)
                          .join(", ")}
                      </div>
                    )}
                    {!isParent && (
                      <div className="text-xs text-gray-400 mt-1">
                        {l.quantity} {l.unit} x {fmt(l.net_unit_price)}
                        {l.discount_percent
                          ? ` (Kedvezményes: ${fmt(discountedPrice)} / ${l.unit})`
                          : ""}
                      </div>
                    )}
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
              <span className="text-red-500">{fmt(totalNet + totalVat)}</span>
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
      <div
        ref={printRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0px",
          width: "210mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          zIndex: 99999,
        }}
      >
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
              <span>{fmt(totalNet + totalVat)}</span>
            </div>
          </div>
        </UnifiedPdfTemplate>
      </div>

      {/* PDF Előnézet Modal */}
      <PdfPreviewModal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        filename={`Arajanlat_${offer.offer_number}.pdf`}
        title={`Árajánlat előnézet — ${offer.offer_number}`}
      >
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
              <span>{fmt(totalNet + totalVat)}</span>
            </div>
          </div>
        </UnifiedPdfTemplate>
      </PdfPreviewModal>

      {/* Import bevásárlólistába modal */}
      {showImportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              width: "100%",
              maxWidth: "480px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart size={20} style={{ color: "var(--color-accent-primary)" }} />
              <h2 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                Importálás bevásárlólistába
              </h2>
            </div>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "20px",
              }}
            >
              Válassz projektet, amelyhez az árajánlat termék-tételeit importálni
              szeretnéd. A meglévő bevásárlólista felülíródik.
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-muted)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Projekt kiválasztása
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border-default)",
                  background: "var(--color-bg-input, #0a0a0a)",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                }}
              >
                <option value="">-- Válassz projektet --</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.project_number} – {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                Mégse
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleImport()}
                disabled={!selectedProjectId || importing}
              >
                <ShoppingCart size={15} style={{ marginRight: "6px" }} />
                {importing ? "Importálás..." : "Importálás"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
