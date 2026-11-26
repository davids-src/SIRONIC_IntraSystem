import { describe, expect, it } from "vitest";
import { encode, decode } from "next-auth/jwt";
import { PORTAL_COOKIE_NAME } from "./constants";
import { signPortalSession, verifyPortalSession } from "./session-token";

const PORTAL_SECRET = "p".repeat(40);
const STAFF_SECRET = "s".repeat(40);
const claims = {
  portalUserId: "a".repeat(24),
  partnerId: "p1",
  rolak: ["partner-admin"],
};

describe("portal session token", () => {
  it("round-trips the claims", async () => {
    const t = await signPortalSession(claims, PORTAL_SECRET);
    expect(await verifyPortalSession(t, PORTAL_SECRET)).toEqual(claims);
  });

  it("rejects a wrong secret, tampering, expiry and garbage", async () => {
    const t = await signPortalSession(claims, PORTAL_SECRET);
    expect(await verifyPortalSession(t, STAFF_SECRET)).toBeNull();
    const [h, p, s] = t.split(".");
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(p!, "base64url").toString()),
        partnerId: "p2",
      }),
    ).toString("base64url");
    expect(await verifyPortalSession(`${h}.${forged}.${s}`, PORTAL_SECRET)).toBeNull();
    const old = await signPortalSession(claims, PORTAL_SECRET, 10, 1000);
    expect(await verifyPortalSession(old, PORTAL_SECRET, 2000)).toBeNull();
    expect(await verifyPortalSession("x.y.z", PORTAL_SECRET)).toBeNull();
    expect(await verifyPortalSession(undefined, PORTAL_SECRET)).toBeNull();
    expect(await verifyPortalSession(t, "short")).toBeNull();
  });

  it("refuses alg=none", async () => {
    const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    );
    const p = Buffer.from(
      JSON.stringify({
        iss: "sironic-portal",
        aud: "sironic-portal-users",
        exp: 9e12,
        sub: "x",
        partnerId: "p",
        rolak: [],
      }),
    ).toString("base64url");
    expect(await verifyPortalSession(`${h}.${p}.`, PORTAL_SECRET)).toBeNull();
  });
});

describe("portal and staff sessions are mutually exclusive", () => {
  it("uses a cookie name the staff Auth.js never reads", () => {
    expect(PORTAL_COOKIE_NAME).not.toMatch(/authjs|next-auth/);
    expect(["authjs.session-token", "__Secure-authjs.session-token"]).not.toContain(
      PORTAL_COOKIE_NAME,
    );
  });

  it("the staff app cannot decode a portal token (even with the portal secret)", async () => {
    const t = await signPortalSession(claims, PORTAL_SECRET);
    for (const secret of [STAFF_SECRET, PORTAL_SECRET]) {
      const decoded = await decode({
        token: t,
        secret,
        salt: "authjs.session-token",
      }).catch(() => null);
      expect(decoded).toBeNull();
    }
  });

  it("the portal cannot accept a staff Auth.js token", async () => {
    const staffToken = await encode({
      token: { id: "u1", sub: "u1" },
      secret: STAFF_SECRET,
      salt: "authjs.session-token",
    });
    expect(await verifyPortalSession(staffToken, STAFF_SECRET)).toBeNull();
    expect(await verifyPortalSession(staffToken, PORTAL_SECRET)).toBeNull();
  });
});
