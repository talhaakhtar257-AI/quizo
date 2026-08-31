// Anti-cheating event types, per docs/FEATURES.md §7. `quiz_started` and
// `quiz_submitted` are bookkeeping bookends, not violations — they don't
// carry a weight below.
export type CheatEventType =
  | "quiz_started"
  | "tab_switch"
  | "fullscreen_exit"
  | "copy_attempt"
  | "paste_attempt"
  | "fast_answer"
  | "quiz_submitted";

export interface ViolationCounts {
  tabSwitch: number;
  fullscreenExit: number;
  fastAnswer: number;
  copyAttempt: number;
  pasteAttempt: number;
}

// docs/FEATURES.md §7: 100 minus a per-violation-type weight, floored at 0.
// copy_attempt and paste_attempt share copy/paste's -5 weight — the spec
// lists one "Copy/paste disable" feature and one "Copy attempt" weight, not
// a separate one for paste.
const WEIGHTS: Record<keyof ViolationCounts, number> = {
  tabSwitch: 5,
  fullscreenExit: 10,
  fastAnswer: 3,
  copyAttempt: 5,
  pasteAttempt: 5,
};

export const INTEGRITY_FLAG_THRESHOLD = 70;

export function countViolations(events: { event_type: string }[]): ViolationCounts {
  const counts: ViolationCounts = {
    tabSwitch: 0,
    fullscreenExit: 0,
    fastAnswer: 0,
    copyAttempt: 0,
    pasteAttempt: 0,
  };
  for (const event of events) {
    switch (event.event_type as CheatEventType) {
      case "tab_switch":
        counts.tabSwitch += 1;
        break;
      case "fullscreen_exit":
        counts.fullscreenExit += 1;
        break;
      case "fast_answer":
        counts.fastAnswer += 1;
        break;
      case "copy_attempt":
        counts.copyAttempt += 1;
        break;
      case "paste_attempt":
        counts.pasteAttempt += 1;
        break;
    }
  }
  return counts;
}

export function computeIntegrityScore(counts: ViolationCounts): number {
  const deduction = (Object.keys(counts) as (keyof ViolationCounts)[]).reduce(
    (sum, key) => sum + counts[key] * WEIGHTS[key],
    0
  );
  return Math.max(0, 100 - deduction);
}

export function isFlagged(integrityScore: number): boolean {
  return integrityScore < INTEGRITY_FLAG_THRESHOLD;
}
