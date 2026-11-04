import { createHash, randomBytes } from "node:crypto";

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** RFC 7636 — verifier is 43-128 chars of unreserved characters; base64url of 32 random
 * bytes (43 chars, no padding) comfortably satisfies that. */
export function generatePkcePair(): PkcePair {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateState(): string {
  return base64url(randomBytes(16));
}
