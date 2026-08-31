"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, useToast, type Difficulty } from "@/components/ui";
import { createManualQuestion } from "../actions";

const EMPTY_OPTIONS = ["", "", "", ""];

function emptyState() {
  return {
    difficulty: "easy" as Difficulty,
    questionText: "",
    explanation: "",
    options: [...EMPTY_OPTIONS],
    correctIndex: null as number | null,
  };
}

export function NewQuestionForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, setState] = useState(emptyState());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function validate(): string | null {
    if (state.questionText.trim().length < 10) {
      return "Question text must be at least 10 characters.";
    }
    const trimmedOptions = state.options.map((option) => option.trim());
    if (trimmedOptions.some((option) => !option)) {
      return "All 4 options must be filled in.";
    }
    const lower = trimmedOptions.map((option) => option.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      return "Options must not be duplicates of each other.";
    }
    if (state.correctIndex === null) {
      return "Select which option is correct.";
    }
    return null;
  }

  async function save(after: "add-another" | "finish") {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);

    try {
      await createManualQuestion(quizId, {
        difficulty: state.difficulty,
        questionText: state.questionText.trim(),
        explanation: state.explanation.trim(),
        options: state.options.map((text, index) => ({
          text: text.trim(),
          isCorrect: index === state.correctIndex,
        })),
      });

      showToast("Question added", "success");

      if (after === "finish") {
        router.push(`/dashboard/quizzes/${quizId}/questions`);
        router.refresh();
      } else {
        setState(emptyState());
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save the question."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-fg" htmlFor="new-question-difficulty">
          Difficulty
        </label>
        <select
          id="new-question-difficulty"
          value={state.difficulty}
          onChange={(event) =>
            setState((current) => ({ ...current, difficulty: event.target.value as Difficulty }))
          }
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <Textarea
        label="Question (include the scenario, if any)"
        rows={4}
        value={state.questionText}
        onChange={(event) =>
          setState((current) => ({ ...current, questionText: event.target.value }))
        }
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-fg">Options — select the correct one</p>
        {state.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct-option"
              checked={state.correctIndex === index}
              onChange={() => setState((current) => ({ ...current, correctIndex: index }))}
              aria-label={`Mark option ${index + 1} as correct`}
              className="size-4 shrink-0"
            />
            <Input
              value={option}
              onChange={(event) => {
                const next = [...state.options];
                next[index] = event.target.value;
                setState((current) => ({ ...current, options: next }));
              }}
              className="flex-1"
            />
          </div>
        ))}
      </div>

      <Textarea
        label="Explanation"
        rows={2}
        value={state.explanation}
        onChange={(event) =>
          setState((current) => ({ ...current, explanation: event.target.value }))
        }
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button loading={saving} onClick={() => save("add-another")}>
          Save and add another
        </Button>
        <Button variant="secondary" loading={saving} onClick={() => save("finish")}>
          Save and finish
        </Button>
      </div>
    </Card>
  );
}
