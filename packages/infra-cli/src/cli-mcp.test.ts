import { describe, expect, it } from "vitest";
import { parancsElemez } from "./cli";
import { kezel } from "./mcp";
import {
  MASK,
  TOOLS,
  argumentumok,
  jsonSchema,
  maszkolCompose,
  maszkolEnv,
  toolKeres,
} from "./tools";

describe("maszkolás", () => {
  it("elrejti a titokszerű értékeket, a többit meghagyja", () => {
    const ki = maszkolCompose(
      [
        "services:",
        "  web:",
        "    image: ghcr.io/x/web:main",
        "    environment:",
        "      NODE_ENV: production",
        '      MONGODB_URI: "mongodb://u:p@host/db"',
        "      SMTP_PASS: titok",
        "      - STRIPE_SECRET_KEY=sk_live_x",
        "      NEXT_PUBLIC_APP_URL: https://a.hu",
      ].join("\n"),
    );
    expect(ki).toContain("image: ghcr.io/x/web:main");
    expect(ki).toContain("NODE_ENV: production");
    expect(ki).toContain("NEXT_PUBLIC_APP_URL: https://a.hu");
    expect(ki).not.toContain("mongodb://u:p");
    expect(ki).not.toContain("titok");
    expect(ki).not.toContain("sk_live_x");
    expect(ki.match(/\*\*\*MASKED\*\*\*/g)).toHaveLength(3);
  });
  it("az env értékeit név alapján maszkolja", () => {
    expect(
      maszkolEnv([
        { name: "JWT_SECRET", value: "x" },
        { name: "PORT", value: "3000" },
      ]),
    ).toEqual([
      { name: "JWT_SECRET", value: MASK },
      { name: "PORT", value: "3000" },
    ]);
  });
});

describe("eszköz-regiszter", () => {
  it("minden eszköznek egyedi neve és érvényes sémája van", () => {
    const nevek = TOOLS.map((t) => t.name);
    expect(new Set(nevek).size).toBe(nevek.length);
    for (const t of TOOLS) {
      const s = jsonSchema(t) as {
        required: string[];
        properties: Record<string, unknown>;
      };
      for (const r of s.required) expect(s.properties).toHaveProperty(r);
      expect(t.description.length).toBeGreaterThan(20);
    }
  });
  it("a romboló eszközökhöz megerősítés kell", () => {
    for (const n of ["stack_delete", "site_delete"]) {
      const t = toolKeres(n)!;
      expect(t.destructive).toBe(true);
      expect(Object.keys(t.params).some((k) => k.startsWith("confirm_"))).toBe(true);
    }
  });
  it("a csak olvasó eszközök nincsenek romboló jelöléssel", () => {
    for (const t of TOOLS) expect(t.readOnly && t.destructive).toBeFalsy();
  });
  it("az argumentumokat ellenőrzi és konvertálja", () => {
    const t = toolKeres("site_create")!;
    expect(
      argumentumok(t, { hosts: "a.hu,www.a.hu", service: "web", port: "3000" }),
    ).toEqual({
      hosts: ["a.hu", "www.a.hu"],
      service: "web",
      port: 3000,
    });
    expect(() => argumentumok(t, { hosts: "a.hu", service: "web" })).toThrow(/port/);
    expect(() =>
      argumentumok(t, { hosts: "a.hu", service: "web", port: 1, bogus: 1 }),
    ).toThrow(/Ismeretlen paraméter/);
    expect(() =>
      argumentumok(t, { hosts: "a.hu", service: "web", port: 1, scheme: "ftp" }),
    ).toThrow(/http \| https/);
  });
  it("a maszkolt compose-t nem engedi visszaírni", async () => {
    const t = toolKeres("stack_update")!;
    await expect(
      t.run({ stack: "x", compose: `a: ${MASK}` }, { szereplo: "test" }),
    ).rejects.toThrow(/maszkolt/);
  });
});

