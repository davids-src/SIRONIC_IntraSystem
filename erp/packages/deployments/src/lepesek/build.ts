import {
  kliens,
  lepesAdat,
  OrchestratorHiba,
  type LepesInput,
  type LepesKezelo,
  type LepesKontextus,
} from "./tipusok";

const gh = (ctx: LepesKontextus) => kliens(ctx.kliensek, "github");
const pt = (ctx: LepesKontextus) => kliens(ctx.kliensek, "portainer");

function tulajRepo(input: LepesInput | undefined): { owner: string; repo: string } {
  const owner = input?.owner;
  const repo = input?.repo;
  if (typeof owner !== "string" || typeof repo !== "string" || !owner || !repo) {
    throw new OrchestratorHiba(
      "OWNER_REPO_KELL",
      "Hiányzik a GitHub owner/repo (input.owner, input.repo).",
    );
  }
  return { owner, repo };
}

export const imageEpitesLepes: LepesKezelo = {
  kulcs: "image_epites",

  async terv(ctx) {
    const wf = ctx.telepites.image.workflowId;
    return {
      osszegzes: wf
        ? `GitHub Actions workflow indítása: ${wf} (${ctx.telepites.image.workflowRef ?? "main"})`
        : "Nincs megadva GitHub workflow — az image build kihagyható, ha az image már elérhető a GHCR-en.",
      valtoztatasok: wf
        ? [{ szolgaltato: "github", muvelet: "workflow_inditas", cel: wf }]
        : [],
      figyelmeztetesek: wf ? [] : ["Nincs workflow azonosító megadva."],
    };
  },

  async vegrehajt(ctx, input) {
    const wf = ctx.telepites.image.workflowId;
    if (!wf) {
      throw new OrchestratorHiba("WORKFLOW_HIANYZIK", "Nincs megadva GitHub workflow azonosító.");
    }
    const { owner, repo } = tulajRepo(input);
    const ref = ctx.telepites.image.workflowRef ?? "main";
    const kliensGh = gh(ctx);
    const inditva = ctx.most.getTime();
    await kliensGh.dispatchWorkflow(owner, repo, wf, ref, undefined);
    const futasok = await kliensGh.listWorkflowRuns(owner, repo, wf, {
      branch: ref,
      perPage: 5,
    });
    const futas =
      futasok.find((f) => (f.created_at ? Date.parse(f.created_at) : 0) >= inditva - 5000) ??
      futasok[0];
    if (!futas) {
      throw new OrchestratorHiba("FUTAS_NINCS", "Nem található futás a workflow indítása után.");
    }
    const kesz = await kliensGh.waitForRun(owner, repo, futas.id);
    if (kesz.conclusion !== "success") {
      throw new OrchestratorHiba(
        "BUILD_SIKERTELEN",
        `A GitHub Actions futás sikertelen (${kesz.conclusion}).`,
      );
    }
    return {
      allapot: "kesz",
      kulsoId: String(kesz.id),
      uzenet: "Image build sikeres.",
      kulsoIdkPatch: { githubUtolsoFutasId: kesz.id },
    };
  },

  async adoptal(_ctx, input) {
    const digest = typeof input.digest === "string" ? input.digest : null;
    return {
      allapot: "adoptalva",
      kulsoId: input.kulsoId,
      uzenet: "Image tag hozzárendelve futtatás nélkül.",
      meta: { adopted_tag: input.kulsoId },
      kulsoIdkPatch: { imageDigest: digest },
      telepitesPatch: { "image.tag": input.kulsoId },
    };
  },

  async ellenoriz(ctx) {
    if (!ctx.telepites.image.repo || !ctx.telepites.image.tag) {
      return { ok: false, elteresek: ["image_not_set"], uzenet: "Nincs megadva image repo/tag." };
    }
    return {
      ok: true,
      elteresek: [],
      uzenet:
        "Best-effort ellenőrzés: image repo/tag megadva (GHCR digest ellenőrzés nélkül).",
    };
  },
};

