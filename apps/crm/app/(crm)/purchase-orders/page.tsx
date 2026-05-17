"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import { Plus, ShoppingCart, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseOrder, Supplier } from "@crm/types";

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

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [oRes, sRes] = await Promise.all([
          fetch("/api/purchase-orders"),
          fetch("/api/suppliers"),
        ]);
        const oData: PurchaseOrder[] = await oRes.json();
        const sData: Supplier[] = await sRes.json();
        setOrders(oData);
        setSuppliers(Object.fromEntries(sData.map((s) => [s._id, s])));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Megrendelőlapok"
        subtitle="Beszállítói megrendelések nyomkövetése"
        actions={
          <Button variant="primary" onClick={() => router.push("/purchase-orders/new")}>
            <Plus size={16} className="mr-2" /> Új megrendelő
          </Button>
        }
      />

      {loading ? (
        <div className="p-8 text-center text-gray-400">Betöltés...</div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-gray-400">Még nincs egyetlen megrendelőlap sem.</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push("/purchase-orders/new")}
          >
            <Plus size={16} className="mr-2" /> Első megrendelőlap
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                }}
              >
                {[
                  "Sorszám",
                  "Beszállító",
                  "Várható szállítás",
                  "Összeg",
                  "Állapot",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const supplier = suppliers[o.supplier_id];
                return (
                  <tr
                    key={o._id}
                    style={{
                      borderBottom: "1px solid var(--color-border-subtle)",
                      cursor: "pointer",
                    }}
                    onClick={() => router.push(`/purchase-orders/${o._id}`)}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                      }}
                    >
                      {o.order_number}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>
                        {supplier?.name ?? "Ismeretlen"}
                      </div>
                      {supplier?.partner_id && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--color-text-muted)",
                            fontFamily: "monospace",
                          }}
                        >
                          {supplier.partner_id}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {o.expected_delivery_date
                        ? new Date(o.expected_delivery_date).toLocaleDateString("hu-HU")
                        : "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      {fmt(o.total_amount)}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Badge variant={statusVariant[o.status]}>
                        {statusLabel[o.status]}
                      </Badge>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/purchase-orders/${o._id}`);
                        }}
                      >
                        <FileDown size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