describe("webhely- és sablon-eszközök", () => {
  it("a jelszó csak reveal=true mellett adható ki (adatbázis nélkül is elutasít)", async () => {
    const t = toolKeres("access_password")!;
    await expect(
      t.run({ web: "x", label: "FTP" }, { szereplo: "cli:t" }),
    ).rejects.toThrow(/reveal/);
  });
  it("a jelszót kiadó és a törlő eszközök léteznek, a törlők rombolónak jelöltek", () => {
    for (const n of [
      "template_list",
      "web_list",
      "web_create",
      "access_add",
      "access_password",
    ])
      expect(toolKeres(n), n).toBeTruthy();
    for (const n of ["template_delete", "web_delete", "access_delete"])
      expect(toolKeres(n)?.destructive, n).toBe(true);
  });
  it("a stack_create-hez a compose nem kötelező, ha van sablon", () => {
    expect(toolKeres("stack_create")!.params.compose!.required).toBeFalsy();
  });
});

describe("CLI parancsok", () => {
  it("a szavakat parancsnévvé fűzi és a pozicionális argumentumot kitölti", () => {
    const r = parancsElemez(["stack", "pull", "sakkmed"]);
    expect(r.tool.name).toBe("stack_pull");
    expect(r.args).toEqual({ stack: "sakkmed" });
  });
  it("kapcsolókat, kötőjeles neveket és ismételt értékeket kezel", () => {
    const r = parancsElemez([
      "site",
      "create",
      "--hosts",
      "a.hu,www.a.hu",
      "--service=web",
      "--port",
      "3000",
      "--dns-proxied",
      "--json",
    ]);
    expect(r.tool.name).toBe("site_create");
    expect(r.json).toBe(true);
    expect(r.args).toMatchObject({
      hosts: "a.hu,www.a.hu",
      service: "web",
      port: "3000",
      dns_proxied: true,
    });
    const e = parancsElemez(["stack", "update", "x", "--env", "A=1", "--env", "B=2"]);
    expect(e.args.env).toEqual(["A=1", "B=2"]);
  });
  it("egyszavas parancsot is ismer, ismeretlent elutasít", () => {
    expect(parancsElemez(["overview"]).tool.name).toBe("overview");
    expect(() => parancsElemez(["stack", "nincs"])).toThrow(/Ismeretlen parancs/);
    expect(() => parancsElemez(["overview", "extra"])).toThrow(/Felesleges/);
  });
});

describe("MCP szerver", () => {
  const kerj = (method: string, params?: Record<string, unknown>, ertesites = false) =>
    kezel({ jsonrpc: "2.0", ...(ertesites ? {} : { id: 1 }), method, params });

  it("kezeli az initialize hívást", async () => {
    const v = await kerj("initialize", {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "claude-code" },
    });
    expect(v?.result).toMatchObject({
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "sironic-infra" },
    });
  });
  it("a tools/list megadja az összes eszközt annotációkkal", async () => {
    const v = (await kerj("tools/list"))?.result as {
      tools: Array<{ name: string; annotations: { destructiveHint: boolean } }>;
    };
    expect(v.tools).toHaveLength(TOOLS.length);
    expect(
      v.tools.find((t) => t.name === "stack_delete")?.annotations.destructiveHint,
    ).toBe(true);
  });
  it("az értesítésekre nem válaszol", async () => {
    expect(await kerj("notifications/initialized", undefined, true)).toBeNull();
  });
  it("ismeretlen eszközre és metódusra hibát ad", async () => {
    expect((await kerj("tools/call", { name: "nincs" }))?.error?.code).toBe(-32602);
    expect((await kerj("valami/mas"))?.error?.code).toBe(-32601);
  });
  it("az eszköz hibája isError tartalomként tér vissza, nem protokollhibaként", async () => {
    const v = await kerj("tools/call", {
      name: "stack_update",
      arguments: { stack: "x", compose: `a: ${MASK}` },
    });
    expect(v?.result).toMatchObject({ isError: true });
    expect(v?.error).toBeUndefined();
  });
});
