import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with a retry hint", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(rl.hit("a", 0).ok).toBe(true);
    expect(rl.hit("a", 10).ok).toBe(true);
    expect(rl.hit("a", 20).ok).toBe(true);
    const blocked = rl.hit("a", 30);
    expect(blocked).toEqual({ ok: false, retryAfterSec: 1 });
  });

  it("isolates keys and resets after the window", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.hit("a", 0).ok).toBe(true);
    expect(rl.hit("a", 1).ok).toBe(false);
    expect(rl.hit("b", 1).ok).toBe(true);
    expect(rl.hit("a", 1000).ok).toBe(true);
  });

  it("reset clears all buckets", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    rl.hit("a", 0);
    rl.reset();
    expect(rl.hit("a", 1).ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("prefers the first forwarded address", () => {
    const h = new Headers({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      "x-real-ip": "9.9.9.9",
    });
    expect(clientKey(h)).toBe("1.2.3.4");
    expect(clientKey(new Headers())).toBe("ismeretlen");
  });
});
