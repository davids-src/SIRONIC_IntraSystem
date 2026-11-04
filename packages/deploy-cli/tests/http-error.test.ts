import { extractErrorMessage } from "../src/http-error.js";

describe("extractErrorMessage", () => {
  it("passes through a plain string error", () => {
    expect(extractErrorMessage({ error: "Not found" }, "fallback")).toBe("Not found");
  });

  it("flattens Zod formErrors and fieldErrors", () => {
    const data = {
      error: {
        formErrors: ["Top level issue"],
        fieldErrors: { domain: ["Required"], name: ["Too short", "Required"] },
      },
    };
    const msg = extractErrorMessage(data, "fallback");
    expect(msg).toContain("Top level issue");
    expect(msg).toContain("domain: Required");
    expect(msg).toContain("name: Too short, Required");
  });

  it("falls back for unrecognized shapes", () => {
    expect(extractErrorMessage(null, "fallback")).toBe("fallback");
    expect(extractErrorMessage({}, "fallback")).toBe("fallback");
  });
});
