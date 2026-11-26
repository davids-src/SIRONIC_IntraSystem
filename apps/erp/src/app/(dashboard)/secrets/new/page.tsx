import { requirePermission } from "@erp/auth";
import { SECRETS_PERMISSIONS as P } from "@erp/secrets/client";
import { Card, CardContent, CardHeader, CardTitle, Container } from "@erp/ui";
import { SecretForm } from "../_components/secret-form";

export default async function NewSecretPage() {
  await requirePermission(P.write);
  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <h1 className="text-2xl font-bold">Új titok</h1>
      <Card>
        <CardHeader>
          <CardTitle>Adatok</CardTitle>
        </CardHeader>
        <CardContent>
          <SecretForm mode="create" />
        </CardContent>
      </Card>
    </Container>
  );
}
