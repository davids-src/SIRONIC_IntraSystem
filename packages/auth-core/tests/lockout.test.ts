import {
  isLockedOut,
  recordFailedAttempt,
  resetLockout,
  MAX_FAILED_ATTEMPTS,
} from "../src/lockout";

describe("lockout", () => {
  it("is not locked out with no locked_until", () => {
    expect(isLockedOut(null)).toBe(false);
    expect(isLockedOut(undefined)).toBe(false);
  });

  it("is locked out while locked_until is in the future", () => {
    expect(isLockedOut(new Date(Date.now() + 60_000))).toBe(true);
  });

  it("is not locked out once locked_until is in the past", () => {
    expect(isLockedOut(new Date(Date.now() - 60_000))).toBe(false);
  });

  it("does not lock before reaching the threshold", () => {
    let state = { failed_login_count: 0, locked_until: null as Date | null };
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) {
      state = recordFailedAttempt(state.failed_login_count);
      expect(state.locked_until).toBeNull();
    }
    expect(state.failed_login_count).toBe(MAX_FAILED_ATTEMPTS - 1);
  });

  it("locks on reaching the threshold", () => {
    const state = recordFailedAttempt(MAX_FAILED_ATTEMPTS - 1);
    expect(state.failed_login_count).toBe(MAX_FAILED_ATTEMPTS);
    expect(state.locked_until).not.toBeNull();
    expect(state.locked_until!.getTime()).toBeGreaterThan(Date.now());
  });

  it("resets to zero / null", () => {
    expect(resetLockout()).toEqual({ failed_login_count: 0, locked_until: null });
  });
});
