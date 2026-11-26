import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@erp/auth";
import { secretsApi } from "@erp/secrets";
import { ACCESS_ACTION_LABELS, SECRETS_PERMISSIONS as P } from "@erp/secrets/client";
import { Button, Card, CardContent, CardHeader, CardTitle, Container } from "@erp/ui";
import { formatDateTime } from "@erp/lib/utils";
import { toSecretViewer } from "@/lib/secrets-viewer";
import { DeleteSecretButton } from "../_components/delete-button";
import { RevealButton } from "../_components/reveal-button";
import { ShareDialog } from "../_components/share-dialog";

const formatDateTimeHu = (d: string) => formatDateTime(d, "hu-HU");

export default async function SecretPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(P.read);
  const { id } = await params;
  const viewer = await toSecretViewer(user);
  const secret = await secretsApi.get(viewer, id);
  if (!secret) notFound();

  const m = secret.muveletek;
  const [shares, targets, log] = await Promise.all([
    m.share ? secretsApi.listShares(viewer, id) : null,
    m.share ? secretsApi.listShareTargets(viewer) : null,
    secret.ownerId === viewer.userId ? secretsApi.listAccessLog(viewer, id) : null,
  ]);

  return (
    <Container className="flex max-w-3xl flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{secret.name}</h1>
          {secret.description && (
            <p className="text-muted-foreground text-sm">{secret.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/secrets">Vissza a listához</Link>
          </Button>
          {m.write && (
            <Button asChild variant="outline">
              <Link href={`/secrets/${id}/edit`}>Szerkesztés</Link>
            </Button>
          )}
          {m.share && shares && targets && (
            <ShareDialog
              secretId={id}
              shares={shares}
              users={targets.users}
              roles={targets.roles}
            />
          )}
          {m.delete && <DeleteSecretButton id={id} name={secret.name} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Érték</CardTitle>
        </CardHeader>
        <CardContent>
          {m.reveal ? (
            <RevealButton id={id} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Az érték megjelenítéséhez nincs jogosultságod.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adatok</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Tulajdonos: </span>
            {secret.ownerName ?? secret.ownerId}
          </div>
          <div>
            <span className="text-muted-foreground">Partner: </span>
            {secret.partnerId ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Létrehozva: </span>
            {formatDateTimeHu(secret.createdAt)}
          </div>
          <div>
            <span className="text-muted-foreground">Frissítve: </span>
            {formatDateTimeHu(secret.updatedAt)}
          </div>
        </CardContent>
      </Card>

      {log && (
        <Card>
          <CardHeader>
            <CardTitle>Hozzáférési napló</CardTitle>
          </CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <p className="text-muted-foreground text-sm">Még nem jelenítették meg.</p>
            ) : (
              <ul className="divide-y text-sm">
                {log.map((l) => (
                  <li key={l._id} className="flex justify-between gap-2 py-1.5">
                    <span>
                      {l.userName ?? l.userId} · {ACCESS_ACTION_LABELS[l.action]}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTimeHu(l.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