export const stackLetrehozasLepes: LepesKezelo = {
  kulcs: "stack_letrehozas",

  async terv(ctx) {
    const nev = ctx.telepites.stack.nev;
    return {
      osszegzes: `Portainer stack létrehozása: ${nev ?? "(nincs megadva név)"}`,
      valtoztatasok: nev
        ? [{ szolgaltato: "portainer", muvelet: "stack_letrehozas", cel: nev }]
        : [],
      figyelmeztetesek:
        ctx.telepites.stack.sablonId || ctx.telepites.stack.composeYaml
          ? []
          : ["Nincs kiválasztva stack sablon."],
    };
  },

  async vegrehajt(ctx) {
    const nev = ctx.telepites.stack.nev;
    if (!nev) {
      throw new OrchestratorHiba("STACK_NEV_HIANYZIK", "Nincs megadva a Portainer stack neve.");
    }
    const render = await ctx.stackRender();
    if (render.hianyzo.length > 0) {
      throw new OrchestratorHiba(
        "SABLON_HIANYZO",
        `Hiányzó kötelező sablon-értékek: ${render.hianyzo.join(", ")}.`,
      );
    }
    const env = ctx.stackKornyezet();
    // Re-running must update the stack that already runs under this id: a duplicate would
    // fight the original for the same container name / proxy target.
    const letezo = ctx.telepites.kulsoIdk.portainerStackId;
    if (letezo) {
      await pt(ctx).updateStack(letezo, render.compose, env);
      return {
        allapot: "kesz",
        kulsoId: String(letezo),
        uzenet: "Stack frissítve.",
        kulsoIdkPatch: { portainerStackId: letezo },
      };
    }
    const uj = await pt(ctx).createStackStandalone(nev, render.compose, env);
    return {
      allapot: "kesz",
      kulsoId: String(uj.id),
      uzenet: "Stack létrehozva.",
      kulsoIdkPatch: { portainerStackId: uj.id, portainerWebhookId: uj.webhookId ?? null },
    };
  },

  async adoptal(ctx, input) {
    const stackek = await pt(ctx).listStacks();
    const talalat = stackek.find((s) => s.Id === Number(input.kulsoId));
    if (!talalat) {
      throw new OrchestratorHiba("STACK_NINCS", "A megadott Portainer stack nem található.");
    }
    return {
      allapot: "adoptalva",
      kulsoId: String(talalat.Id),
      uzenet: "Meglévő stack hozzárendelve.",
      kulsoIdkPatch: {
        portainerStackId: talalat.Id,
        portainerWebhookId: talalat.AutoUpdate?.Webhook ?? null,
      },
    };
  },

  async ellenoriz(ctx) {
    const l = lepesAdat(ctx.telepites, "stack_letrehozas");
    if (!l.kulsoId) {
      return { ok: false, elteresek: ["missing_stack_id"], uzenet: "Nincs stack hozzárendelve." };
    }
    const stackek = await pt(ctx).listStacks();
    const talalat = stackek.find((s) => s.Id === Number(l.kulsoId));
    if (!talalat) {
      return { ok: false, elteresek: ["stack_not_found"], uzenet: "A stack nem található." };
    }
    const elteresek: string[] = [];
    if (talalat.Name !== ctx.telepites.stack.nev) elteresek.push("stack.name_mismatch");
    try {
      const fajl = await pt(ctx).getStackFile(talalat.Id);
      if (!fajl.includes("nginxproxy_default"))
        elteresek.push("stack.missing_external_network:nginxproxy_default");
    } catch {
      // best-effort — a file retrieval failure does not block verification
    }
    return {
      ok: elteresek.length === 0,
      elteresek,
      uzenet: elteresek.length === 0 ? "Rendben." : "Eltérés található.",
    };
  },
};

// A compose service may set an explicit `container_name:` — then the running container's name
// no longer contains the stack name at all. Match on either.
function ehhezAStackhez(ctx: LepesKontextus, nevek: string[]): boolean {
  const stack = ctx.telepites.stack.nev ?? "\0";
  const host = ctx.telepites.proxy.celHost ?? "\0";
  return nevek.some((n) => n.includes(stack) || n.includes(host));
}

function stackId(ctx: LepesKontextus): number {
  const id = lepesAdat(ctx.telepites, "stack_letrehozas").kulsoId;
  if (!id) {
    throw new OrchestratorHiba("STACK_NEM_KESZ", "A stack létrehozása lépés még nincs kész.");
  }
  return Number(id);
}

export const stackInditasLepes: LepesKezelo = {
  kulcs: "stack_inditas",

  async terv(ctx) {
    const webhook = ctx.telepites.kulsoIdk.portainerWebhookId;
    return {
      osszegzes: webhook
        ? "Stack újraindítása webhook triggerrel."
        : "Stack elindítása/frissítése.",
      valtoztatasok: [
        {
          szolgaltato: "portainer",
          muvelet: webhook ? "webhook_trigger" : "stack_inditas",
          cel: ctx.telepites.stack.nev ?? "",
        },
      ],
      figyelmeztetesek: [],
    };
  },

  async vegrehajt(ctx, input) {
    const webhook = ctx.telepites.kulsoIdk.portainerWebhookId;
    if (webhook && input?.trigger_webhook !== false) {
      await pt(ctx).triggerWebhook(webhook);
    } else {
      await pt(ctx).startStack(stackId(ctx));
    }
    return { allapot: "kesz", uzenet: "Stack elindítva." };
  },

  async adoptal(ctx) {
    const kontenerek = await pt(ctx).listContainers();
    if (!kontenerek.some((c) => c.State === "running" && ehhezAStackhez(ctx, c.Names))) {
      throw new OrchestratorHiba("NINCS_FUTO_KONTENER", "Nincs futó konténer ehhez a stackhez.");
    }
    return { allapot: "adoptalva", uzenet: "Futó stack hozzárendelve." };
  },

  async ellenoriz(ctx) {
    const kontenerek = await pt(ctx).listContainers();
    const fut = kontenerek.some((c) => c.State === "running" && ehhezAStackhez(ctx, c.Names));
    return {
      ok: fut,
      elteresek: fut ? [] : ["stack.no_running_container"],
      uzenet: fut ? "Legalább egy konténer fut." : "Nincs futó konténer.",
    };
  },
};
