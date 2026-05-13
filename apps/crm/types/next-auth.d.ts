import type { DefaultSession } from "next-auth";
import type { RoleKey } from "@crm/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      roleKeys: RoleKey[];
    } & DefaultSession["user"];
  }

  interface User {
    tenantId: string;
    roleKeys: RoleKey[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    roleKeys?: RoleKey[];
  }
}
