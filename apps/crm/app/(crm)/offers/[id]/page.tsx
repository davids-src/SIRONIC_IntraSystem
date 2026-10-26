"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { calculateOfferTotals } from "@crm/lib";
import {
  Clock,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
  CheckCircle,
  ShoppingCart,
  ChevronLeft,
  Edit,
  Eye,
  Download,
  Send,
  FolderKanban,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  PageHeader,
  UnifiedPdfTemplate,
  PdfPreviewModal,
  generatePdfFromElement,
} from "@crm/ui";
import type { Offer, Contact, CompanyDetails, Project, Settings } from "@crm/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n || 0);

// ─── PDF tétel szekció helper ─────────────────────────────────────────────────
function OfferLinesSection({ lines }: { lines: any[] }) {
  const tableHead = (
    <thead>
      <tr style={{ borderBottom: "2px solid #c41230", backgroundColor: "#f8fafc" }}>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Megnevezés
        </th>
        <th
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Menny.
        </th>
        <th
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Nettó egységár
        </th>
        <th
          style={{
            textAlign: "right",
            padding: "8px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#334155",
          }}
        >
          Nettó összesen
        </th>
      </tr>
    </thead>
  );

  const renderRow = (l: any, i: number) => {
    const discountedPrice = l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
    const isParent = l.is_group_parent;
    const children = isParent
      ? lines.filter((cl: any) => cl.group_id === l.group_id && !cl.is_group_parent)
      : [];
    return (
      <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
        <td style={{ padding: "7px 10px", fontWeight: 600, fontSize: "12px" }}>
          {l.description}
          {l.discount_percent ? (
            <span
              style={{
                marginLeft: "6px",
                color: "#16a34a",
                fontSize: "10px",
                fontWeight: 400,
              }}
            >
              (-{l.discount_percent}%)
            </span>
          ) : null}
          {isParent && children.length > 0 && (
            <div
              style={{
                fontWeight: 400,
                color: "#64748b",
                fontSize: "10px",
                marginTop: "2px",
              }}
            >
              {children.map((cl: any) => cl.description).join(" • ")}
            </div>
          )}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "7px 10px",
            fontSize: "12px",
            whiteSpace: "nowrap",
          }}
        >
          {l.quantity} {l.unit}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "7px 10px",
            fontSize: "12px",
            whiteSpace: "nowrap",
          }}
        >
          {fmt(discountedPrice)}
        </td>
        <td
          style={{
            textAlign: "right",
            padding: "7px 10px",
            fontSize: "12px",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {fmt(l.quantity * discountedPrice)}
        </td>
      </tr>
    );
  };

  // Szétválasztjuk a tételeket típus szerint
  const topLevel = lines.filter((l: any) => !l.group_id || l.is_group_parent);
  const products = topLevel.filter((l: any) => !l.line_type || l.line_type === "product");
  const services = topLevel.filter(
    (l: any) => l.line_type === "labor" || l.line_type === "service",
  );
  const hasProducts = products.length > 0;
  const hasServices = services.length > 0;
  const hasBoth = hasProducts && hasServices;

  const sectionLabel = (text: string, color: string) => (
    <tr>
      <td
        colSpan={4}
        style={{
          padding: "10px 10px 4px",
          fontSize: "10px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          color,
          borderBottom: `1px solid ${color}33`,
        }}
      >
        {text}
      </td>
    </tr>
  );

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "12px",
        marginBottom: "24px",
      }}
    >
      {tableHead}
      <tbody>
        {hasBoth ? (
          <>
            {sectionLabel("🔧 Termékek", "#0f172a")}
            {products.map((l: any, i: number) => renderRow(l, i))}
            {sectionLabel("⚙️ Munkadíj / Szolgáltatások", "#0f172a")}
            {services.map((l: any, i: number) => renderRow(l, i + products.length))}
          </>
        ) : hasProducts ? (
          <>
            {sectionLabel("🔧 Termékek", "#0f172a")}
            {products.map((l: any, i: number) => renderRow(l, i))}
          </>
        ) : (
          <>
            {sectionLabel("⚙️ Munkadíj / Szolgáltatások", "#0f172a")}
            {services.map((l: any, i: number) => renderRow(l, i))}
          </>
        )}
      </tbody>
    </table>
  );
}

