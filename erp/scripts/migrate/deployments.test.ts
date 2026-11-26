import { describe, expect, it } from "vitest";
import { mapIntegracio } from "./deployments";

describe("mapIntegracio", () => {
  it("carries the ciphertext verbatim and resolves the creator", () => {
    const r = mapIntegracio(
      {
        provider: "npm",
        label: " NPM ",
        base_url: "https://npm.local",
        encrypted_credentials: "iv:tag:ct",
        created_by: "u1",
      },
      { userIds: new Map([["u1", "N1"]]) },
    );
    expect(r.hitelesitoTitkositott).toBe("iv:tag:ct");
    expect(r.szolgaltato).toBe("npm");
    expect(r.cimke).toBe("NPM");
    expect(r.letrehozoId).toBe("N1");
  });
});
