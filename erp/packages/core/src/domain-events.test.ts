import { describe, expect, it, afterEach, vi } from "vitest";
import {
  emitDomainEvent,
  onDomainEvent,
  clearDomainEventListenersForTests,
} from "./domain-events";

afterEach(() => {
  clearDomainEventListenersForTests();
});

describe("domain-events", () => {
  it("invokes every listener registered for an event", async () => {
    const a = vi.fn();
    const b = vi.fn();
    onDomainEvent("job.created", a);
    onDomainEvent("job.created", b);

    await emitDomainEvent("job.created", {
      jobId: "1",
      code: "00001",
      name: "Teszt munka",
    });

    expect(a).toHaveBeenCalledWith({ jobId: "1", code: "00001", name: "Teszt munka" });
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("emitting with no listeners does not throw", async () => {
    await expect(
      emitDomainEvent("job.created", { jobId: "1", code: "00001", name: "Teszt munka" }),
    ).resolves.toBeUndefined();
  });

  it("a failing listener does not stop other listeners or reject", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    const succeeding = vi.fn();
    onDomainEvent("job.created", failing);
    onDomainEvent("job.created", succeeding);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      emitDomainEvent("job.created", { jobId: "1", code: "00001", name: "Teszt munka" }),
    ).resolves.toBeUndefined();

    expect(succeeding).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
