import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@crm/ui";
import { Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";
import type { Offer } from "@crm/types";

const statusLabel: Record<string, string> = {
  draft: "Piszkozat",
  sent: "Elküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

const statusVariant: Record<string, "default" | "info" | "success" | "error"> = {
  draft: "default",
  sent: "info",
  accepted: "success",
  rejected: "error",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export function ContactOffersTab({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    apiJson<unknown[]>(`/api/offers?contact_id=${contactId}`, {
      signal: ac.signal,
    })
      .then((data) => {
        const mapped = data.map((d: any) => ({
          ...d,
          created_at: new Date(d.created_at),
          updated_at: new Date(d.updated_at),
        }));
        setOffers(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [contactId]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Ajánlatok</h3>
        <Button
          variant="primary"
          onClick={() => router.push(`/offers/new?contact_id=${contactId}`)}
        >
          <Plus size={16} className="mr-2" /> Új ajánlat
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-center text-[var(--color-text-muted)]">Betöltés...</div>
      ) : offers.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          Nincsenek rögzített ajánlatok ehhez a partnerhez.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3">Sorszám</th>
                <th className="px-4 py-3">Megnevezés</th>
                <th className="px-4 py-3">Dátum</th>
                <th className="px-4 py-3 text-right">Bruttó érték</th>
                <th className="px-4 py-3 text-center">Státusz</th>
                <th className="px-4 py-3 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr
                  key={o._id}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)]"
                >
                  <td className="px-4 py-3 font-medium">{o.offer_number || "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)] font-medium">
                    {o.title || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {o.created_at ? o.created_at.toLocaleDateString("hu-HU") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {fmt(o.total_amount || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={statusVariant[o.status] ?? "default"}>
                      {statusLabel[o.status] ?? o.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/offers/${o._id}`)}
                    >
                      <Eye size={14} className="mr-1" /> Megnyitás
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
