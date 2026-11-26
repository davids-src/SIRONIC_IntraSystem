import { describe, expect, it } from "vitest";
import {
  decideOidcLink,
  getOidcConfig,
  isOidcConfigured,
  oidcErrorMessage,
} from "./oidc";

const active = { id: "u1", isActive: true, platformUserId: null };
const id = (over = {}) => ({ sub: "s1", email: "a@x.hu", emailVerified: true, ...over });

describe("getOidcConfig", () => {
  it("is off without issuer or client id", () => {
    expect(getOidcConfig({})).toBeNull();
    expect(getOidcConfig({ OIDC_ISSUER: "https://i" })).toBeNull();
    expect(isOidcConfigured({ OIDC_CLIENT_ID: "c" })).toBe(false);
  });
  it("is on with issuer + client id; secret optional", () => {
    expect(getOidcConfig({ OIDC_ISSUER: "https://i", OIDC_CLIENT_ID: "c" })).toEqual({
      issuer: "https://i",
      clientId: "c",
    });
    expect(
      getOidcConfig({
        OIDC_ISSUER: "https://i",
        OIDC_CLIENT_ID: "c",
        OIDC_CLIENT_SECRET: "s",
      })?.clientSecret,
    ).toBe("s");
  });
});

describe("decideOidcLink", () => {
  it("logs in an already linked active user", () => {
    expect(decideOidcLink({ identity: id(), bySub: active, byEmail: null })).toEqual({
      ok: true,
      userId: "u1",
      action: "existing",
    });
  });
  it("refuses a deactivated linked user", () => {
    expect(
      decideOidcLink({
        identity: id(),
        bySub: { ...active, isActive: false },
        byEmail: null,
      }),
    ).toEqual({ ok: false, reason: "deactivated" });
  });
  it("links an unlinked local user by verified email", () => {
    expect(decideOidcLink({ identity: id(), bySub: null, byEmail: active })).toEqual({
      ok: true,
      userId: "u1",
      action: "link",
    });
  });
  it("rejects unverified or missing email", () => {
    for (const identity of [
      id({ emailVerified: false }),
      id({ emailVerified: null }),
      id({ email: null }),
    ]) {
      expect(decideOidcLink({ identity, bySub: null, byEmail: active })).toEqual({
        ok: false,
        reason: "email_unverified",
      });
    }
  });
  it("never auto-creates unknown identities", () => {
    expect(decideOidcLink({ identity: id(), bySub: null, byEmail: null })).toEqual({
      ok: false,
      reason: "unknown_identity",
    });
  });
  it("rejects when the local account is linked to another sub", () => {
    expect(
      decideOidcLink({
        identity: id(),
        bySub: null,
        byEmail: { ...active, platformUserId: "other" },
      }),
    ).toEqual({ ok: false, reason: "link_conflict" });
  });
  it("refuses a deactivated local user matched by email", () => {
    expect(
      decideOidcLink({
        identity: id(),
        bySub: null,
        byEmail: { ...active, isActive: false },
      }),
    ).toEqual({ ok: false, reason: "deactivated" });
  });
  it("rejects a missing subject", () => {
    expect(
      decideOidcLink({ identity: id({ sub: "" }), bySub: null, byEmail: active }),
    ).toEqual({ ok: false, reason: "no_subject" });
  });
});

describe("oidcErrorMessage", () => {
  it("returns Hungarian messages", () => {
    expect(oidcErrorMessage(null)).toBeNull();
    expect(oidcErrorMessage("unknown_identity")).toContain("meghívót");
    expect(oidcErrorMessage("whatever")).toContain("sikertelen");
  });
});
