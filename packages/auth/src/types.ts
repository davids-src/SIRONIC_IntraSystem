import type { DefaultSession } from "next-auth";

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

export {};
