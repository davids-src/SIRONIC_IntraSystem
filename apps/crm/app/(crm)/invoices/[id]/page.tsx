import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage(_props: Props) {
  redirect("/invoices");
}
