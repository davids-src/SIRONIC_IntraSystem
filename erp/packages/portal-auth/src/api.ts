/**
 * Portal identity facade: login (bcrypt, lockout), invitation + set-password, reset, colleague
 * management. Every colleague operation is scoped by the CALLER's `partnerId`, never by input.
 *
 * OIDC hookup point (not built): the central IdP (`apps/auth`) would authenticate the person and
 * `PortalUser.platformUserId` stores its `sub`; `linkPortalOidcIdentity` would mirror
 * `@erp/auth`'s `linkOidcIdentity` (verified e-mail of an EXISTING, invited PortalUser; never
 * auto-create). Permissions and `partnerId` always stay local to `portal_users`.
 */
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@erp/db-core";
import { getAppUrl, isSmtpConfigured, sendMail } from "@erp/mail";
import {
  DEFAULT_PORTAL_ROLES,
  INVITE_VALID_DAYS,
  LOGIN_LOCK_MINUTES,
  LOGIN_MAX_FAILED,
  PASSWORD_MIN_LENGTH,
  PORTAL_PERMISSIONS,
  PORTAL_ROLE_ADMIN,
  RESET_VALID_MINUTES,
} from "./constants";
import {
  PortalRole,
  PortalToken,
  PortalUser,
  type IPortalUser,
  type PortalTokenPurpose,
} from "./models";

export type PortalResult<T = Record<never, never>> =
  ({ ok: true } & T) | { ok: false; message: string; code?: string };

const fail = (message: string, code?: string) => ({ ok: false as const, message, code });

/** What the app derives a viewer (`Nezo`) from. */
export type PortalIdentity = {
  portalUserId: string;
  email: string;
  name: string;
  partnerId: string;
  partnerNev: string;
  rolak: string[];
  permissions: string[];
  partnerAdmin: boolean;
};

export type PortalColleague = {
  id: string;
  email: string;
  name: string;
  rolak: string[];
  isActive: boolean;
  status: "meghivott" | "aktiv" | "letiltva";
  lastLoginAt?: string;
};

