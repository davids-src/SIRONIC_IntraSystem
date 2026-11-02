import { hashPassword, verifyPassword } from "../src/password";

describe("password", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toBe(b);
  });
});
