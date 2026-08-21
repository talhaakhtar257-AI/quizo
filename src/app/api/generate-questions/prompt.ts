export type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTY_DEFINITIONS: Record<Difficulty, string> = {
  easy:
    "EASY means remembering. Use a short, plain scenario testing one concept " +
    "where the answer sits near the surface of the material. Wrong options " +
    "should be clearly wrong to anyone who read the material.",
  medium:
    "MEDIUM means applying. Use a realistic situation that requires applying " +
    "a rule from the material, and may combine two concepts. Wrong options " +
    "should be believable to someone who only half understood the material.",
  hard:
    "HARD means analysing and judging. Use a layered scenario containing at " +
    "least one misleading detail. The student must choose between two " +
    "options that both look correct at first glance. Wrong options must be " +
    "wrong for a subtle reason, not an obvious one.",
};

export function buildPrompt(
  contentText: string,
  difficulty: Difficulty,
  questionCount: number
): string {
  return `You are an expert quiz item writer creating exam questions for a South Asian student and workplace training platform.

SOURCE MATERIAL:
"""
${contentText}
"""

Write exactly ${questionCount} ${difficulty.toUpperCase()} multiple-choice questions based ONLY on the source material above.

DIFFICULTY: ${difficulty.toUpperCase()}
${DIFFICULTY_DEFINITIONS[difficulty]}

MANDATORY RULES — every question must follow ALL of these:
1. SCENARIO-BASED: begin with a realistic 2-4 sentence situation set in everyday South Asian student or workplace life (a classroom, a shop, an office, a family situation), THEN ask the question. Never write a bare definition question like "What is X?".
2. Exactly 4 answer options. Exactly one is correct.
3. All four options must be ROUGHLY EQUAL LENGTH (within a few words of each other). The correct answer must NEVER be noticeably the longest option — that is a classic giveaway students learn to exploit.
4. Every wrong option must be wrong for a SPECIFIC reason traceable to the source material — never random or nonsensical distractors.
5. Include a short (1-2 sentence) explanation of why the correct answer is correct.
6. NEVER use "All of the above" or "None of the above" as an option.
7. Do NOT include "A)", "B)", "C)", "D)" or any letter prefixes inside the option text itself.
8. Write in the SAME LANGUAGE as the source material. If the source is in Urdu, write the questions in Urdu. If English, write in English.

Return ONLY a JSON array (no markdown, no code fences, no commentary) matching exactly this shape:
[
  {
    "scenario_text": "the 2-4 sentence situation",
    "question_text": "the actual question being asked",
    "options": [
      { "option_text": "...", "is_correct": true },
      { "option_text": "...", "is_correct": false },
      { "option_text": "...", "is_correct": false },
      { "option_text": "...", "is_correct": false }
    ],
    "explanation": "why the correct answer is correct"
  }
]

The array must contain exactly ${questionCount} items.`;
}

export interface GeneratedOption {
  option_text: string;
  is_correct: boolean;
}

export interface GeneratedQuestion {
  scenario_text: string;
  question_text: string;
  options: GeneratedOption[];
  explanation: string;
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function parseGeneratedQuestions(raw: string): GeneratedQuestion[] {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Response was not a non-empty JSON array");
  }

  for (const item of parsed) {
    const options = item?.options;
    const validOptions =
      Array.isArray(options) &&
      options.length === 4 &&
      options.filter((option: GeneratedOption) => option?.is_correct === true).length === 1 &&
      options.every(
        (option: GeneratedOption) =>
          typeof option?.option_text === "string" && option.option_text.trim().length > 0
      );

    if (
      typeof item?.question_text !== "string" ||
      !item.question_text.trim() ||
      typeof item?.scenario_text !== "string" ||
      !item.scenario_text.trim() ||
      typeof item?.explanation !== "string" ||
      !validOptions
    ) {
      throw new Error("Malformed question object in response");
    }
  }

  return parsed as GeneratedQuestion[];
}
