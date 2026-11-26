import {
  safeReturnTo,
  withReturnTo,
  loginRedirectTarget,
  setupRedirectTarget,
} from "../lib/redirect-target";

const ORIGINAL_AUTH_URL = process.env.AUTH_URL;

beforeAll(() => {
  process.env.AUTH_URL = "https://auth.sironic.eu";
});

afterAll(() => {
  process.env.AUTH_URL = ORIGINAL_AUTH_URL;
});

describe("safeReturnTo", () => {
  it("accepts a same-origin path", () => {
    expect(safeReturnTo("/dashboard")).toBe("/dashboard");
  });

  it("picks the first value out of a duplicated query param", () => {
    expect(safeReturnTo(["/dashboard", "/other"])).toBe("/dashboard");
  });

  it("rejects a cross-origin target", () => {
    expect(safeReturnTo("https://evil.com")).toBeNull();
  });

  it("returns null when absent", () => {
    expect(safeReturnTo(undefined)).toBeNull();
  });
});

describe("withReturnTo", () => {
  it("appends an encoded return_to when present", () => {
    expect(withReturnTo("/login", "/dashboard?x=1")).toBe(
      "/login?return_to=%2Fdashboard%3Fx%3D1",
    );
  });

  it("leaves the path unchanged when absent", () => {
    expect(withReturnTo("/login", null)).toBe("/login");
  });
});

describe("loginRedirectTarget", () => {
  it("sends a fresh system to /setup, threading return_to", () => {
    expect(
      loginRedirectTarget({ userCount: 0, hasSession: false, returnTo: "/billing" }),
    ).toBe("/setup?return_to=%2Fbilling");
  });

  it("sends a fresh system to /setup even without return_to", () => {
    expect(loginRedirectTarget({ userCount: 0, hasSession: false, returnTo: null })).toBe(
      "/setup",
    );
  });

  // Regression test: login/page.tsx's existing auto-redirect for an already-authenticated
  // visitor, which should bypass the login form entirely.
  it("auto-redirects an existing session to its return_to", () => {
    expect(
      loginRedirectTarget({ userCount: 1, hasSession: true, returnTo: "/billing" }),
    ).toBe("/billing");
  });

  it("auto-redirects an existing session to /me when there is no return_to", () => {
    expect(loginRedirectTarget({ userCount: 1, hasSession: true, returnTo: null })).toBe(
      "/me",
    );
  });

  it("renders the login form when there is no session", () => {
    expect(
      loginRedirectTarget({ userCount: 1, hasSession: false, returnTo: "/billing" }),
    ).toBeNull();
  });
});

describe("setupRedirectTarget", () => {
  it("renders the setup form when there are no users yet", () => {
    expect(setupRedirectTarget({ userCount: 0, returnTo: "/billing" })).toBeNull();
  });

  // This is the bug being fixed: /setup used to redirect to a bare "/login", dropping
  // return_to, once a user already existed.
  it("sends an already-configured system back to /login, threading return_to", () => {
    expect(setupRedirectTarget({ userCount: 1, returnTo: "/billing" })).toBe(
      "/login?return_to=%2Fbilling",
    );
  });

  it("sends an already-configured system to /login even without return_to", () => {
    expect(setupRedirectTarget({ userCount: 1, returnTo: null })).toBe("/login");
  });
});

describe("fresh-setup flow end to end", () => {
  it("carries a return_to from the initial /login hit all the way to the final destination", () => {
    // 1. GET /login?return_to=/billing with 0 users -> redirected to /setup, return_to intact.
    const toSetup = loginRedirectTarget({
      userCount: 0,
      hasSession: false,
      returnTo: "/billing",
    });
    expect(toSetup).toBe("/setup?return_to=%2Fbilling");

    // 2. /setup renders its form (still 0 users) and passes return_to down to SetupForm,
    //    which, on success, navigates with the same helper the page used above.
    expect(setupRedirectTarget({ userCount: 0, returnTo: "/billing" })).toBeNull();
    const toLogin = withReturnTo("/login", "/billing");
    expect(toLogin).toBe("/login?return_to=%2Fbilling");

    // 3. Back on /login, now with 1 user and (after the user authenticates) a session ->
    //    lands on the originally-requested destination, not the /me default.
    const final = loginRedirectTarget({
      userCount: 1,
      hasSession: true,
      returnTo: "/billing",
    });
    expect(final).toBe("/billing");
  });
});
