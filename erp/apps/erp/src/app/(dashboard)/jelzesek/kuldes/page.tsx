import Link from "next/link";
import { requirePermission } from "@erp/auth";
import { jelzesApi, JELZES_PERMISSIONS } from "@erp/jelzes";
import {
  Badge,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@erp/ui";
import { formatJelzesDatum, JelzesTipusBadge } from "@/components/jelzes/jelzes-tipus";
import { permissionGroupLabel } from "@/components/admin/permission-group-labels";
import { KoruzenetForm } from "./_components/koruzenet-form";

const OLDAL_MERET = 20;

/** Körüzenet és frissítési jegyzet küldése (8l, #60) — `jelzes:kuld`. */
export default async function JelzesKuldesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(JELZES_PERMISSIONS.kuld);
  const sp = await searchParams;
  const oldalParam = Array.isArray(sp.oldal) ? sp.oldal[0] : sp.oldal;
  const oldal = Math.max(Number.parseInt(oldalParam ?? "1", 10) || 1, 1);
  const [opciok, kuldott] = await Promise.all([
    jelzesApi.cimzettOpciok(),
    jelzesApi.kuldottLista(oldal, OLDAL_MERET),
  ]);
  const oldalak = Math.max(Math.ceil(kuldott.osszes / OLDAL_MERET), 1);

  return (
    <Container className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Körüzenet küldése</h1>
        <p className="text-muted-foreground text-sm">
          Jelzés felhasználóknak, szerepköröknek, egy jogosultság birtokosainak vagy
          mindenkinek — igény szerint asztali értesítéssel is. A „Frissítési jegyzet”
          típus „Újdonság” jelöléssel jelenik meg.
        </p>
      </div>

      <KoruzenetForm
        felhasznalok={opciok.felhasznalok}
        szerepkorok={opciok.szerepkorok}
        jogosultsagok={opciok.jogosultsagok.map((j) => ({
          ...j,
          csoport: permissionGroupLabel(j.csoport),
        }))}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Elküldött jelzések</h2>
        {kuldott.sorok.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nem küldtél körüzenetet.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cím</TableHead>
                  <TableHead>Címzettek</TableHead>
                  <TableHead>Küldte</TableHead>
                  <TableHead>Időpont</TableHead>
                  <TableHead className="text-right">Olvasta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kuldott.sorok.map((s) => {
                  const arany = s.cimzettDb
                    ? Math.round((s.olvasottDb / s.cimzettDb) * 100)
                    : 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{s.cim}</span>
                          <JelzesTipusBadge tipus={s.tipus} />
                          {s.push && <Badge variant="outline">Push</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.cimzettLeiras || "—"} ({s.cimzettDb} fő)
                      </TableCell>
                      <TableCell className="text-sm">{s.kuldoNev ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatJelzesDatum(s.createdAt)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {s.olvasottDb} / {s.cimzettDb}{" "}
                        <span className="text-muted-foreground">({arany}%)</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {oldalak > 1 && (
          <div className="flex items-center justify-between text-sm">
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/jelzesek/kuldes?oldal=${oldal - 1}`}
                aria-disabled={oldal <= 1}
                className={cn(oldal <= 1 && "pointer-events-none opacity-50")}
              >
                Előző
              </Link>
            </Button>
            <span className="text-muted-foreground">
              {oldal}. oldal / {oldalak}
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/jelzesek/kuldes?oldal=${oldal + 1}`}
                aria-disabled={oldal >= oldalak}
                className={cn(oldal >= oldalak && "pointer-events-none opacity-50")}
              >
                Következő
              </Link>
            </Button>
          </div>
        )}
      </section>
    </Container>
  );
}
