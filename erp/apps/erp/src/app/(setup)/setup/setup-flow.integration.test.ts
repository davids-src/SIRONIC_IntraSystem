// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const setInitializedCookie = vi.fn(async () => {});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/initialized-cookie", () => ({ setInitializedCookie }));

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
  process.env.MONGODB_URI = mongo.getUri();
  process.env.MONGODB_DB_NAME = "sironic_erp_setup_smoke";
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

type Authorize = (
  c: Record<string, unknown>,
) => Promise<{ id: string; email: string } | null>;

describe("first start: /setup -> login", () => {
  it("creates the admin, seeds RBAC, and the credentials login accepts only that admin", async () => {
    const { connectDB, hasAnyAdminUser, User, Role, Permission } =
      await import("@erp/db-core");
    const { setupAdminAction } = await import("./actions");
    const { authConfig } = await import("@erp/auth/config");
    const { getSessionAccess } = await import("@erp/auth");

    await connectDB();
    expect(await hasAnyAdminUser()).toBe(false);

    // Invalid input is rejected before touching the DB.
    const bad = await setupAdminAction(
      { success: false },
      form({ name: "A", email: "nope", password: "short", confirmPassword: "x" }),
    );
    expect(bad.success).toBe(false);
    expect(await User.countDocuments()).toBe(0);

    // Happy path: redirects to /login and sets the initialized cookie.
    await expect(
      setupAdminAction(
        { success: false },
        form({
          name: "Admin",
          email: "Admin@Sironic.Local",
          password: "correct-horse-1",
          confirmPassword: "correct-horse-1",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(setInitializedCookie).toHaveBeenCalledOnce();

    expect(await hasAnyAdminUser()).toBe(true);
    const admin = await User.findOne({ email: "admin@sironic.local" });
    expect(admin?.isActive).toBe(true);
    expect(await Role.findOne({ key: "admin" })).not.toBeNull();
    expect(await Permission.countDocuments()).toBeGreaterThan(0);

    // Re-running setup after an admin exists bounces to /setup/complete, no second user.
    await expect(
      setupAdminAction(
        { success: false },
        form({
          name: "Evil",
          email: "evil@x.hu",
          password: "correct-horse-1",
          confirmPassword: "correct-horse-1",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/setup/complete");
    expect(await User.countDocuments()).toBe(1);

    // Credentials login (the provider's authorize).
    const provider = authConfig.providers.find(
      (p) => (p as { id?: string }).id === "credentials",
    ) as unknown as { options: { authorize: Authorize } };
    const authorize = provider.options.authorize;
    const ok = await authorize({
      email: "admin@sironic.local",
      password: "correct-horse-1",
    });
    expect(ok?.email).toBe("admin@sironic.local");
    expect(
      await authorize({ email: "admin@sironic.local", password: "wrong-pass" }),
    ).toBeNull();

    // Admin session carries permissions from the local role; a deactivated user gets none.
    const access = await getSessionAccess(ok!.id);
    expect(access.active).toBe(true);
    expect(access.permissions.size).toBeGreaterThan(0);
    await User.updateOne({ _id: ok!.id }, { isActive: false });
    expect(
      await authorize({ email: "admin@sironic.local", password: "correct-horse-1" }),
    ).toBeNull();
  }, 120_000);
});
