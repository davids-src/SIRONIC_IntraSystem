import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { connectDb, CrmUserModel } from "@crm/db";
import type { RoleKey } from "@crm/types";

function isCrmRoleKey(k: string): k is "crm.admin" | "crm.staff" {
  return k === "crm.admin" || k === "crm.staff";
}

type CrmUserLean = {
  _id: { toString(): string } | string;
  password_hash: string;
  email: string;
  display_name?: string | null;
  tenantId: string;
  roleKeys?: string[];
  magic_token_hash?: string | null;
  magic_token_expires?: Date | null;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "magic-link",
      name: "magic-link",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const token =
          typeof credentials?.token === "string" ? credentials.token.trim() : "";
        if (!email || !token) {
          return null;
        }
        const tokenHash = createHash("sha256").update(token).digest("hex");
        await connectDb();
        const user = (await CrmUserModel.findOneAndUpdate(
          {
            email,
            magic_token_hash: tokenHash,
            magic_token_expires: { $gt: new Date() },
            roleKeys: { $in: ["crm.admin", "crm.staff"] },
          },
          {
            $unset: {
              magic_token_hash: "",
              magic_token_expires: "",
            },
          },
          { new: true },
        ).lean()) as CrmUserLean | null;
        if (!user) {
          return null;
        }
        const roleKeys = (user.roleKeys ?? []).filter(isCrmRoleKey) as RoleKey[];
        if (roleKeys.length === 0) {
          return null;
        }
        return {
          id: String(user._id),
          email: user.email,
          name: user.display_name ?? user.email,
          tenantId: user.tenantId,
          roleKeys,
        };
      },
    }),
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
        const user = (await CrmUserModel.findOne({
          email: email.toLowerCase(),
        }).lean()) as CrmUserLean | null;
        if (!user?.password_hash) {
          return null;
        }
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
          return null;
        }
        const roleKeys = (user.roleKeys ?? []).filter(isCrmRoleKey) as RoleKey[];
        if (roleKeys.length === 0) {
          return null;
        }
        return {
          id: String(user._id),
          email: user.email,
          name: user.display_name ?? user.email,
          tenantId: user.tenantId,
          roleKeys,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User | undefined }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.roleKeys = user.roleKeys;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.tenantId = token.tenantId as string;
        session.user.roleKeys = (token.roleKeys as RoleKey[]) ?? [];
      }
      return session;
    },
  },
});
