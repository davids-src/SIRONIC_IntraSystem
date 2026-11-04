import { spawn } from "node:child_process";
import type { CliConfig } from "../config.js";
import { generatePkcePair, generateState } from "./pkce.js";
import { startLoopbackListener } from "./loopback-server.js";
import { saveSession, type StoredSession } from "./store.js";
import { CliHttpError, extractErrorMessage } from "../http-error.js";

const LOGIN_TIMEOUT_MS = 5 * 60_000;

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  const args = platform === "win32" ? ["", url] : [url];
  const child = spawn(cmd, args, {
    shell: platform === "win32",
    stdio: "ignore",
    detached: true,
  });
  child.on("error", () => {
    // Best-effort — the printed URL is the fallback, not an error condition.
  });
  child.unref();
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface ExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    email: string;
    display_name: string | null;
    tenantId: string;
    roleKeys: StoredSession["roleKeys"];
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new CliHttpError(
      extractErrorMessage(data, res.statusText || "Request failed"),
      res.status,
      data,
    );
  }
  return data as T;
}

/** Full PKCE authorization_code login against apps/auth, then the CRM bridge exchange —
 * see apps/crm/app/api/auth/cli/exchange/route.ts for why a second exchange is needed. */
export async function login(config: CliConfig): Promise<StoredSession> {
  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const listener = await startLoopbackListener();

  try {
    const authorizeUrl = new URL("/api/oidc/authorize", config.authUrl);
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("redirect_uri", listener.redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    console.log("Opening your browser to log in to Sironic...");
    console.log(
      `If it doesn't open automatically, visit:\n  ${authorizeUrl.toString()}\n`,
    );
    openBrowser(authorizeUrl.toString());

    const { code } = await listener.waitForCallback(state, LOGIN_TIMEOUT_MS);

    const token = await postJson<TokenResponse>(
      new URL("/api/oidc/token", config.authUrl).toString(),
      {
        grant_type: "authorization_code",
        code,
        redirect_uri: listener.redirectUri,
        client_id: config.clientId,
        code_verifier: verifier,
      },
    );

    const exchange = await postJson<ExchangeResponse>(
      new URL("/api/auth/cli/exchange", config.crmUrl).toString(),
      { id_token: token.id_token },
    );

    const session: StoredSession = {
      access_token: exchange.access_token,
      expires_at: Date.now() + exchange.expires_in * 1000,
      email: exchange.user.email,
      tenantId: exchange.user.tenantId,
      roleKeys: exchange.user.roleKeys,
    };
    saveSession(session);
    return session;
  } finally {
    listener.close();
  }
}