const emailSchema = z.string().trim().toLowerCase().email("Érvénytelen e-mail cím");
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A jelszó legalább ${PASSWORD_MIN_LENGTH} karakter legyen`)
  .max(200);
const inviteSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, "A név kötelező").max(120),
  rolak: z.array(z.string()).min(1, "Legalább egy szerepkör kötelező"),
});

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function getPortalUrl(): string {
  return (process.env.PORTAL_URL?.trim() || getAppUrl()).replace(/\/+$/, "");
}

// ── Roles (data) ────────────────────────────────────────────────────────────────

/** Inserts the default roles that are missing; existing rows are never overwritten. */
export async function ensurePortalRoles(): Promise<void> {
  await connectDB();
  for (const r of DEFAULT_PORTAL_ROLES) {
    await PortalRole.updateOne(
      { key: r.key },
      { $setOnInsert: r },
      { upsert: true },
    ).exec();
  }
}

async function permissionsOf(rolak: string[]): Promise<string[]> {
  await ensurePortalRoles();
  const roles = await PortalRole.find({ key: { $in: rolak } })
    .lean()
    .exec();
  return [...new Set(roles.flatMap((r) => r.permissions))];
}

async function identityOf(u: IPortalUser): Promise<PortalIdentity> {
  const permissions = await permissionsOf(u.rolak);
  return {
    portalUserId: String(u._id),
    email: u.email,
    name: u.name,
    partnerId: u.partnerId,
    partnerNev: u.partnerNev,
    rolak: u.rolak,
    permissions,
    partnerAdmin: u.rolak.includes(PORTAL_ROLE_ADMIN),
  };
}

/** Current identity from the DB (so deactivation / role changes apply immediately); null if inactive. */
export async function getPortalIdentity(id: string): Promise<PortalIdentity | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectDB();
  const u = await PortalUser.findById(id).exec();
  if (!u || !u.isActive || !u.partnerId) return null;
  return identityOf(u);
}

// ── Login ───────────────────────────────────────────────────────────────────────

const BAD_LOGIN = "Hibás e-mail cím vagy jelszó";

export async function portalLogin(
  email: string,
  password: string,
  now = new Date(),
): Promise<PortalResult<{ identity: PortalIdentity }>> {
  const e = emailSchema.safeParse(email);
  if (!e.success || !password) return fail(BAD_LOGIN, "hibas");
  await connectDB();
  const u = await PortalUser.findOne({ email: e.data }).exec();
  if (!u || !u.passwordHash) return fail(BAD_LOGIN, "hibas");
  if (u.lockedUntil && u.lockedUntil > now)
    return fail(
      "A fiók átmenetileg zárolva van túl sok sikertelen próbálkozás miatt. Próbálja később.",
      "zarolt",
    );
  const valid = await bcrypt.compare(password, u.passwordHash);
  if (!valid) {
    const fails = (u.failedLoginCount ?? 0) + 1;
    const lock = fails >= LOGIN_MAX_FAILED;
    await PortalUser.updateOne(
      { _id: u._id },
      lock
        ? {
            $set: {
              failedLoginCount: 0,
              lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60_000),
            },
          }
        : { $set: { failedLoginCount: fails } },
    ).exec();
    return fail(BAD_LOGIN, "hibas");
  }
  // Deactivated accounts are refused only after the password check (no account-state oracle).
  if (!u.isActive) return fail(BAD_LOGIN, "letiltva");
  await PortalUser.updateOne(
    { _id: u._id },
    { $set: { failedLoginCount: 0, lastLoginAt: now }, $unset: { lockedUntil: 1 } },
  ).exec();
  return { ok: true, identity: await identityOf(u) };
}

// ── Tokens, invitation, reset ───────────────────────────────────────────────────

async function issueToken(
  portalUserId: string,
  purpose: PortalTokenPurpose,
  validMs: number,
): Promise<string> {
  // A new token of the same purpose invalidates the older ones.
  await PortalToken.deleteMany({
    portalUserId,
    purpose,
    usedAt: { $exists: false },
  }).exec();
  const token = newToken();
  await PortalToken.create({
    tokenHash: sha256(token),
    purpose,
    portalUserId,
    expiresAt: new Date(Date.now() + validMs),
  });
  return token;
}

async function findValidToken(token: string, purpose: PortalTokenPurpose) {
  if (!token || token.length < 20) return null;
  await connectDB();
  return PortalToken.findOne({
    tokenHash: sha256(token),
    purpose,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).exec();
}

/** For the set-password page: is the link usable, and whose is it? Never logs the token. */
export async function checkPortalToken(
  token: string,
  purpose: PortalTokenPurpose,
): Promise<{ name: string; email: string } | null> {
  const t = await findValidToken(token, purpose);
  if (!t) return null;
  const u = await PortalUser.findById(t.portalUserId).exec();
  return u && u.isActive ? { name: u.name, email: u.email } : null;
}

type MailOutcome = { emailSent: boolean; devLink?: string };

async function deliver(
  to: string,
  subject: string,
  html: string,
  link: string,
): Promise<MailOutcome> {
  if (!isSmtpConfigured())
    return {
      emailSent: false,
      devLink: process.env.NODE_ENV === "production" ? undefined : link,
    };
  const r = await sendMail({ to, subject, html });
  return {
    emailSent: r.sent,
    devLink: r.sent || process.env.NODE_ENV === "production" ? undefined : link,
  };
}

async function sendInviteMail(u: IPortalUser, inviterName: string): Promise<MailOutcome> {
  const token = await issueToken(String(u._id), "invite", INVITE_VALID_DAYS * 86_400_000);
  const link = `${getPortalUrl()}/meghivo?token=${token}`;
  const html = `<p>Kedves ${escapeHtml(u.name)}!</p><p>${escapeHtml(inviterName)} meghívta a SIRONIC partnerportálra (${escapeHtml(u.partnerNev)}).</p><p><a href="${link}">Jelszó beállítása és belépés</a></p><p>A hivatkozás ${INVITE_VALID_DAYS} napig érvényes.</p>`;
  return deliver(u.email, "Meghívó a SIRONIC partnerportálra", html, link);
}

export type InviteInput = {
  email: string;
  name: string;
  rolak: string[];
  /** The CALLER's partner — the new user can only ever join it. */
  partnerId: string;
  partnerNev: string;
  invitedBy: string;
  inviterName: string;
};

/** Staff-side (first partner admin) and partner-admin invitations both end up here. */
export async function invitePortalUser(
  input: InviteInput,
): Promise<PortalResult<{ id: string } & MailOutcome>> {
  const p = inviteSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Érvénytelen adatok");
  if (!input.partnerId) return fail("A partner nem azonosítható");
  await connectDB();
  await ensurePortalRoles();
  const known = await PortalRole.find({ key: { $in: p.data.rolak } })
    .lean()
    .exec();
  if (known.length !== new Set(p.data.rolak).size) return fail("Ismeretlen szerepkör");

  const existing = await PortalUser.findOne({ email: p.data.email }).exec();
  if (existing) {
    // Re-send for a still pending invitation of the SAME partner; everything else is taken.
    if (existing.partnerId === input.partnerId && !existing.passwordHash) {
      const m = await sendInviteMail(existing, input.inviterName);
      return { ok: true, id: String(existing._id), ...m };
    }
    return fail("Ez az e-mail cím már foglalt.");
  }
  const u = await PortalUser.create({
    email: p.data.email,
    name: p.data.name,
    partnerId: input.partnerId,
    partnerNev: input.partnerNev,
    rolak: p.data.rolak,
    isActive: true,
    invitedBy: input.invitedBy,
  });
  const m = await sendInviteMail(u, input.inviterName);
  return { ok: true, id: String(u._id), ...m };
}

export async function acceptPortalInvitation(
  token: string,
  password: string,
): Promise<PortalResult<{ identity: PortalIdentity }>> {
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return fail(pw.error.issues[0]?.message ?? "Érvénytelen jelszó");
  const t = await findValidToken(token, "invite");
  if (!t) return fail("A meghívó érvénytelen vagy lejárt.", "token");
  // Single use: claim the token with a conditional update before doing anything else.
  const claimed = await PortalToken.updateOne(
    { _id: t._id, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } },
  ).exec();
  if (claimed.modifiedCount !== 1)
    return fail("A meghívó érvénytelen vagy lejárt.", "token");
  const u = await PortalUser.findById(t.portalUserId).exec();
  if (!u || !u.isActive) return fail("A fiók nem aktív.", "letiltva");
  u.passwordHash = await bcrypt.hash(pw.data, 12);
  u.failedLoginCount = 0;
  u.lockedUntil = undefined;
  await u.save();
  return { ok: true, identity: await identityOf(u) };
}

/** Always answers ok: no account-existence oracle. */
export async function requestPortalPasswordReset(email: string): Promise<{ ok: true }> {
  const e = emailSchema.safeParse(email);
  if (!e.success) return { ok: true };
  await connectDB();
  const u = await PortalUser.findOne({ email: e.data }).exec();
  if (!u || !u.isActive || !u.passwordHash) return { ok: true };
  const token = await issueToken(String(u._id), "reset", RESET_VALID_MINUTES * 60_000);
  const link = `${getPortalUrl()}/jelszo-visszaallitas?token=${token}`;
  const html = `<p>Kedves ${escapeHtml(u.name)}!</p><p>Jelszó-visszaállítást kért a SIRONIC partnerportálon.</p><p><a href="${link}">Új jelszó megadása</a></p><p>A hivatkozás ${RESET_VALID_MINUTES} percig érvényes. Ha nem Ön kérte, hagyja figyelmen kívül.</p>`;
  await deliver(u.email, "Jelszó-visszaállítás — SIRONIC partnerportál", html, link);
  return { ok: true };
}

export async function resetPortalPassword(
  token: string,
  password: string,
): Promise<PortalResult> {
  const pw = passwordSchema.safeParse(password);
  if (!pw.success) return fail(pw.error.issues[0]?.message ?? "Érvénytelen jelszó");
  const t = await findValidToken(token, "reset");
  if (!t) return fail("A hivatkozás érvénytelen vagy lejárt.", "token");
  const claimed = await PortalToken.updateOne(
    { _id: t._id, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } },
  ).exec();
  if (claimed.modifiedCount !== 1)
    return fail("A hivatkozás érvénytelen vagy lejárt.", "token");
  const u = await PortalUser.findById(t.portalUserId).exec();
  if (!u || !u.isActive) return fail("A fiók nem aktív.", "letiltva");
  u.passwordHash = await bcrypt.hash(pw.data, 12);
  u.failedLoginCount = 0;
  u.lockedUntil = undefined;
  await u.save();
  return { ok: true };
}

// ── Colleague management (partner admin) — always scoped by the caller's partner ─

function toColleague(u: IPortalUser): PortalColleague {
  return {
    id: String(u._id),
    email: u.email,
    name: u.name,
    rolak: u.rolak,
    isActive: u.isActive,
    status: !u.isActive ? "letiltva" : u.passwordHash ? "aktiv" : "meghivott",
    lastLoginAt: u.lastLoginAt?.toISOString(),
  };
}

export async function listPortalColleagues(
  partnerId: string,
): Promise<PortalColleague[]> {
  if (!partnerId) return [];
  await connectDB();
  const rows = await PortalUser.find({ partnerId }).sort({ name: 1 }).exec();
  return rows.map(toColleague);
}

export async function getPortalColleague(
  partnerId: string,
  userId: string,
): Promise<PortalColleague | null> {
  if (!partnerId || !/^[a-f0-9]{24}$/i.test(userId)) return null;
  await connectDB();
  const u = await PortalUser.findOne({ _id: userId, partnerId }).exec();
  return u ? toColleague(u) : null;
}

async function otherActiveAdmins(partnerId: string, exceptId: string): Promise<number> {
  return PortalUser.countDocuments({
    partnerId,
    isActive: true,
    rolak: PORTAL_ROLE_ADMIN,
    _id: { $ne: exceptId },
  }).exec();
}

export async function setPortalColleagueActive(
  partnerId: string,
  actorId: string,
  userId: string,
  active: boolean,
): Promise<PortalResult> {
  if (userId === actorId) return fail("Saját fiókját nem tilthatja le.");
  const c = await getPortalColleague(partnerId, userId);
  if (!c) return fail("A felhasználó nem található.");
  if (
    !active &&
    c.rolak.includes(PORTAL_ROLE_ADMIN) &&
    (await otherActiveAdmins(partnerId, userId)) === 0
  )
    return fail("Az utolsó aktív adminisztrátor nem tiltható le.");
  await PortalUser.updateOne(
    { _id: userId, partnerId },
    { $set: { isActive: active } },
  ).exec();
  return { ok: true };
}

export async function setPortalColleagueRoles(
  partnerId: string,
  actorId: string,
  userId: string,
  rolak: string[],
): Promise<PortalResult> {
  const c = await getPortalColleague(partnerId, userId);
  if (!c) return fail("A felhasználó nem található.");
  if (rolak.length === 0) return fail("Legalább egy szerepkör kötelező.");
  await ensurePortalRoles();
  const known = await PortalRole.find({ key: { $in: rolak } })
    .lean()
    .exec();
  if (known.length !== new Set(rolak).size) return fail("Ismeretlen szerepkör");
  if (
    c.rolak.includes(PORTAL_ROLE_ADMIN) &&
    !rolak.includes(PORTAL_ROLE_ADMIN) &&
    (userId === actorId || (await otherActiveAdmins(partnerId, userId)) === 0)
  )
    return fail("Az utolsó adminisztrátor jogosultsága nem vonható vissza.");
  await PortalUser.updateOne({ _id: userId, partnerId }, { $set: { rolak } }).exec();
  return { ok: true };
}

export { PORTAL_PERMISSIONS };
