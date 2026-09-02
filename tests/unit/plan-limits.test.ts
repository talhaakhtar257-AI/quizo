import { describe, expect, it } from "vitest";
import { planLimitError, parsePlanLimitError } from "@/lib/plan-limits";

// A Server Action's Error only survives the client boundary as `.message`,
// so this prefix convention is the only thing telling a form "show the
// upgrade prompt" instead of plain red error text.

describe("plan-limit errors", () => {
  it("round-trips the plain-English message", () => {
    const error = planLimitError("This course is full — the free plan allows 25 students.");
    expect(parsePlanLimitError(error)).toBe("This course is full — the free plan allows 25 students.");
  });

  it("survives being flattened to a plain Error, as it is across the boundary", () => {
    const thrown = planLimitError("Upgrade to add more courses.");
    const flattened = new Error(thrown.message);
    expect(parsePlanLimitError(flattened)).toBe("Upgrade to add more courses.");
  });

  it("returns null for an ordinary error, so it renders as a normal message", () => {
    expect(parsePlanLimitError(new Error("Could not save this course."))).toBeNull();
  });

  it("returns null for things that are not errors at all", () => {
    expect(parsePlanLimitError("PLAN_LIMIT:not an Error object")).toBeNull();
    expect(parsePlanLimitError(null)).toBeNull();
    expect(parsePlanLimitError(undefined)).toBeNull();
  });

  it("does not match an error that merely mentions the prefix mid-message", () => {
    expect(parsePlanLimitError(new Error("failed: PLAN_LIMIT:x"))).toBeNull();
  });
});
