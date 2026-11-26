import type { DefaultSession } from "next-auth";

// Must stay identical to packages/auth/src/types.ts (same-type merge rule for interface members).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      permissions: string[];
      /** `false` once the account is deactivated (or deleted) — the JWT outlives that. */
      active?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    permissions?: string[];
  }
}

export {};
