"use client";

import { PageHeader, Card, Badge, Button, UnifiedPdfTemplate } from "@crm/ui";
import { Download, ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PurchaseOrder, Supplier, Settings, CompanyDetails } from "@crm/types";

const statusVariant: Record<
  string,
  "default" | "info" | "success" | "error" | "warning"
> = {
  draft: "default",
  sent: "info",
  fulfilled: "success",
  cancelled: "error",
};
const statusLabel: Record<string, string> = {
  draft: "Piszkozat",
  sent: "Elküldve",
  fulfilled: "Teljesítve",
  cancelled: "Lemondva",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function PurchaseOrderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [provider, setProvider] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [oRes, sRes] = await Promise.all([
          fetch(`/api/purchase-orders/${id}`),
          fetch("/api/settings"),
        ]);
        const oData: PurchaseOrder = await oRes.json();
        setOrder(oData);

        if (sRes.ok) {
          const sData: Settings = await sRes.json();
          setProvider(sData.company_details ?? null);
        }

        const supRes = await fetch(`/api/suppliers/${oData.supplier_id}`);
        if (supRes.ok) setSupplier(await supRes.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const el = printRef.current;
    el.style.display = "block";
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .from(el)
        .set({
          margin: 0,
          filename: `Megrendelo_${order?.order_number || id}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: {
            unit: "mm" as const,
            format: "a4" as const,
            orientation: "portrait" as const,
          },
        })
        .save();
    } catch {
      alert("PDF generálási hiba.");
    } finally {
      el.style.display = "none";
    }
  };

  const handleStatusChange = async (newStatus: "fulfilled" | "cancelled" | "sent") => {
    if (
      newStatus === "fulfilled" &&
      !confirm(
        "Biztosan teljesítettnek jelölöd a megrendelőlapot? A tételek automatikusan bevételezésre kerülnek a raktárba.",
      )
    ) {
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setOrder(updated);
      alert("Státusz sikeresen frissítve!");
    } catch {
      alert("Hiba történt a státusz frissítése során.");
    } finally {
      setUpdating(false);
    }
  };

  // Build a Contact-compatible client object from supplier for UnifiedPdfTemplate
  const supplierAsClient = supplier
    ? {
        _id: supplier._id,
        partner_id: supplier.partner_id,
        contact_number: supplier.partner_id,
        tenantId: supplier.tenantId,
        type: "company" as const,
        name: supplier.name,
        short_name: null,
        tax_number: supplier.tax_number,
        registration_number: supplier.registration_number,
        address: { street: supplier.headquarters ?? "", city: "", zip: "", country: "" },
        billing_address: null,
        contact_persons: [],
        phone: supplier.phone,
        email: supplier.email,
        notes: supplier.notes,
        tags: [],
        has_portal_access: false,
        portal_permissions: {} as never,
        active_services: [],
        contract_type: null,
        created_at: new Date(),
        updated_at: new Date(),
      }
    : null;

  if (loading) return <div className="p-8 text-center text-gray-400">Betöltés...</div>;
  if (!order) return <div className="p-8 text-red-400">Megrendelőlap nem található.</div>;

  const totalNet = order.lines.reduce((s, l) => s + l.net_unit_price * l.quantity, 0);
  const totalVat = order.lines.reduce(
    (s, l) => s + l.net_unit_price * l.quantity * (l.tax_rate / 100),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Megrendelőlap: ${order.order_number}`}
        subtitle={supplier?.name ?? "Ismeretlen beszállító"}
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/purchase-orders")}>
              <ChevronLeft size={16} /> Vissza
            </Button>
            {order.status === "draft" && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange("sent")}
                disabled={updating}
              >
                Elküldés
              </Button>
            )}
            {(order.status === "sent" || order.status === "draft") && (
              <Button
                variant="primary"
                onClick={() => handleStatusChange("fulfilled")}
                disabled={updating}
              >
                Beérkezett (Teljesítve)
              </Button>
            )}
            {order.status !== "fulfilled" && order.status !== "cancelled" && (
              <Button
                variant="ghost"
                onClick={() => handleStatusChange("cancelled")}
                disabled={updating}
                style={{ color: "#f87171" }}
              >
                Lemondás
              </Button>
            )}
            <Button variant="secondary" onClick={handleDownloadPdf}>
              <Download size={16} className="mr-2" /> PDF Letöltés
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tételek */}
        <Card className="md:col-span-2 p-0 overflow-hidden">
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontWeight: 700 }}>Megrendelt tételek</h3>
            <Badge variant={statusVariant[order.status]}>
              {statusLabel[order.status]}
            </Badge>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr
                style={{
                  background: "var(--color-bg-secondary)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                {["Megnevezés", "Mennyiség", "Nettó egységár", "Nettó összesen"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {l.description}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {l.quantity} {l.unit}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{fmt(l.net_unit_price)}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                    {fmt(l.net_unit_price * l.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ minWidth: "220px", fontSize: "13px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                  color: "var(--color-text-muted)",
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
                  color: "var(--color-text-muted)",
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
                  fontSize: "15px",
                }}
              >
                <span>Bruttó összesen:</span>
                <span>{fmt(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Info oldalsáv */}
        <Card className="p-6">
          <h3 style={{ fontWeight: 700, marginBottom: "16px" }}>Részletek</h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              fontSize: "13px",
            }}
          >
            <div>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  display: "block",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                Beszállító
              </span>
              <span style={{ fontWeight: 600 }}>{supplier?.name ?? "—"}</span>
              {supplier?.partner_id && (
                <span
                  style={{
                    display: "block",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {supplier.partner_id}
                </span>
              )}
            </div>
            {supplier?.tax_number && (
              <div>
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    display: "block",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                  }}
                >
                  Adószám
                </span>
                <span>{supplier.tax_number}</span>
              </div>
            )}
            <div>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  display: "block",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                Várható szállítás
              </span>
              <span>
                {order.expected_delivery_date
                  ? new Date(order.expected_delivery_date).toLocaleDateString("hu-HU")
                  : "—"}
              </span>
            </div>
            {order.notes && (
              <div>
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    display: "block",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Megjegyzések
                </span>
                <p style={{ whiteSpace: "pre-wrap" }}>{order.notes}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Rejtett PDF */}
      <div style={{ display: "none" }} ref={printRef}>
        <UnifiedPdfTemplate
          documentTitle="MEGRENDELŐLAP"
          documentId={order.order_number}
          date={new Date(order.created_at)}
          provider={provider}
          client={supplierAsClient}
          showSignatures={true}
        >
          {/* Szállítási határidő */}
          {order.expected_delivery_date && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                background: "#f0f7ff",
                borderRadius: "6px",
                borderLeft: "4px solid #3b82f6",
              }}
            >
              <strong style={{ fontSize: "12px" }}>Várható szállítási határidő:</strong>{" "}
              <span style={{ fontSize: "13px" }}>
                {new Date(order.expected_delivery_date).toLocaleDateString("hu-HU")}
              </span>
            </div>
          )}

          {/* Tételek */}
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
                <th style={{ padding: "8px", textAlign: "left" }}>Megnevezés</th>
                <th style={{ padding: "8px", textAlign: "center" }}>Menny.</th>
                <th style={{ padding: "8px", textAlign: "center" }}>Egység</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Nettó egységár</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Nettó összesen</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{l.description}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{l.quantity}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{l.unit}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {fmt(l.net_unit_price)}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {fmt(l.net_unit_price * l.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Összesen */}
          <div style={{ width: "260px", marginLeft: "auto", fontSize: "12px" }}>
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
                borderTop: "2px solid #000",
                paddingTop: "8px",
                marginTop: "8px",
              }}
            >
              <span>Fizetendő bruttó:</span>
              <span>{fmt(order.total_amount)}</span>
            </div>
          </div>

          {order.notes && (
            <div
              style={{
                marginTop: "30px",
                padding: "12px",
                background: "#f8f9fa",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            >
              <strong>Megjegyzés:</strong> {order.notes}
            </div>
          )}
        </UnifiedPdfTemplate>
      </div>
    </div>
  );
}
