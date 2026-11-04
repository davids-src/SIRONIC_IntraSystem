import { createServer, type Server } from "node:http";
import { LOOPBACK_CALLBACK_PORTS } from "../config.js";

export interface CallbackResult {
  code: string;
  state: string;
}

export interface LoopbackListener {
  redirectUri: string;
  /** Resolves with the authorize redirect's query params once the browser hits /callback,
   * or rejects if the user denies, the state doesn't match, or `timeoutMs` elapses first. */
  waitForCallback(expectedState: string, timeoutMs: number): Promise<CallbackResult>;
  close(): void;
}

const PAGE_OK = `<!doctype html><html><body style="font-family:sans-serif">
<p>Sikeres bejelentkezés. Ez az ablak bezárható.</p></body></html>`;
const PAGE_ERR = `<!doctype html><html><body style="font-family:sans-serif">
<p>A bejelentkezés sikertelen. Térj vissza a terminálhoz.</p></body></html>`;

function listenOnFirstAvailablePort(
  server: Server,
  ports: readonly number[],
): Promise<number> {
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      if (i >= ports.length) {
        reject(
          new Error(
            `All loopback callback ports are in use: ${ports.join(", ")}. Free one and retry.`,
          ),
        );
        return;
      }
      const port: number = ports[i++]!;
      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          tryNext();
        } else {
          reject(err);
        }
      });
      server.listen(port, "127.0.0.1", () => resolve(port));
    };
    tryNext();
  });
}

export async function startLoopbackListener(): Promise<LoopbackListener> {
  let onResult:
    | ((r: { ok: true; result: CallbackResult } | { ok: false; error: string }) => void)
    | null = null;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname !== "/callback") {
      res.writeHead(404).end();
      return;
    }
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (error || !code || !state) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE_ERR);
      onResult?.({ ok: false, error: error ?? "missing code/state" });
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE_OK);
    onResult?.({ ok: true, result: { code, state } });
  });

  const port = await listenOnFirstAvailablePort(server, LOOPBACK_CALLBACK_PORTS);
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  return {
    redirectUri,
    waitForCallback(expectedState, timeoutMs) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          onResult = null;
          reject(new Error("Timed out waiting for the browser login to complete."));
        }, timeoutMs);
        onResult = (outcome) => {
          clearTimeout(timer);
          if (!outcome.ok) {
            reject(new Error(`Login failed: ${outcome.error}`));
            return;
          }
          if (outcome.result.state !== expectedState) {
            reject(
              new Error("State mismatch on OIDC callback — possible CSRF, aborting."),
            );
            return;
          }
          resolve(outcome.result);
        };
      });
    },
    close() {
      server.close();
    },
  };
}
