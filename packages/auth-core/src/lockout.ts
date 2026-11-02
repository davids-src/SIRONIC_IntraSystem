/** Pure policy — the caller persists the returned fields onto PlatformUser. */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function isLockedOut(lockedUntil: Date | null | undefined): boolean {
  return !!lockedUntil && lockedUntil.getTime() > Date.now();
}

export function recordFailedAttempt(currentFailedCount: number): {
  failed_login_count: number;
  locked_until: Date | null;
} {
  const failed_login_count = currentFailedCount + 1;
  const locked_until =
    failed_login_count >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MS)
      : null;
  return { failed_login_count, locked_until };
}

export function resetLockout(): { failed_login_count: number; locked_until: null } {
  return { failed_login_count: 0, locked_until: null };
}
