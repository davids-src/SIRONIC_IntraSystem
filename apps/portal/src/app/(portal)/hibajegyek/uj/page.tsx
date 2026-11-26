import { Input, Label, Textarea } from "@erp/ui";
import { PORTAL_PERMISSIONS } from "@erp/portal-auth/constants";
import { HIBAJEGY_PRIORITAS_LABELS, HIBAJEGY_PRIORITASOK } from "@erp/szerviz/client";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page";
import { createTicketAction } from "@/lib/actions";
import { requirePortalPermission } from "@/lib/portal-nezo";

export const metadata = { title: "Új hibajegy" };

export default async function UjHibajegyPage() {
  await requirePortalPermission(PORTAL_PERMISSIONS.ticketCreate);
  return (
    <>
      <PageHeader title="Új hibajegy" description="Írja le a hibát vagy a kérést." />
      <div className="max-w-2xl">
        <ActionForm
          action={createTicketAction}
          submitLabel="Hibajegy beküldése"
          redirectTo="/hibajegyek/{id}"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="targy">Tárgy</Label>
            <Input id="targy" name="targy" required maxLength={200} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="leiras">Leírás</Label>
            <Textarea id="leiras" name="leiras" required rows={6} maxLength={8000} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="helyszin">Helyszín (nem kötelező)</Label>
            <Input id="helyszin" name="helyszin" maxLength={300} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="prioritas">Sürgősség</Label>
            <select
              id="prioritas"
              name="prioritas"
              defaultValue="kozepes"
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              {HIBAJEGY_PRIORITASOK.map((p) => (
                <option key={p} value={p}>
                  {HIBAJEGY_PRIORITAS_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
