// Client-safe only — no node:crypto, no DB models, no bcrypt/jose. Anything with a server
// dependency lives in ./server.ts (same split convention as @crm/lib) so a "use client"
// component can import this package without webpack trying to bundle node:crypto for the
// browser.
export { isSafeReturnTo } from "./safe-return-to";
