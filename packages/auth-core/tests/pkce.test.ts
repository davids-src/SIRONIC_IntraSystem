import { createHash } from "node:crypto";
import { verifyPkce } from "../src/pkce";

function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

describe("PKCE S256 verification", () => {
  it("accepts a matching verifier/challenge pair", () => {
    const verifier = "a-random-code-verifier-at-least-43-chars-long-per-rfc7636";
    expect(verifyPkce(verifier, challengeFor(verifier))).toBe(true);
  });

  it("rejects a mismatched verifier", () => {
    const challenge = challengeFor("the-real-verifier");
    expect(verifyPkce("a-different-verifier", challenge)).toBe(false);
  });
});
