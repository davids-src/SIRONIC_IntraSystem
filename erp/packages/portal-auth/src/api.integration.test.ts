import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import {
  acceptPortalInvitation,
  checkPortalToken,
  getPortalIdentity,
  invitePortalUser,
  listPortalColleagues,
  portalLogin,
  requestPortalPasswordReset,
  resetPortalPassword,
  setPortalColleagueActive,
  setPortalColleagueRoles,
} from "./api";
import { PortalToken, PortalUser } from "./models";
import { LOGIN_MAX_FAILED } from "./constants";

let mongo: MongoMemoryServer;
beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  delete process.env.SMTP_HOST;
  await connectDB();
  await PortalUser.init();
});
beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await PortalUser.init();
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const base = {
  partnerId: "p1",
  partnerNev: "Acme Kft.",
  invitedBy: "staff",
  inviterName: "Admin",
};
const PW = "Titkos-jelszo-123";

/** Invites and returns the raw token (SMTP is off in tests, so the dev link carries it). */
async function invite(email: string, rolak = ["partner-admin"], partnerId = "p1") {
  const r = await invitePortalUser({ ...base, partnerId, email, name: "Teszt", rolak });
  if (!r.ok) throw new Error(r.message);
  const token = r.devLink?.split("token=")[1] ?? "";
  return { id: r.id, token };
}

describe("invitation + set-password", () => {
  it("only stores the token hash; accept sets the password once", async () => {
    const { id, token } = await invite("a@acme.hu");
    expect(token.length).toBeGreaterThan(30);
    const raw = JSON.stringify(await PortalToken.find().lean());
    expect(raw).not.toContain(token);
    expect(await checkPortalToken(token, "invite")).toMatchObject({ email: "a@acme.hu" });

    expect((await portalLogin("a@acme.hu", PW)).ok).toBe(false); // no password yet
    expect((await acceptPortalInvitation(token, "rovid")).ok).toBe(false);
    const ok = await acceptPortalInvitation(token, PW);
    expect(ok.ok).toBe(true);
    expect((await acceptPortalInvitation(token, PW)).ok).toBe(false); // single use
    const login = await portalLogin("A@Acme.hu", PW);
    expect(login.ok && login.identity.portalUserId).toBe(id);
    expect(login.ok && login.identity.partnerAdmin).toBe(true);
  });

  it("refuses duplicate e-mails across partners", async () => {
    await invite("a@acme.hu");
    const r = await invitePortalUser({
      ...base,
      partnerId: "p2",
      email: "a@acme.hu",
      name: "X",
      rolak: ["partner-viewer"],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown roles", async () => {
    const r = await invitePortalUser({
      ...base,
      email: "b@acme.hu",
      name: "B",
      rolak: ["root"],
    });
    expect(r.ok).toBe(false);
  });
});

describe("login", () => {
  it("locks after repeated failures and refuses deactivated users", async () => {
    const { token } = await invite("a@acme.hu");
    await acceptPortalInvitation(token, PW);
    for (let i = 0; i < LOGIN_MAX_FAILED; i++)
      expect((await portalLogin("a@acme.hu", "rossz-jelszo-123")).ok).toBe(false);
    const locked = await portalLogin("a@acme.hu", PW);
    expect(locked).toMatchObject({ ok: false, code: "zarolt" });
    const later = await portalLogin("a@acme.hu", PW, new Date(Date.now() + 16 * 60_000));
    expect(later.ok).toBe(true);

    await PortalUser.updateOne({ email: "a@acme.hu" }, { isActive: false });
    expect((await portalLogin("a@acme.hu", PW)).ok).toBe(false);
    const u = await PortalUser.findOne({ email: "a@acme.hu" });
    expect(await getPortalIdentity(String(u!._id))).toBeNull();
  });

  it("does not reveal whether an account exists", async () => {
    const a = await portalLogin("nincs@acme.hu", PW);
    const { token } = await invite("a@acme.hu");
    await acceptPortalInvitation(token, PW);
    const b = await portalLogin("a@acme.hu", "rossz-jelszo-123");
    expect(a).toEqual(b);
  });
});

describe("password reset", () => {
  it("issues a one-time token for active users and answers ok for unknown ones", async () => {
    const { token } = await invite("a@acme.hu");
    await acceptPortalInvitation(token, PW);
    expect(await requestPortalPasswordReset("nincs@acme.hu")).toEqual({ ok: true });
    await requestPortalPasswordReset("a@acme.hu");
    // SMTP is off: read the pending token's presence only; craft a known one for the flow.
    const pending = await PortalToken.findOne({ purpose: "reset" });
    expect(pending).not.toBeNull();
    const { createHash } = await import("node:crypto");
    const known = "k".repeat(43);
    await PortalToken.updateOne(
      { _id: pending!._id },
      { tokenHash: createHash("sha256").update(known).digest("hex") },
    );
    expect((await resetPortalPassword(known, "Uj-jelszo-12345")).ok).toBe(true);
    expect((await resetPortalPassword(known, "Masik-jelszo-123")).ok).toBe(false);
    expect((await portalLogin("a@acme.hu", "Uj-jelszo-12345")).ok).toBe(true);
    expect((await portalLogin("a@acme.hu", PW)).ok).toBe(false);
  });
});

describe("colleague management is scoped by the caller's partner", () => {
  it("cannot touch another partner's users; last admin is protected", async () => {
    const a = await invite("a@acme.hu");
    const b = await invite("b@acme.hu", ["partner-viewer"]);
    const other = await invite("x@other.hu", ["partner-admin"], "p2");
    expect((await listPortalColleagues("p1")).map((c) => c.email).sort()).toEqual([
      "a@acme.hu",
      "b@acme.hu",
    ]);
    expect((await setPortalColleagueActive("p1", a.id, other.id, false)).ok).toBe(false);
    expect(
      (await setPortalColleagueRoles("p1", a.id, other.id, ["partner-viewer"])).ok,
    ).toBe(false);
    expect((await setPortalColleagueActive("p1", a.id, a.id, false)).ok).toBe(false);
    expect((await setPortalColleagueRoles("p1", a.id, a.id, ["partner-viewer"])).ok).toBe(
      false,
    );
    expect((await setPortalColleagueRoles("p1", a.id, b.id, ["partner-admin"])).ok).toBe(
      true,
    );
    expect((await setPortalColleagueActive("p1", a.id, b.id, false)).ok).toBe(true);
  });
});
