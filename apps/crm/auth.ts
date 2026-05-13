import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDb, CrmUserModel } from "@crm/db";
import type { RoleKey } from "@crm/types";

function isCrmRoleKey(k: string): k is "crm.admin" | "crm.staff" {
  return k === "crm.admin" || k === "crm.staff";
}

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
        const user = await CrmUserModel.findOne({ email: email.toLowerCase() }).lean();
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
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.roleKeys = user.roleKeys;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.tenantId = token.tenantId as string;
        session.user.roleKeys = (token.roleKeys as RoleKey[]) ?? [];
      }
      return session;
    },
  },
});
