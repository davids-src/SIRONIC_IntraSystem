import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB, User } from "@erp/db-core";
import { loginSchema } from "./validation";
import { getSessionAccess } from "./permissions";
import { OIDC_PROVIDER_ID, getOidcConfig } from "./oidc";
import { linkOidcIdentity } from "./oidc-link";

const oidc = getOidcConfig();

export const authConfig: NextAuthConfig = {
  providers: [
    // Only when OIDC_ISSUER + OIDC_CLIENT_ID are set. Credentials stays for /setup admin + local dev.
    ...(oidc
      ? [
          {
            id: OIDC_PROVIDER_ID,
            name: "SIRONIC",
            type: "oidc" as const,
            issuer: oidc.issuer,
            clientId: oidc.clientId,
            clientSecret: oidc.clientSecret,
            checks: ["pkce", "state"] as ("pkce" | "state")[],
            client: {
              token_endpoint_auth_method: oidc.clientSecret
                ? "client_secret_basic"
                : "none",
            },
          },
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
        if (!user || !user.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== OIDC_PROVIDER_ID) return true;
      const decision = await linkOidcIdentity({
        sub: account.providerAccountId ?? profile?.sub ?? "",
        email: profile?.email ?? user.email,
        emailVerified: profile?.email_verified === true,
      });
      if (!decision.ok) return `/login?oidc=${decision.reason}`;
      // Session identity is the LOCAL user; permissions are loaded from it in jwt().
      user.id = decision.userId;
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id) {
        if (trigger === "update" || user?.id) {
          const dbUser = await User.findById(token.id)
            .select("name email image")
            .lean()
            .exec();
          if (dbUser) {
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.picture = dbUser.image ?? undefined;
          }
        }
        const { permissions } = await getSessionAccess(token.id as string);
        token.permissions = Array.from(permissions);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        const access = await getSessionAccess(token.id as string);
        session.user.permissions = Array.from(access.permissions);
        session.user.active = access.active;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
