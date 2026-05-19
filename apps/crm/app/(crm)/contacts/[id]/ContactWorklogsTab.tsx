import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@crm/ui";
import { Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";
import type { Worklog } from "@crm/types";

export function ContactWorklogsTab({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [worklogs, setWorklogs] = useState<Worklog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    apiJson<unknown[]>(`/api/worklogs?contact_id=${contactId}`, { signal: ac.signal })
      .then((data) => {
        const mapped = data.map((d: any) => ({
          ...d,
          work_date: new Date(d.work_date),
          created_at: new Date(d.created_at),
          updated_at: new Date(d.updated_at),
        }));
        setWorklogs(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [contactId]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Munkalapok</h3>
        <Button
          variant="primary"
          onClick={() => router.push(`/worklogs/new?contact_id=${contactId}`)}
        >
          <Plus size={16} className="mr-2" /> Új munkalap
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-center text-[var(--color-text-muted)]">Betöltés...</div>
      ) : worklogs.length === 0 ? (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          Nincsenek rögzített munkalapok ehhez a partnerhez.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--color-text-muted)] uppercase bg-[var(--color-bg-secondary)]">
              <tr>
                <th className="px-4 py-3">Sorszám</th>
                <th className="px-4 py-3">Dátum</th>
                <th className="px-4 py-3">Kategória</th>
                <th className="px-4 py-3">Technikus</th>
                <th className="px-4 py-3 text-center">Státusz</th>
                <th className="px-4 py-3 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {worklogs.map((w) => (
                <tr
                  key={w._id}
                  className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)]"
                >
                  <td className="px-4 py-3 font-medium">{w.worklog_number || "—"}</td>
                  <td className="px-4 py-3">
                    {w.work_date ? w.work_date.toLocaleDateString("hu-HU") : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {w.work_category}
                  </td>
                  <td className="px-4 py-3">{w.technician_name}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={w.status === "finalized" ? "success" : "warning"}>
                      {w.status === "finalized" ? "Véglegesítve" : "Piszkozat"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/worklogs/${w._id}`)}
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
