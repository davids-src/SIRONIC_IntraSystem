import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@crm/ui";
import { Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";
import type { CompletionCertificate } from "@crm/types";

export function ContactCertificatesTab({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [certs, setCerts] = useState<CompletionCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    apiJson<unknown[]>(`/api/completion-certificates?contact_id=${contactId}`, {
      signal: ac.signal,
    })
      .then((data) => {
        const mapped = data.map((d: any) => ({
          ...d,
          created_at: new Date(d.created_at),
          updated_at: new Date(d.updated_at),
        }));
        setCerts(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [contactId]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
          Teljesítési igazolások
        </h3>
        <Button
          variant="primary"
          onClick={() =>
            router.push(`/completion-certificates/new?contact_id=${contactId}`)
          }
        >
          <Plus size={16} className="mr-2" /> Új igazolás
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-center text-[var(--color-text-muted)]">Betöltés...</div>
      ) : certs.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          Nincsenek rögzített igazolások ehhez a partnerhez.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3">Sorszám</th>
                <th className="px-4 py-3">Projekt / Tárgy</th>
                <th className="px-4 py-3">Dátum</th>
                <th className="px-4 py-3 text-center">Státusz</th>
                <th className="px-4 py-3 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr
                  key={c._id}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)]"
                >
                  <td className="px-4 py-3 font-medium">{c.certificate_number || "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {c.title || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.created_at.toLocaleDateString("hu-HU")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={
                        c.status === "accepted"
                          ? "success"
                          : c.status === "rejected"
                            ? "error"
                            : c.status === "sent"
                              ? "info"
                              : "default"
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/completion-certificates/${c._id}`)}
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
