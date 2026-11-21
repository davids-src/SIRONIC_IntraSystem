import { requirePermission } from "@erp/auth";
import { KESZLET_PERMISSIONS as P, canSeeErtek, keszletApi } from "@erp/keszlet";
import { FormPage } from "../../eszkoz/_components/form/form-layout";
import { BevetelWizard } from "./_components/bevetel-wizard";

export default async function BevetelPage() {
  const user = await requirePermission(P.bevetelWrite);
  const helyek = await keszletApi.listRaktarhelyek();
  return (
    <FormPage
      title="Bevételezés"
      subtitle="Válaszd ki a termékeket, add meg a mennyiséget és a raktárhelyet, majd ellenőrizd és rögzítsd."
      backHref="/keszlet"
      backLabel="Vissza a műszerfalra"
      width="max-w-4xl"
    >
      <BevetelWizard
        helyek={helyek.map((h) => ({ kod: h.kod, nev: h.nev }))}
        mutatAr={canSeeErtek({ userId: user.id, permissions: user.permissions })}
      />
    </FormPage>
  );
}
