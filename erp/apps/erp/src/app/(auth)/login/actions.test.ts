import { describe, expect, it } from "vitest";
import { loginSchema } from "@erp/auth/validation";

describe("loginSchema", () => {
  it("validates correct login input", () => {
    const result = loginSchema.safeParse({
      email: "admin@sironic.local",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});
