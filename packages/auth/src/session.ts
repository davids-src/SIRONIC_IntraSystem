import { auth } from "./auth-instance";

/** Where a still-signed-in but deactivated account is sent to sign out. */
export const INACTIVE_ACCOUNT_PATH = "/fiok-letiltva";

/** `null` for no session — and for a session whose account has been deactivated since. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id || session.user.active === false) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    image: session.user.image,
    permissions: session.user.permissions ?? [],
  };
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  // Not to /login: the middleware still sees a valid JWT and would bounce back here.
  if (session?.user?.id && session.user.active === false) {
    const { redirect } = await import("next/navigation");
    redirect(INACTIVE_ACCOUNT_PATH);
  }
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
    throw new Error("Unauthenticated");
  }
  return user;
}

export async function requirePermission(permissionKey: string) {
  const user = await requireAuth();
  if (!user?.permissions.includes(permissionKey)) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}

export async function requireAnyPermission(permissionKeys: string[]) {
  const user = await requireAuth();
  if (!user || !permissionKeys.some((key) => user.permissions.includes(key))) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}

export async function hasPermission(permissionKey: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(permissionKey);
}

export async function hasAnyPermission(permissionKeys: string[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return permissionKeys.some((key) => user.permissions.includes(key));
}
