import { describe, expect, it } from "vitest";
import {
  computeSecondsRemaining,
  fallbackOrder,
  initialDifficulty,
  nextDifficulty,
  questionAvailabilityDetail,
  requiredLevels,
  type Difficulty,
} from "@/lib/quiz-engine";

// The adaptive ladder is the core of the product (CLAUDE.md "The adaptive
// engine"). If it silently breaks, every quiz still "works" — it just stops
// being adaptive, which nobody would notice by clicking around.

describe("nextDifficulty — the adaptive ladder", () => {
  it("climbs one step on a correct answer", () => {
    expect(nextDifficulty("easy", true, "adaptive")).toBe("medium");
    expect(nextDifficulty("medium", true, "adaptive")).toBe("hard");
  });

  it("drops one step on a wrong answer", () => {
    expect(nextDifficulty("hard", false, "adaptive")).toBe("medium");
    expect(nextDifficulty("medium", false, "adaptive")).toBe("easy");
  });

  it("stops at the hard ceiling and the easy floor", () => {
    expect(nextDifficulty("hard", true, "adaptive")).toBe("hard");
    expect(nextDifficulty("easy", false, "adaptive")).toBe("easy");
  });

  it("never moves in a locked single-level mode", () => {
    for (const mode of ["easy_only", "medium_only", "hard_only"] as const) {
      const level = initialDifficulty(mode);
      expect(nextDifficulty(level, true, mode)).toBe(level);
      expect(nextDifficulty(level, false, mode)).toBe(level);
    }
  });

  it("walks a full attempt the way a real student would", () => {
    // right, right, right, wrong, wrong, right
    const answers = [true, true, true, false, false, true];
    const seen: Difficulty[] = [];
    let level = initialDifficulty("adaptive");
    for (const correct of answers) {
      seen.push(level);
      level = nextDifficulty(level, correct, "adaptive");
    }
    expect(seen).toEqual(["easy", "medium", "hard", "hard", "medium", "easy"]);
    expect(level).toBe("medium");
  });
});

describe("initialDifficulty", () => {
  it("always starts an adaptive attempt at easy", () => {
    expect(initialDifficulty("adaptive")).toBe("easy");
  });

  it("starts a locked mode at its own level", () => {
    expect(initialDifficulty("easy_only")).toBe("easy");
    expect(initialDifficulty("medium_only")).toBe("medium");
    expect(initialDifficulty("hard_only")).toBe("hard");
  });
});

describe("fallbackOrder — what happens when a pool runs dry", () => {
  it("always tries the current level first", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      expect(fallbackOrder(level)[0]).toBe(level);
    }
  });

  it("falls easy forward to medium and hard back to medium", () => {
    expect(fallbackOrder("easy")).toEqual(["easy", "medium"]);
    expect(fallbackOrder("hard")).toEqual(["hard", "medium"]);
  });

  it("falls medium to easy first, then hard", () => {
    expect(fallbackOrder("medium")).toEqual(["medium", "easy", "hard"]);
  });

  it("never lists a level twice", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const order = fallbackOrder(level);
      expect(new Set(order).size).toBe(order.length);
    }
  });
});

describe("requiredLevels", () => {
  it("needs all three levels for an adaptive quiz", () => {
    expect(requiredLevels("adaptive")).toEqual(["easy", "medium", "hard"]);
  });

  it("needs only its own level in a locked mode", () => {
    expect(requiredLevels("hard_only")).toEqual(["hard"]);
  });
});

describe("questionAvailabilityDetail — the publish gate", () => {
  it("blocks an adaptive quiz that is short at any single level", () => {
    const result = questionAvailabilityDetail({ easy: 10, medium: 10, hard: 3 }, "adaptive", 10);
    expect(result.ok).toBe(false);
    expect(result.detail).toBe("Easy 10, Medium 10, Hard 3");
  });

  it("allows an adaptive quiz with enough at every level", () => {
    expect(questionAvailabilityDetail({ easy: 10, medium: 12, hard: 30 }, "adaptive", 10).ok).toBe(true);
  });

  it("ignores other levels in a locked mode", () => {
    // Nothing at easy or medium, but the quiz is hard_only — still fine.
    expect(questionAvailabilityDetail({ easy: 0, medium: 0, hard: 10 }, "hard_only", 10).ok).toBe(true);
  });
});

describe("computeSecondsRemaining — the server owns the clock", () => {
  it("counts down from the time limit using started_at", () => {
    const startedAt = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    const remaining = computeSecondsRemaining(10, startedAt);
    expect(remaining).toBeGreaterThan(530);
    expect(remaining).toBeLessThanOrEqual(540);
  });

  it("floors at zero instead of going negative", () => {
    const startedAt = new Date(Date.now() - 3_600_000).toISOString(); // 1 hr ago
    expect(computeSecondsRemaining(10, startedAt)).toBe(0);
  });

  it("never expires a quiz with no time limit", () => {
    const startedAt = new Date("2020-01-01").toISOString();
    expect(computeSecondsRemaining(null, startedAt)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
