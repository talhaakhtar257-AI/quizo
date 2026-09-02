import { describe, expect, it } from "vitest";
import {
  INTEGRITY_FLAG_THRESHOLD,
  computeIntegrityScore,
  countViolations,
  isFlagged,
} from "@/lib/anti-cheat";

const NONE = { tabSwitch: 0, fullscreenExit: 0, fastAnswer: 0, copyAttempt: 0, pasteAttempt: 0 };

describe("countViolations", () => {
  it("counts each violation type separately", () => {
    const counts = countViolations([
      { event_type: "tab_switch" },
      { event_type: "tab_switch" },
      { event_type: "fullscreen_exit" },
      { event_type: "copy_attempt" },
      { event_type: "paste_attempt" },
      { event_type: "fast_answer" },
    ]);
    expect(counts).toEqual({
      tabSwitch: 2,
      fullscreenExit: 1,
      fastAnswer: 1,
      copyAttempt: 1,
      pasteAttempt: 1,
    });
  });

  it("ignores the bookkeeping bookends", () => {
    // quiz_started / quiz_submitted are logged for every attempt. If they
    // ever counted as violations, every honest student would be flagged.
    expect(countViolations([{ event_type: "quiz_started" }, { event_type: "quiz_submitted" }])).toEqual(NONE);
  });

  it("ignores an unknown event type instead of throwing", () => {
    expect(countViolations([{ event_type: "something_new" }])).toEqual(NONE);
  });
});

describe("computeIntegrityScore", () => {
  it("gives a clean attempt 100", () => {
    expect(computeIntegrityScore(NONE)).toBe(100);
  });

  it("applies the documented per-type weights", () => {
    expect(computeIntegrityScore({ ...NONE, tabSwitch: 1 })).toBe(95);
    expect(computeIntegrityScore({ ...NONE, fullscreenExit: 1 })).toBe(90);
    expect(computeIntegrityScore({ ...NONE, fastAnswer: 1 })).toBe(97);
    expect(computeIntegrityScore({ ...NONE, copyAttempt: 1 })).toBe(95);
    expect(computeIntegrityScore({ ...NONE, pasteAttempt: 1 })).toBe(95);
  });

  it("adds deductions together", () => {
    // 2 tab switches (10) + 1 fullscreen exit (10) + 1 fast answer (3)
    expect(computeIntegrityScore({ ...NONE, tabSwitch: 2, fullscreenExit: 1, fastAnswer: 1 })).toBe(77);
  });

  it("floors at zero — a score is never negative", () => {
    expect(computeIntegrityScore({ ...NONE, tabSwitch: 100 })).toBe(0);
  });
});

describe("isFlagged", () => {
  it("flags below the threshold and not at or above it", () => {
    expect(isFlagged(INTEGRITY_FLAG_THRESHOLD - 1)).toBe(true);
    expect(isFlagged(INTEGRITY_FLAG_THRESHOLD)).toBe(false);
    expect(isFlagged(100)).toBe(false);
  });

  it("does not flag a student for a couple of tab switches", () => {
    // Someone glancing at another window twice is careless, not cheating.
    expect(isFlagged(computeIntegrityScore({ ...NONE, tabSwitch: 2 }))).toBe(false);
  });

  it("flags a student who left fullscreen three times", () => {
    expect(isFlagged(computeIntegrityScore({ ...NONE, fullscreenExit: 4 }))).toBe(true);
  });
});
