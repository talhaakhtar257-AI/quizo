"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, useToast } from "@/components/ui";
import type { Enums } from "@/types/database";
import { createQuiz, updateQuiz, type QuizInput } from "./actions";

type DifficultyMode = Enums<"quiz_difficulty_mode">;

const MODE_OPTIONS: { value: DifficultyMode; label: string }[] = [
  { value: "adaptive", label: "Adaptive (recommended)" },
  { value: "easy_only", label: "Easy only" },
  { value: "medium_only", label: "Medium only" },
  { value: "hard_only", label: "Hard only" },
];

interface Course {
  id: string;
  title: string;
}

interface ExistingQuiz {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  timer_minutes: number;
  passing_percent: number;
  questions_to_show: number;
  difficulty_mode: DifficultyMode;
  max_attempts: number;
  is_published: boolean;
}

export function QuizForm({
  courses,
  quiz,
  initialCourseId,
}: {
  courses: Course[];
  quiz?: ExistingQuiz;
  initialCourseId?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [courseId, setCourseId] = useState(quiz?.course_id ?? initialCourseId ?? "");
  const [timerMinutes, setTimerMinutes] = useState(quiz?.timer_minutes ?? 30);
  const [passingPercent, setPassingPercent] = useState(quiz?.passing_percent ?? 70);
  const [questionsToShow, setQuestionsToShow] = useState(quiz?.questions_to_show ?? 10);
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>(
    quiz?.difficulty_mode ?? "adaptive"
  );
  const [maxAttempts, setMaxAttempts] = useState(quiz?.max_attempts ?? 1);
  const [isPublished, setIsPublished] = useState(quiz?.is_published ?? false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!courseId) {
      setError("Choose a course.");
      return;
    }
    if (questionsToShow < 1) {
      setError("Questions to show must be at least 1.");
      return;
    }

    setError(null);
    setLoading(true);

    const input: QuizInput = {
      title,
      description,
      courseId,
      timerMinutes,
      passingPercent,
      questionsToShow,
      difficultyMode,
      maxAttempts,
      isPublished,
    };

    try {
      if (quiz) {
        await updateQuiz(quiz.id, input);
        showToast("Quiz settings saved", "success");
        router.push("/admin/quizzes");
        router.refresh();
      } else {
        const created = await createQuiz(input);
        showToast("Quiz created", "success");
        router.push(`/admin/quizzes/${created.id}/questions/new`);
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl space-y-4 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-fg" htmlFor="quiz-course">
            Course
          </label>
          <select
            id="quiz-course"
            required
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Select a course...</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Timer (minutes)"
            type="number"
            min={1}
            max={300}
            value={timerMinutes}
            onChange={(event) =>
              setTimerMinutes(Math.max(1, Math.min(300, Number(event.target.value) || 1)))
            }
          />
          <Input
            label="Passing percentage"
            type="number"
            min={1}
            max={100}
            value={passingPercent}
            onChange={(event) =>
              setPassingPercent(Math.max(1, Math.min(100, Number(event.target.value) || 1)))
            }
          />
          <Input
            label="Questions to show"
            type="number"
            min={1}
            value={questionsToShow}
            onChange={(event) =>
              setQuestionsToShow(Math.max(1, Number(event.target.value) || 1))
            }
          />
          <div className="space-y-2">
            <Input
              label="Maximum attempts"
              type="number"
              min={0}
              value={maxAttempts}
              onChange={(event) => setMaxAttempts(Math.max(0, Number(event.target.value) || 0))}
            />
            <p className="text-xs text-fg-muted">0 = unlimited attempts</p>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-fg">Difficulty mode</legend>
          <div className="space-y-2">
            {MODE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="radio"
                  name="difficulty-mode"
                  value={option.value}
                  checked={difficultyMode === option.value}
                  onChange={() => setDifficultyMode(option.value)}
                  className="size-4"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm font-medium text-fg">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(event) => setIsPublished(event.target.checked)}
            className="size-4"
          />
          Published (visible for assignment)
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>
            {quiz ? "Save changes" : "Create quiz"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
