import { redirect } from "next/navigation";
import { requireAuth } from "@erp/auth";

export default async function ErtekesitesIndex() {
  const user = await requireAuth();
  const p = user.permissions;
  if (p.includes("ertekesites:ajanlat:read")) redirect("/ertekesites/ajanlatok");
  if (p.includes("ertekesites:szerzodes:read")) redirect("/ertekesites/szerzodesek");
  redirect("/ertekesites/megrendelok");
}