const statusVariant: Record<string, "default" | "success" | "error" | "warning"> = {
  draft: "default",
  sent: "warning",
  accepted: "success",
  rejected: "error",
};
const statusLabel: Record<string, string> = {
  draft: "Piszkozat",
  sent: "Elküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

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

  // Follow-up and lost reason state
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [newFollowUpDate, setNewFollowUpDate] = useState("");
  const [newFollowUpNotes, setNewFollowUpNotes] = useState("");
  const [showLostModal, setShowLostModal] = useState(false);
  const [selectedLostReason, setSelectedLostReason] = useState<string>("price");
  const [customLostReason, setCustomLostReason] = useState("");

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

  const handleUpdateFollowUp = async () => {
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          follow_up_date: newFollowUpDate ? new Date(newFollowUpDate) : null,
          follow_up_notes: newFollowUpNotes || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOffer(updated);
        setIsUpdatingFollowUp(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkLost = async () => {
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          lost_reason: selectedLostReason,
          lost_reason_custom: selectedLostReason === "other" ? customLostReason : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOffer(updated);
        setShowLostModal(false);
      }
    } catch (e) {
      console.error(e);
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
        if (oData.follow_up_date) {
          setNewFollowUpDate(new Date(oData.follow_up_date).toISOString().slice(0, 10));
        }
        if (oData.follow_up_notes) {
          setNewFollowUpNotes(oData.follow_up_notes);
        }

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

  // Canonical calculations
  const calc = calculateOfferTotals(offer.lines);
  const totalNet = calc.discounted_net_total;
  const totalVat = calc.tax_total;
  const totalGross = calc.gross_total;

  // Follow-up calculations
  const isSent = offer.status === "sent";
  const daysSinceSent = offer.sent_at
    ? Math.floor((Date.now() - new Date(offer.sent_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isFollowUpOverdue =
    offer.follow_up_date &&
    new Date(offer.follow_up_date) < new Date() &&
    offer.status === "sent";

  const linkedProject = projects.find((p: any) => p.offer_id === id);

  const handleAcceptOffer = async () => {
    if (!confirm("Biztosan elfogadottra állítod ezt az ajánlatot?")) return;
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      if (!res.ok) throw new Error("Hiba történt az állapot mentése során.");
      const updated = await res.json();
      setOffer(updated);
    } catch (err) {
      alert((err as Error).message);
    }
  };

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
            {linkedProject ? (
              <Button
                variant="secondary"
                onClick={() => router.push(`/projects/${linkedProject._id}`)}
                className="border-emerald-600 text-emerald-400 hover:bg-emerald-950/40"
              >
                <FolderKanban size={16} className="mr-1.5" />
                Projekt: {linkedProject.project_number}
              </Button>
            ) : (
              <>
                {offer.status !== "accepted" && (
                  <Button
                    variant="secondary"
                    onClick={handleAcceptOffer}
                    className="text-emerald-400 hover:text-emerald-300 border-emerald-800"
                  >
                    <CheckCircle size={16} className="mr-1.5" /> Elfogadva
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() =>
                    router.push(
                      `/projects/new?offer_id=${id}&contact_id=${offer.contact_id || ""}`,
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <FolderKanban size={16} className="mr-1.5" /> Projekt létrehozása
                </Button>
              </>
            )}
            {offer.status !== "rejected" && (
              <Button
                variant="secondary"
                onClick={() => setShowLostModal(true)}
                className="text-red-400 hover:text-red-300"
              >
                <XCircle size={16} className="mr-1.5" /> Elutasítva
              </Button>
            )}
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

      {/* Follow-up Tracking Banner */}
      {isSent && (
        <div
          className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
            isFollowUpOverdue
              ? "bg-red-950/25 border-red-800/60 text-red-200"
              : "bg-slate-900 border-slate-800 text-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock
              size={20}
              className={
                isFollowUpOverdue ? "text-red-400 animate-pulse" : "text-amber-400"
              }
            />
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>Ajánlat utánkövetése</span>
                {daysSinceSent !== null && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                    {daysSinceSent} napja kiküldve
                  </span>
                )}
                {isFollowUpOverdue && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">
                    LEJÁRT UTÁNKÖVETÉS
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Következő utánkövetés:{" "}
                <span className="font-semibold text-slate-200">
                  {offer.follow_up_date
                    ? new Date(offer.follow_up_date).toLocaleDateString("hu-HU")
                    : "Nincs beállítva"}
                </span>
                {offer.follow_up_notes ? ` • Megjegyzés: ${offer.follow_up_notes}` : ""}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsUpdatingFollowUp(!isUpdatingFollowUp)}
          >
            {isUpdatingFollowUp ? "Bezárás" : "Utánkövetés módosítása"}
          </Button>

          {isUpdatingFollowUp && (
            <div className="w-full pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Új utánkövetési dátum
                </label>
                <input
                  type="date"
                  value={newFollowUpDate}
                  onChange={(e) => setNewFollowUpDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Utánkövetési megjegyzés
                </label>
                <input
                  type="text"
                  value={newFollowUpNotes}
                  onChange={(e) => setNewFollowUpNotes(e.target.value)}
                  placeholder="pl. Ügyfél visszahívást kért pénteken"
                  className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div className="flex items-end">
                <Button variant="primary" size="sm" onClick={handleUpdateFollowUp}>
                  Mentés
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lost Reason Banner if rejected */}
      {offer.status === "rejected" && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-400" />
            <span>
              Elvesztett ajánlat oka:{" "}
              <strong>
                {offer.lost_reason === "price"
                  ? "Ár / Drága"
                  : offer.lost_reason === "competitor"
                    ? "Konkurencia nyert"
                    : offer.lost_reason === "project_cancelled"
                      ? "Projekt elmaradt"
                      : offer.lost_reason === "internal_solution"
                        ? "Belső megoldás"
                        : offer.lost_reason === "no_response"
                          ? "Nincs válasz"
                          : offer.lost_reason === "timing"
                            ? "Időzítés nem megfelelő"
                            : offer.lost_reason === "technical_content"
                              ? "Műszaki tartalom"
                              : offer.lost_reason === "other"
                                ? offer.lost_reason_custom || "Egyéb"
                                : "Ismeretlen"}
              </strong>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowLostModal(true)}>
            Ok módosítása
          </Button>
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

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Offer Lines */}
        <Card className="p-6 lg:col-span-2 bg-slate-900 border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-100">Ajánlati tételek</h3>
            <Badge variant={statusVariant[offer.status]}>
              {statusLabel[offer.status]}
            </Badge>
          </div>

          <div className="flex flex-col gap-4">
            {offer.lines.map((l: any, i: number) => {
              if ((l as any).group_id && !(l as any).is_group_parent) return null;

              const discountedPrice =
                l.net_unit_price * (1 - (l.discount_percent ?? 0) / 100);
              const isParent = (l as any).is_group_parent;
              const children = isParent
                ? offer.lines.filter(
                    (cl: any) =>
                      (cl as any).group_id === (l as any).group_id &&
                      !(cl as any).is_group_parent,
                  )
                : [];

              return (
                <div
                  key={i}
                  className="flex justify-between items-start border-b border-slate-800 pb-4"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                      <span>{l.description}</span>
                      {l.discount_percent ? (
                        <Badge variant="success">-{l.discount_percent}%</Badge>
                      ) : null}
                      {l.line_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 uppercase">
                          {l.line_type === "labor"
                            ? "Munkadíj"
                            : l.line_type === "service"
                              ? "Szolgáltatás"
                              : "Termék"}
                        </span>
                      )}
                    </div>
                    {isParent && children.length > 0 && (
                      <div className="text-xs text-red-400 mt-1 break-words">
                        Csomag tartalma:{" "}
                        {children.map((cl: any) => cl.description).join(", ")}
                      </div>
                    )}
                    {!isParent && (
                      <div className="text-xs text-slate-400 mt-1">
                        {l.quantity} {l.unit} x {fmt(l.net_unit_price)}
                        {l.discount_percent
                          ? ` (Kedvezményes: ${fmt(discountedPrice)} / ${l.unit})`
                          : ""}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-sm text-slate-100">
                    {fmt(l.quantity * discountedPrice)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-2 text-sm border-t border-slate-800 pt-4">
            <div className="flex justify-between text-slate-400">
              <span>Nettó ajánlati érték:</span>
              <span>{fmt(totalNet)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>ÁFA:</span>
              <span>{fmt(totalVat)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
              <span className="text-slate-100">Bruttó összesen:</span>
              <span className="text-red-500">{fmt(totalGross)}</span>
            </div>
          </div>
        </Card>

        {/* Right 1 Col: Customer & Internal Margin Financial Summary */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="p-6 bg-slate-900 border-slate-800">
            <h3 className="font-bold text-base text-slate-100 mb-4">Ügyfél adatok</h3>
            <div className="text-sm flex flex-col gap-2">
              <div>
                <span className="text-slate-500 block text-xs uppercase mb-1">Név</span>
                <span className="font-medium text-slate-200">
                  {contact?.name || "Ismeretlen"}
                </span>
              </div>
              {contact?.email && (
                <div>
                  <span className="text-slate-500 block text-xs uppercase mb-1">
                    E-mail
                  </span>
                  <span className="text-slate-300">{contact.email}</span>
                </div>
              )}
              {contact?.phone && (
                <div>
                  <span className="text-slate-500 block text-xs uppercase mb-1">
                    Telefon
                  </span>
                  <span className="text-slate-300">{contact.phone}</span>
                </div>
              )}
            </div>

            {offer.notes && (
              <div className="mt-5 pt-4 border-t border-slate-800">
                <span className="text-slate-500 block text-xs uppercase mb-1">
                  Megjegyzések
                </span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap">
                  {offer.notes}
                </p>
              </div>
            )}
          </Card>

          {/* PÉNZÜGYI ÁTTEKINTÉS */}
          <Card className="p-6 bg-slate-900 border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-slate-400" />
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
                  Pénzügyi áttekintés
                </h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-semibold px-2 py-0.5 rounded border border-slate-700">
                BELSŐ
              </span>
            </div>

            {calc.has_historical_snapshot ? (
              <div className="space-y-2.5 text-xs">
                {/* Nettó eladási érték */}
                <div className="flex justify-between text-slate-400">
                  <span>Nettó eladási érték</span>
                  <span className="font-medium text-slate-200">
                    {fmt(calc.discounted_net_total)}
                  </span>
                </div>

                {/* Részletezés: anyag vs munkadíj */}
                {calc.product_revenue > 0 && (
                  <div className="flex justify-between text-slate-500 pl-2">
                    <span>Anyag / eszköz érték</span>
                    <span>{fmt(calc.product_revenue)}</span>
                  </div>
                )}
                {(calc.labor_revenue > 0 || calc.service_revenue > 0) && (
                  <div className="flex justify-between text-slate-500 pl-2">
                    <span>Munkadíj / szolgáltatás</span>
                    <span>{fmt(calc.labor_revenue + calc.service_revenue)}</span>
                  </div>
                )}

                {/* Beszerzési költség – semleges szín, pozitív szám */}
                <div className="pt-2 border-t border-slate-800/60">
                  <div className="flex justify-between text-slate-400">
                    <span>Beszerzési költség</span>
                    <span className="text-slate-300">
                      {fmt(calc.direct_purchase_cost)}
                    </span>
                  </div>
                </div>

                {/* Elválasztó + eredmény */}
                <div className="pt-3 border-t border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-200">Beszerzés után marad</span>
                    <span className="text-emerald-400">
                      {fmt(calc.calculated_margin)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-400">Maradó arány</span>
                    <span className="text-emerald-400 text-sm">
                      {calc.margin_percent}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400 italic text-center">
                Korábbi ajánlat – nincs történeti beszerzési költség rögzítve.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Lost Reason Dialog Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowLostModal(false)}
          />
          <div className="relative z-50 w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <XCircle size={18} className="text-red-400" />
              Elvesztett ajánlat rögzítése
            </h3>
            <p className="text-xs text-slate-400">
              Kérjük válassza ki az ajánlat elutasításának fő okát a statisztikai
              elemzéshez:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">
                  Elutasítás oka
                </label>
                <select
                  value={selectedLostReason}
                  onChange={(e) => setSelectedLostReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2"
                >
                  <option value="price">Ár / Drágának találták</option>
                  <option value="competitor">Konkurencia nyert</option>
                  <option value="project_cancelled">Projekt / beruházás elmaradt</option>
                  <option value="internal_solution">Belső megoldást választottak</option>
                  <option value="no_response">Nincs válasz az ügyféltől</option>
                  <option value="timing">Időzítés nem megfelelő</option>
                  <option value="technical_content">
                    Műszaki tartalom nem felelt meg
                  </option>
                  <option value="unknown">Ismeretlen</option>
                  <option value="other">Egyéb indok</option>
                </select>
              </div>

              {selectedLostReason === "other" && (
                <div>
                  <label className="text-slate-300 font-medium block mb-1">
                    Egyéb indok részletezése
                  </label>
                  <input
                    type="text"
                    value={customLostReason}
                    onChange={(e) => setCustomLostReason(e.target.value)}
                    placeholder="Indok leírása..."
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowLostModal(false)}
              >
                Mégse
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleMarkLost}>
                Mentés
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Container */}
      <div
        ref={printRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "210mm",
          backgroundColor: "#ffffff",
          color: "#000000",
          zIndex: -1,
        }}
      >
        <UnifiedPdfTemplate
          documentTitle="ÁRAJÁNLAT"
          documentId={offer.offer_number}
          date={new Date(offer.created_at)}
          validUntil={offer.valid_until || null}
          provider={provider}
          client={contact}
          showSignatures={false}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                fontSize: "15px",
                marginBottom: "8px",
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              {offer.title}
            </h3>
            {offer.notes && (
              <p
                style={{
                  fontSize: "11px",
                  color: "#475569",
                  marginBottom: "16px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {offer.notes}
              </p>
            )}
          </div>

          <OfferLinesSection lines={offer.lines} />

          <div
            style={{
              width: "260px",
              marginLeft: "auto",
              fontSize: "12px",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                color: "#475569",
              }}
            >
              <span>Nettó összesen:</span>
              <span>{fmt(totalNet)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                color: "#475569",
              }}
            >
              <span>ÁFA (27%):</span>
              <span>{fmt(totalVat)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "14px",
                paddingTop: "8px",
                borderTop: "2px solid #c41230",
                color: "#0f172a",
              }}
            >
              <span>Fizetendő (bruttó):</span>
              <span style={{ color: "#c41230" }}>{fmt(totalNet + totalVat)}</span>
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
          validUntil={offer.valid_until || null}
          provider={provider}
          client={contact}
          showSignatures={false}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{
                fontSize: "15px",
                marginBottom: "8px",
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              {offer.title}
            </h3>
            {offer.notes && (
              <p
                style={{
                  fontSize: "11px",
                  color: "#475569",
                  marginBottom: "16px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {offer.notes}
              </p>
            )}
          </div>

          <OfferLinesSection lines={offer.lines} />

          <div
            style={{
              width: "260px",
              marginLeft: "auto",
              fontSize: "12px",
              borderTop: "1px solid #e2e8f0",
              paddingTop: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                color: "#475569",
              }}
            >
              <span>Nettó összesen:</span>
              <span>{fmt(totalNet)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                color: "#475569",
              }}
            >
              <span>ÁFA (27%):</span>
              <span>{fmt(totalVat)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "14px",
                paddingTop: "8px",
                borderTop: "2px solid #c41230",
                color: "#0f172a",
              }}
            >
              <span>Fizetendő (bruttó):</span>
              <span style={{ color: "#c41230" }}>{fmt(totalNet + totalVat)}</span>
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
                {projects.map((p: any) => (
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
