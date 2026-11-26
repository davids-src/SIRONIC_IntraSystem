import { notFound } from "next/navigation";
import { PORTAL_PERMISSIONS } from "@erp/portal-auth/constants";
import { IgazolasDontes } from "@/components/igazolas-dontes";
import { IgazolasReszletek } from "@/components/igazolas-reszletek";
import { PageHeader } from "@/components/page";
import { acceptCertificateAction, rejectCertificateAction } from "@/lib/actions";
import { can } from "@/lib/nezo";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalIgazolas } from "@/lib/portal-api";

export const metadata = { title: "Teljesítésigazolás" };

export default async function IgazolasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nezo = await getPortalNezo();
  const d = await portalIgazolas(nezo, id);
  if (!d) notFound();
  return (
    <>
      <PageHeader title={d.cim} />
      <IgazolasReszletek d={d} />
      {d.allapot === "elkuldve" && can(nezo, PORTAL_PERMISSIONS.certificateDecide) && (
        <div className="mt-6">
          <IgazolasDontes
            accept={acceptCertificateAction.bind(null, d.id)}
            reject={rejectCertificateAction.bind(null, d.id)}
          />
        </div>
      )}
    </>
  );
}
