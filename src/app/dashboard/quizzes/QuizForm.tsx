"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, UpgradePrompt, useToast } from "@/components/ui";
import { parsePlanLimitError } from "@/lib/plan-limits";
import { createQuiz, updateQuiz, type QuizInput } from "./actions";

type DifficultyMode = "adaptive" | "easy_only" | "medium_only" | "hard_only";

const MODE_OPTIONS: { value: DifficultyMode; label: string }[] = [
  { value: "adaptive", label: "Adaptive (recommended)" },
  { value: "easy_only", label: "Easy only" },
  { value: "medium_only", label: "Medium only" },
  { value: "hard_only", label: "Hard only" },
];

interface Course {
  id: string;
  name: string;
}

interface ExistingQuiz {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  course_id: string;
  time_limit_minutes: number | null;
  passing_score: number;
  questions_to_show: number;
  difficulty_mode: string;
  max_attempts: number;
  status: string;
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
  const [topic, setTopic] = useState(quiz?.topic ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [courseId, setCourseId] = useState(quiz?.course_id ?? initialCourseId ?? "");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(quiz?.time_limit_minutes ?? 30);
  const [timeLimitMinutesText, setTimeLimitMinutesText] = useState(
    String(quiz?.time_limit_minutes ?? 30)
  );
  const [passingScore, setPassingScore] = useState(quiz?.passing_score ?? 70);
  const [passingScoreText, setPassingScoreText] = useState(String(quiz?.passing_score ?? 70));
  const [questionsToShow, setQuestionsToShow] = useState(quiz?.questions_to_show ?? 10);
  const [questionsToShowText, setQuestionsToShowText] = useState(
    String(quiz?.questions_to_show ?? 10)
  );
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>(
    (quiz?.difficulty_mode as DifficultyMode) ?? "adaptive"
  );
  const [maxAttempts, setMaxAttempts] = useState(quiz?.max_attempts ?? 1);
  const [maxAttemptsText, setMaxAttemptsText] = useState(String(quiz?.max_attempts ?? 1));
  const [publishNow, setPublishNow] = useState(quiz?.status === "published" || quiz?.status === "in_review");
  const [error, setError] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!topic.trim()) {
      setError("Topic is required.");
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
    setLimitMessage(null);
    setLoading(true);

    const input: QuizInput = {
      title,
      topic,
      description,
      courseId,
      timeLimitMinutes,
      passingScore,
      questionsToShow,
      difficultyMode,
      maxAttempts,
      publishNow,
    };

    try {
      if (quiz) {
        await updateQuiz(quiz.id, input);
        showToast("Quiz settings saved", "success");
        router.push("/dashboard/quizzes");
        router.refresh();
      } else {
        const created = await createQuiz(input);
        showToast("Quiz created", "success");
        router.push(`/dashboard/quizzes/${created.id}/questions/new`);
        router.refresh();
      }
    } catch (submitError) {
      const limitError = parsePlanLimitError(submitError);
      if (limitError) {
        setLimitMessage(limitError);
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Something went wrong. Please try again."
        );
      }
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
        <Input
          label="Topic"
          required
          placeholder="e.g. JavaScript array methods"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
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
                {course.name}
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
            value={timeLimitMinutesText}
            onChange={(event) => {
              const raw = event.target.value;
              setTimeLimitMinutesText(raw);
              const parsed = Number(raw);
              if (raw.trim() !== "" && !Number.isNaN(parsed)) setTimeLimitMinutes(parsed);
            }}
            onBlur={() => {
              const clamped = Math.max(1, Math.min(300, timeLimitMinutes || 1));
              setTimeLimitMinutes(clamped);
              setTimeLimitMinutesText(String(clamped));
            }}
          />
          <Input
            label="Passing percentage"
            type="number"
            min={1}
            max={100}
            value={passingScoreText}
            onChange={(event) => {
              const raw = event.target.value;
              setPassingScoreText(raw);
              const parsed = Number(raw);
              if (raw.trim() !== "" && !Number.isNaN(parsed)) setPassingScore(parsed);
            }}
            onBlur={() => {
              const clamped = Math.max(1, Math.min(100, passingScore || 1));
              setPassingScore(clamped);
              setPassingScoreText(String(clamped));
            }}
          />
          <Input
            label="Questions to show"
            type="number"
            min={1}
            value={questionsToShowText}
            onChange={(event) => {
              const raw = event.target.value;
              setQuestionsToShowText(raw);
              const parsed = Number(raw);
              if (raw.trim() !== "" && !Number.isNaN(parsed)) setQuestionsToShow(parsed);
            }}
            onBlur={() => {
              const clamped = Math.max(1, questionsToShow || 1);
              setQuestionsToShow(clamped);
              setQuestionsToShowText(String(clamped));
            }}
          />
          <div className="space-y-2">
            <Input
              label="Maximum attempts"
              type="number"
              min={0}
              value={maxAttemptsText}
              onChange={(event) => {
                const raw = event.target.value;
                setMaxAttemptsText(raw);
                const parsed = Number(raw);
                if (raw.trim() !== "" && !Number.isNaN(parsed)) setMaxAttempts(parsed);
              }}
              onBlur={() => {
                const clamped = Math.max(0, maxAttempts || 0);
                setMaxAttempts(clamped);
                setMaxAttemptsText(String(clamped));
              }}
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
            checked={publishNow}
            onChange={(event) => setPublishNow(event.target.checked)}
            className="size-4"
          />
          Publish (visible to approved students in this course)
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        {limitMessage && (
          <UpgradePrompt
            message={limitMessage}
            benefits="Upgrade to Pro for 5 attempts per quiz (Institution: unlimited), unlimited courses, and full anti-cheating."
          />
        )}

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
