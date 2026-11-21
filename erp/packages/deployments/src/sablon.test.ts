import { describe, expect, it } from "vitest";
import { TITOK_MASZK, renderSablon, sablonHelyorzok } from "./sablon";

const COMPOSE = `services:
  app:
    image: {{ IMAGE }}:{{IMAGE_TAG}}
    environment:
      DB_PASSWORD: {{ DB_PASSWORD }}
      REGION: {{ REGION }}
      UNKNOWN: {{ NINCS }}
`;

describe("sablonHelyorzok", () => {
  it("lists distinct keys in order of appearance", () => {
    expect(sablonHelyorzok(COMPOSE)).toEqual([
      "IMAGE",
      "IMAGE_TAG",
      "DB_PASSWORD",
      "REGION",
      "NINCS",
    ]);
  });
});

describe("renderSablon", () => {
  const helyorzok = [
    { kulcs: "DB_PASSWORD", cimke: "DB jelszó", kotelezo: true, titkos: true },
    { kulcs: "REGION", cimke: "Régió", kotelezo: false, alapertek: "eu", titkos: false },
  ];
  const ertekek = { IMAGE: "ghcr.io/x/y", IMAGE_TAG: "v1", DB_PASSWORD: "s3cr3t" };

  it("substitutes values and template defaults, leaves unknown placeholders", () => {
    const r = renderSablon(COMPOSE, ertekek, { helyorzok });
    expect(r.compose).toContain("image: ghcr.io/x/y:v1");
    expect(r.compose).toContain("DB_PASSWORD: s3cr3t");
    expect(r.compose).toContain("REGION: eu");
    expect(r.compose).toContain("{{ NINCS }}");
    expect(r.feloldatlan).toEqual(["NINCS"]);
    expect(r.hianyzo).toEqual([]);
  });

  it("a value overrides the template default", () => {
    expect(renderSablon(COMPOSE, { ...ertekek, REGION: "us" }, { helyorzok }).compose).toContain(
      "REGION: us",
    );
  });

  it("masks secret values in the masked render — the real secret never appears", () => {
    const r = renderSablon(COMPOSE, ertekek, { helyorzok, maszkolt: true });
    expect(r.compose).toContain(`DB_PASSWORD: ${TITOK_MASZK}`);
    expect(r.compose).not.toContain("s3cr3t");
    // Non-secret values stay readable.
    expect(r.compose).toContain("ghcr.io/x/y");
  });

  it("secret keys known only from the Telepítés env are masked too", () => {
    const r = renderSablon("A: {{ X }}", { X: "hunter2" }, {
      maszkolt: true,
      titkosKulcsok: new Set(["X"]),
    });
    expect(r.compose).toBe(`A: ${TITOK_MASZK}`);
  });

  it("reports required placeholders without a value", () => {
    const r = renderSablon(COMPOSE, { IMAGE: "i", IMAGE_TAG: "t" }, { helyorzok });
    expect(r.hianyzo).toEqual(["DB_PASSWORD"]);
  });
});
