import { requirePermission } from "@erp/auth";
import { KESZLET_PERMISSIONS as P } from "@erp/keszlet";
import { FormPage } from "../../../eszkoz/_components/form/form-layout";
import { RmaForm } from "../_components/rma-form";

export default async function UjRmaPage() {
  await requirePermission(P.rmaWrite);
  return (
    <FormPage
      title="Új RMA ügy"
      subtitle="Rögzítsd a beérkezett terméket és az ügyfelet."
      backHref="/keszlet/rma"
      backLabel="Vissza az RMA ügyekhez"
    >
      <RmaForm />
    </FormPage>
  );
}
