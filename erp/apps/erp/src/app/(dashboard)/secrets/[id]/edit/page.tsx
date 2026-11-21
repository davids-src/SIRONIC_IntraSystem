import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { secretsApi } from "@erp/secrets";
import { SECRETS_PERMISSIONS as P } from "@erp/secrets/client";
import { Card, CardContent, CardHeader, CardTitle, Container } from "@erp/ui";
import { toSecretViewer } from "@/lib/secrets-viewer";
import { SecretForm } from "../../_components/secret-form";

export default async function EditSecretPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(P.write);
  const { id } = await params;
  const secret = await secretsApi.get(await toSecretViewer(user), id);
  if (!secret || !secret.muveletek.write) notFound();

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <h1 className="text-2xl font-bold">Titok szerkesztése</h1>
      <Card>
        <CardHeader>
          <CardTitle>{secret.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <SecretForm
            mode="edit"
            initial={{
              id: secret._id,
              name: secret.name,
              description: secret.description,
              partnerId: secret.partnerId,
            }}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
