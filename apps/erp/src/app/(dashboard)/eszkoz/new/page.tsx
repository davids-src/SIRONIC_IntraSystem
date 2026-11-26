import { requirePermission } from "@erp/auth";
import { FormPage } from "../_components/form/form-layout";
import { EszkozForm } from "../_components/eszkoz-form";

export default async function UjEszkozPage() {
  await requirePermission("eszkoz:eszkoz:write");
  return (
    <FormPage
      title="Új eszköz felvétele"
      subtitle="A *-gal jelölt mezők kötelezők."
      backHref="/eszkoz"
      backLabel="Vissza az eszközökhöz"
    >
      <EszkozForm />
    </FormPage>
  );
}
