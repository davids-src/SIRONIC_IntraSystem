import { createHash } from "node:crypto";

/** RFC 7636 S256: base64url(SHA256(code_verifier)) must equal the stored code_challenge. */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}
