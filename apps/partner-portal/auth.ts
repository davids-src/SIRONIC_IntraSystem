import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { connectDb, PortalUserModel } from "@crm/db";
import type { RoleKey } from "@crm/types";

function isPartnerRole(k: string): k is "partner.admin" | "partner.viewer" {
  return k === "partner.admin" || k === "partner.viewer";
}

type PortalUserLean = {
  _id: { toString(): string } | string;
  password_hash: string;
  email: string;
  display_name?: string | null;
  tenantId: string;
  contact_id: string;
  roleKeys?: string[];
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim() : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) {
          return null;
        }
        await connectDb();
        const user = (await PortalUserModel.findOne({
          email: email.toLowerCase(),
        }).lean()) as PortalUserLean | null;
        if (!user?.password_hash) {
          return null;
        }
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
          return null;
        }
        const roleKeys = (user.roleKeys ?? []).filter(isPartnerRole) as RoleKey[];
        if (roleKeys.length === 0) {
          return null;
        }
        return {
          id: String(user._id),
          email: user.email,
          name: user.display_name ?? user.email,
          tenantId: user.tenantId,
          contactId: user.contact_id,
          roleKeys,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User | undefined }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.contactId = user.contactId;
        token.roleKeys = user.roleKeys;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.tenantId = token.tenantId as string;
        session.user.contactId = token.contactId as string;
        session.user.roleKeys = (token.roleKeys as RoleKey[]) ?? [];
      }
      return session;
    },
  },
});
