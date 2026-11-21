import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@erp/lib/utils";
import { mapLegacySecret } from "./migrate";

const KEY = "0123456789abcdef0123456789abcdef";
const ctx = { userIdMap: new Map([["old-u", "new-u"]]) };

describe("mapLegacySecret", () => {
  const prev = process.env.SECRETS_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
    else process.env.SECRETS_ENCRYPTION_KEY = prev;
  });

  it("re-uses the ciphertext byte-for-byte (decryptable with the same key)", () => {
    const cipher = encryptSecret("legacy-pass");
    const r = mapLegacySecret(
      {
        _id: "1",
        key: "db",
        encrypted_value: cipher,
        created_by: "old-u",
        contact_id: "c1",
        visibility: "private",
      },
      ctx,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.secret.valueEncrypted).toBe(cipher);
    expect(decryptSecret(r.secret.valueEncrypted)).toBe("legacy-pass");
    expect(r.secret).toMatchObject({
      name: "db",
      ownerId: "new-u",
      partnerId: "c1",
      needsShareReview: false,
    });
  });

  it("flags shared rows for review and maps partner ids", () => {
    const r = mapLegacySecret(
      {
        _id: "1",
        key: "k",
        encrypted_value: encryptSecret("x"),
        created_by: "old-u",
        contact_id: "c1",
        project_id: "p9",
      },
      { ...ctx, partnerIdMap: new Map([["c1", "p-new"]]) },
    );
    expect(r.ok && r.secret.needsShareReview).toBe(true);
    expect(r.ok && r.secret.partnerId).toBe("p-new");
    expect(r.ok && r.secret.description).toContain("p9");
  });

  it("rejects rows that cannot be migrated safely", () => {
    const good = encryptSecret("x");
    expect(
      mapLegacySecret(
        { _id: 1, key: "", encrypted_value: good, created_by: "old-u" },
        ctx,
      ).ok,
    ).toBe(false);
    expect(
      mapLegacySecret(
        { _id: 1, key: "k", encrypted_value: "plaintext", created_by: "old-u" },
        ctx,
      ).ok,
    ).toBe(false);
    expect(
      mapLegacySecret(
        { _id: 1, key: "k", encrypted_value: good, created_by: "ghost" },
        ctx,
      ).ok,
    ).toBe(false);
  });
});
