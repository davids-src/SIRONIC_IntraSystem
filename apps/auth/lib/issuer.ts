/** The OIDC issuer identity — must be identical across discovery, token, and userinfo, or
 * relying parties checking any of them against each other will fail to verify. */
export function issuer(): string {
  return process.env.AUTH_URL || "http://localhost:3005";
}
