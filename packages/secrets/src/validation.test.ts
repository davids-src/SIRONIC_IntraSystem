import { describe, expect, it } from "vitest";
import { createSecretSchema, shareSchema, updateSecretSchema } from "./validation";

describe("validation", () => {
  it("create requires name and value, trims, drops empty optionals", () => {
    expect(createSecretSchema.safeParse({ name: " ", value: "x" }).success).toBe(false);
    expect(createSecretSchema.safeParse({ name: "a", value: "" }).success).toBe(false);
    const r = createSecretSchema.parse({
      name: " db ",
      value: "x",
      description: "",
      partnerId: "",
    });
    expect(r).toEqual({
      name: "db",
      value: "x",
      description: undefined,
      partnerId: undefined,
    });
  });

  it("update treats an empty value as unchanged", () => {
    expect(updateSecretSchema.parse({ name: "a", value: "" }).value).toBeUndefined();
    expect(updateSecretSchema.parse({ name: "a", value: "n" }).value).toBe("n");
  });

  it("share defaults to read and rejects unknown kinds", () => {
    expect(shareSchema.parse({ kind: "user", targetId: "1" }).level).toBe("read");
    expect(shareSchema.safeParse({ kind: "group", targetId: "1" }).success).toBe(false);
  });
});
