import crypto from "node:crypto";
import type { Types } from "mongoose";
import { connectDB, User } from "@erp/db-core";
import { getAppUrl, sendTemplatedEmail } from "@erp/mail";
import { UserInvitation, type IUserInvitation } from "./models/UserInvitation";

export type CreateInvitationInput = {
  email: string;
  name: string;
  roleIds: Types.ObjectId[];
  directPermissionKeys?: string[];
  invitedBy: Types.ObjectId;
  expiresInDays?: number;
};

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildInviteLink(token: string): string {
  return `${getAppUrl()}/register/invite?token=${token}`;
}

export type InvitationStatus = "pending" | "used" | "expired";

export function getInvitationStatus(inv: {
  isUsed: boolean;
  expiresAt: Date;
}): InvitationStatus {
  if (inv.isUsed) return "used";
  if (inv.expiresAt < new Date()) return "expired";
  return "pending";
}

export async function createUserInvitation(
  input: CreateInvitationInput,
): Promise<{ invitation: IUserInvitation; inviteLink: string }> {
  await connectDB();

  const email = input.email.toLowerCase().trim();
  const existingUser = await User.findOne({ email }).exec();
  if (existingUser) {
    throw new Error("Ez az e-mail cím már foglalt.");
  }

  const pending = await UserInvitation.findOne({
    email,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).exec();
  if (pending) {
    throw new Error("Ehhez az e-mailhez már van érvényes meghívó.");
  }

  const days = input.expiresInDays ?? 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const token = generateToken();
  const invitation = await UserInvitation.create({
    email,
    name: input.name.trim(),
    token,
    roleIds: input.roleIds,
    directPermissionKeys: input.directPermissionKeys ?? [],
    expiresAt,
    isUsed: false,
    invitedBy: input.invitedBy,
  });

  return { invitation, inviteLink: buildInviteLink(token) };
}

export async function sendInvitationEmail(
  invitation: IUserInvitation,
  inviteLink: string,
): Promise<void> {
  const inviter = await User.findById(invitation.invitedBy)
    .select({ name: 1, email: 1 })
    .lean()
    .exec();
  const inviterName = inviter?.name ?? "Adminisztrátor";
  const actorEmail = inviter?.email;

  const expiresAt = invitation.expiresAt.toLocaleString("hu-HU", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const result = await sendTemplatedEmail({
    templateKey: "user_invitation",
    to: invitation.email,
    variables: { name: invitation.name, inviteLink, expiresAt, inviterName },
    actorEmail,
  });

  if (!result.sent && !result.skipped) {
    throw new Error(result.reason ?? "E-mail küldése sikertelen.");
  }
  if (result.skipped && result.reason === "SMTP not configured") {
    throw new Error(
      "SMTP nincs beállítva — a meghívó létrejött, de az e-mail nem ment ki.",
    );
  }
}

export async function findValidInvitationByToken(
  token: string,
): Promise<IUserInvitation | null> {
  await connectDB();
  if (!token?.trim()) return null;
  return UserInvitation.findOne({
    token: token.trim(),
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).exec();
}

export async function markInvitationUsed(invitationId: Types.ObjectId): Promise<void> {
  await connectDB();
  await UserInvitation.updateOne(
    { _id: invitationId },
    { $set: { isUsed: true } },
  ).exec();
}

export async function createAndSendInvitation(
  input: CreateInvitationInput,
): Promise<{ invitation: IUserInvitation; inviteLink: string }> {
  const { invitation, inviteLink } = await createUserInvitation(input);
  await sendInvitationEmail(invitation, inviteLink);
  return { invitation, inviteLink };
}

/** The latest invitation of an address, for status tracking (sent, valid until, expired, used). */
export type InvitationSummary = {
  email: string;
  status: InvitationStatus;
  sentAt: Date;
  expiresAt: Date;
  /** When it was accepted (last update of a used invitation). */
  usedAt?: Date;
};

export async function getLatestInvitations(
  emails: string[],
): Promise<Map<string, InvitationSummary>> {
  const list = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
  const out = new Map<string, InvitationSummary>();
  if (list.length === 0) return out;
  await connectDB();
  const rows = await UserInvitation.find({ email: { $in: list } })
    .sort({ createdAt: -1 })
    .select("email isUsed expiresAt createdAt updatedAt")
    .lean()
    .exec();
  for (const r of rows) {
    if (out.has(r.email)) continue;
    out.set(r.email, {
      email: r.email,
      status: getInvitationStatus(r),
      // A renewed invitation is re-sent: its last update is the latest sending.
      sentAt: r.isUsed ? r.createdAt : (r.updatedAt ?? r.createdAt),
      expiresAt: r.expiresAt,
      usedAt: r.isUsed ? r.updatedAt : undefined,
    });
  }
  return out;
}

/**
 * Re-send instead of failing on "már van érvényes meghívó": a still-valid invitation of the
 * address gets a fresh validity window (and the given roles on top of its own), keeping its
 * link. `null` when there is no valid invitation to renew.
 */
export async function renewPendingInvitation(
  email: string,
  opts: { expiresInDays?: number; roleIds?: Types.ObjectId[] } = {},
): Promise<{ invitation: IUserInvitation; inviteLink: string } | null> {
  await connectDB();
  const invitation = await UserInvitation.findOne({
    email: email.toLowerCase().trim(),
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).exec();
  if (!invitation) return null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (opts.expiresInDays ?? 7));
  invitation.expiresAt = expiresAt;
  if (opts.roleIds?.length) {
    const have = new Set(invitation.roleIds.map(String));
    for (const id of opts.roleIds) if (!have.has(String(id))) invitation.roleIds.push(id);
  }
  invitation.markModified("expiresAt");
  await invitation.save();
  return { invitation, inviteLink: buildInviteLink(invitation.token) };
}
