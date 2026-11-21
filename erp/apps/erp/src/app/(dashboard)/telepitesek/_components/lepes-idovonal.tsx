"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge, Button, Input } from "@erp/ui";
import {
  LEPES_ALLAPOT_LABELS,
  LEPES_ALLAPOT_TONES,
  type LepesAllapot,
} from "@erp/deployments/client";
import { kovetkezoLepesekAction, lepesAction, type LepesMuvelet } from "../actions";

export type LepesNezet = {
  kulcs: string;
  cimke: string;
  allapot: LepesAllapot;
  kulsoId?: string;
  uzenet?: string;
  utolsoHiba?: string;
  befejezve?: string;
  kihagyhato: boolean;
  fuggosegek: string[];
  nameServers?: string[];
};

const datum = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" })
    : undefined;

/**
 * The pipeline as a timeline: per step run / dry-run / adopt / verify / skip buttons. The buttons
 * a viewer may not use are simply not rendered (the actions check the permission again).
 */
export function LepesIdovonal({
  telepitesId,
  lepesek,
  futtathat,
  szerkesztheto,
  lezart,
}: {
  telepitesId: string;
  lepesek: LepesNezet[];
  futtathat: boolean;
  szerkesztheto: boolean;
  lezart: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dolgozik, setDolgozik] = useState<string | null>(null);
  const [adopt, setAdopt] = useState<Record<string, string>>({});
  const [nyitottAdopt, setNyitottAdopt] = useState<string | null>(null);
  const [extra, setExtra] = useState<Record<string, string>>({});

  const fut = (
    kulcs: string,
    mod: LepesMuvelet,
    opciok: Parameters<typeof lepesAction>[3] = {},
  ) => {
    setDolgozik(`${kulcs}:${mod}`);
    start(async () => {
      const r = await lepesAction(telepitesId, kulcs, mod, opciok);
      if (r.success) toast.success(r.message);
      else toast.error(r.message ?? "A művelet nem sikerült.");
      if (r.elteresek?.length) toast.message(`Eltérések: ${r.elteresek.join(", ")}`);
      setDolgozik(null);
      router.refresh();
    });
  };

  const mind = () => {
    setDolgozik("mind");
    start(async () => {
      const r = await kovetkezoLepesekAction(telepitesId);
      if (r.success) toast.success(r.message);
      else toast.error(r.message ?? "A futás megállt.");
      setDolgozik(null);
      router.refresh();
    });
  };

  const gombok = !lezart && futtathat;
  const foglalt = pending;

  return (
    <div className="flex flex-col gap-3">
      {gombok && (
        <div className="flex justify-end">
          <Button
            onClick={mind}
            loading={dolgozik === "mind"}
            disabled={foglalt}
            variant="outline"
          >
            Következő lépések futtatása
          </Button>
        </div>
      )}
      <ol className="flex flex-col gap-3">
        {lepesek.map((l, i) => {
          const kesz = l.allapot === "kesz" || l.allapot === "adoptalva";
          const extraKell = l.kulcs === "ssl_tanusitvany" || l.kulcs === "image_epites";
          return (
            <li key={l.kulcs} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">{i + 1}.</span>
                  <span className="font-medium">{l.cimke}</span>
                  <Badge variant={LEPES_ALLAPOT_TONES[l.allapot]}>
                    {LEPES_ALLAPOT_LABELS[l.allapot]}
                  </Badge>
                  {l.kulsoId && (
                    <span className="text-muted-foreground font-mono text-xs">
                      #{l.kulsoId}
                    </span>
                  )}
                </div>
                {datum(l.befejezve) && (
                  <span className="text-muted-foreground text-xs">
                    {datum(l.befejezve)}
                  </span>
                )}
              </div>
              {l.utolsoHiba && (
                <p className="text-danger-soft-foreground mt-2 text-sm">{l.utolsoHiba}</p>
              )}
              {l.uzenet && !l.utolsoHiba && (
                <p className="text-muted-foreground mt-2 text-sm">{l.uzenet}</p>
              )}
              {l.nameServers && l.nameServers.length > 0 && (
                <p className="mt-1 font-mono text-xs">NS: {l.nameServers.join(", ")}</p>
              )}
              {l.fuggosegek.length > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Függ: {l.fuggosegek.join(", ")}
                </p>
              )}

              {gombok && (
                <div className="mt-3 flex flex-col gap-2" data-export="skip">
                  {extraKell && l.allapot !== "kihagyva" && !kesz && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {l.kulcs === "image_epites" ? (
                        <>
                          <Input
                            placeholder="GitHub owner"
                            value={extra.owner ?? ""}
                            onChange={(e) =>
                              setExtra({ ...extra, owner: e.target.value })
                            }
                          />
                          <Input
                            placeholder="GitHub repo"
                            value={extra.repo ?? ""}
                            onChange={(e) => setExtra({ ...extra, repo: e.target.value })}
                          />
                        </>
                      ) : (
                        <Input
                          className="sm:col-span-2"
                          placeholder="NPM DNS-01 hitelesítő (dns_cloudflare_api_token = …)"
                          type="password"
                          autoComplete="off"
                          value={extra.dns_provider_credentials ?? ""}
                          onChange={(e) =>
                            setExtra({
                              ...extra,
                              dns_provider_credentials: e.target.value,
                            })
                          }
                        />
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {l.allapot !== "kihagyva" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={foglalt}
                          loading={dolgozik === `${l.kulcs}:dry-run`}
                          onClick={() => fut(l.kulcs, "dry-run", { input: extra })}
                        >
                          Terv (dry-run)
                        </Button>
                        <Button
                          size="sm"
                          disabled={foglalt}
                          loading={dolgozik === `${l.kulcs}:futtat`}
                          onClick={() =>
                            fut(l.kulcs, kesz ? "force" : "futtat", { input: extra })
                          }
                        >
                          {kesz
                            ? "Újrafuttatás"
                            : l.allapot === "hibas"
                              ? "Újra"
                              : "Futtatás"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={foglalt}
                          onClick={() =>
                            setNyitottAdopt(nyitottAdopt === l.kulcs ? null : l.kulcs)
                          }
                        >
                          Adoptálás
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={foglalt}
                          loading={dolgozik === `${l.kulcs}:ellenoriz`}
                          onClick={() => fut(l.kulcs, "ellenoriz")}
                        >
                          Ellenőrzés
                        </Button>
                      </>
                    )}
                    {szerkesztheto &&
                      l.kihagyhato &&
                      !kesz &&
                      l.allapot !== "kihagyva" &&
                      l.allapot !== "fut" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={foglalt}
                          onClick={() =>
                            fut(l.kulcs, "kihagy", { ok: "Kézzel kihagyva" })
                          }
                        >
                          Kihagyás
                        </Button>
                      )}
                    {szerkesztheto && l.allapot === "kihagyva" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={foglalt}
                        onClick={() => fut(l.kulcs, "visszavon")}
                      >
                        Kihagyás visszavonása
                      </Button>
                    )}
                  </div>
                  {nyitottAdopt === l.kulcs && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Meglévő erőforrás azonosítója (zóna / cert / host / stack / tag)"
                        value={adopt[l.kulcs] ?? ""}
                        onChange={(e) =>
                          setAdopt({ ...adopt, [l.kulcs]: e.target.value })
                        }
                      />
                      <Button
                        size="sm"
                        disabled={foglalt || !(adopt[l.kulcs] ?? "").trim()}
                        onClick={() =>
                          fut(l.kulcs, "adoptal", { kulsoId: adopt[l.kulcs] })
                        }
                      >
                        Adoptál
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
