"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Button, Card, Input, buttonVariants, useToast } from "@/components/ui";
import { createQuizForGeneration } from "./actions";

type Difficulty = "easy" | "medium" | "hard";
const LEVELS: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

interface Course {
  id: string;
  name: string;
}

interface ContentUpload {
  id: string;
  course_id: string;
  raw_text: string | null;
}

interface LevelResult {
  status: "pending" | "running" | "done" | "failed";
  count?: number;
  error?: string;
}

export function GenerateForm({
  courses,
  contentUploads,
  initialCourseId,
  initialContentId,
}: {
  courses: Course[];
  contentUploads: ContentUpload[];
  initialCourseId?: string;
  initialContentId?: string;
}) {
  const { showToast } = useToast();
  const [courseId, setCourseId] = useState(initialCourseId ?? "");
  const [contentId, setContentId] = useState(initialContentId ?? "");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [questionsToShow, setQuestionsToShow] = useState(10);
  const [questionsToShowText, setQuestionsToShowText] = useState("10");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<Difficulty, LevelResult> | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [poolId, setPoolId] = useState<string | null>(null);
  const [poolMultiplier, setPoolMultiplier] = useState(1);

  const contentForCourse = useMemo(
    () => contentUploads.filter((upload) => upload.course_id === courseId),
    [contentUploads, courseId]
  );

  // What the student sees vs. what actually gets generated per level differ
  // by plan — Free generates exactly questionsToShow per level, Pro/
  // Institution generate 3× so retakes draw fresh questions
  // (docs/FEATURES.md §4). The multiplier itself comes from the org's plan,
  // not something picked here — createQuizForGeneration resolves it.
  const perLevelToGenerate = questionsToShow * poolMultiplier;
  const totalToGenerate = perLevelToGenerate * 3;

  async function handleGenerate() {
    if (!courseId || !contentId || !title.trim() || !topic.trim()) {
      showToast("Fill in course, content, title, and topic first", "warning");
      return;
    }

    setRunning(true);
    setQuizId(null);
    setResults({
      easy: { status: "pending" },
      medium: { status: "pending" },
      hard: { status: "pending" },
    });

    let createdQuizId: string;
    let createdPoolId: string;
    let multiplier: number;
    try {
      const quiz = await createQuizForGeneration({
        courseId,
        title,
        topic,
        questionsToShow,
      });
      createdQuizId = quiz.quizId;
      createdPoolId = quiz.poolId;
      multiplier = quiz.poolMultiplier;
      setQuizId(createdQuizId);
      setPoolId(createdPoolId);
      setPoolMultiplier(multiplier);
    } catch {
      showToast("Could not create the quiz. Please try again.", "danger");
      setRunning(false);
      setResults(null);
      return;
    }

    await runFrom(0, createdPoolId, questionsToShow * multiplier, 0);
  }

  // Generates one level, topping up to `need` on top of whatever this level
  // already has. Returns true only once that level reaches `need`.
  async function runLevel(level: Difficulty, poolIdToUse: string, need: number, alreadyHave: number) {
    const stillNeed = Math.max(1, need - alreadyHave);
    setResults((current) => ({ ...current!, [level]: { status: "running" } }));

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          poolId: poolIdToUse,
          questionCount: stillNeed,
          difficulty: level,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setResults((current) => ({
          ...current!,
          [level]: { status: "failed", error: body.error ?? "Something went wrong." },
        }));
        return false;
      }

      const total = alreadyHave + (body.count ?? 0);
      setResults((current) => ({ ...current!, [level]: { status: "done", count: total } }));
      return total >= need;
    } catch {
      setResults((current) => ({
        ...current!,
        [level]: {
          status: "failed",
          error: "Could not reach the AI service. Check your connection and try again.",
        },
      }));
      return false;
    }
  }

  // Runs levels in order starting at startIndex, stopping (and waiting for a
  // manual retry) the moment a level doesn't reach `need`.
  async function runFrom(startIndex: number, poolIdToUse: string, need: number, startAlreadyHave: number) {
    setRunning(true);
    for (let i = startIndex; i < LEVELS.length; i++) {
      const alreadyHave = i === startIndex ? startAlreadyHave : 0;
      const ok = await runLevel(LEVELS[i].key, poolIdToUse, need, alreadyHave);
      if (!ok) break;
    }
    setRunning(false);
  }

  function handleRetryLevel(index: number) {
    if (!poolId || !results) return;
    const existing = results[LEVELS[index].key];
    const alreadyHave = existing.status === "done" ? existing.count ?? 0 : 0;
    void runFrom(index, poolId, perLevelToGenerate, alreadyHave);
  }

  const runningIndex = results
    ? LEVELS.findIndex((level) => results[level.key].status === "running")
    : -1;

  return (
    <Card className="max-w-2xl space-y-6 p-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-fg" htmlFor="course">
          Course
        </label>
        <select
          id="course"
          value={courseId}
          disabled={running}
          onChange={(event) => {
            setCourseId(event.target.value);
            setContentId("");
          }}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        >
          <option value="">Select a course...</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-fg" htmlFor="content">
          Saved content
        </label>
        <select
          id="content"
          value={contentId}
          disabled={running || !courseId}
          onChange={(event) => setContentId(event.target.value)}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        >
          <option value="">{courseId ? "Select saved content..." : "Pick a course first"}</option>
          {contentForCourse.map((upload) => (
            <option key={upload.id} value={upload.id}>
              {(upload.raw_text ?? "").slice(0, 60) || "(no text)"}
              {(upload.raw_text?.length ?? 0) > 60 ? "..." : ""}
            </option>
          ))}
        </select>
        {courseId && contentForCourse.length === 0 && (
          <p className="text-sm text-warning">
            No content saved for this course yet. Upload some first.
          </p>
        )}
      </div>

      <Input
        label="Quiz title"
        required
        disabled={running}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="e.g. Photosynthesis Basics"
      />

      <Input
        label="Topic"
        required
        disabled={running}
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="e.g. Photosynthesis: light reactions and the Calvin cycle"
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-fg" htmlFor="questions-to-show">
          Questions to show per attempt
        </label>
        <input
          id="questions-to-show"
          type="number"
          min={5}
          max={50}
          disabled={running}
          value={questionsToShowText}
          onChange={(event) => {
            const raw = event.target.value;
            setQuestionsToShowText(raw);
            const parsed = Number(raw);
            if (raw.trim() !== "" && !Number.isNaN(parsed)) {
              setQuestionsToShow(parsed);
            }
          }}
          onBlur={() => {
            const clamped = Math.max(5, Math.min(50, questionsToShow || 5));
            setQuestionsToShow(clamped);
            setQuestionsToShowText(String(clamped));
          }}
          className="h-11 w-32 rounded-md border border-border bg-surface px-3 text-base text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        />
        <p className="text-sm text-fg-secondary">
          Students will see {questionsToShow} questions per attempt. On your plan, we'll generate{" "}
          {perLevelToGenerate} per difficulty level ({totalToGenerate} total) so the adaptive
          engine always has enough to draw from
          {poolMultiplier > 1 ? " — and retakes get fresh questions" : ""}.
        </p>
        {perLevelToGenerate > 25 && (
          <p className="text-sm text-warning">
            Large batches can take a few minutes per level. On the free hosting
            tier this may time out — if a level fails, try again with a smaller
            number.
          </p>
        )}
      </div>

      <Button onClick={handleGenerate} loading={running} disabled={running}>
        <Sparkles className="size-4" />
        {running && runningIndex >= 0
          ? `Generating ${LEVELS[runningIndex].label} (${runningIndex + 1} of 3)`
          : "Generate questions"}
      </Button>

      {results && (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
          {LEVELS.map((level, index) => {
            const result = results[level.key];
            const isShort = result.status === "done" && result.count !== perLevelToGenerate;
            return (
              <div key={level.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg">{level.label}</span>
                {result.status === "pending" && <span className="text-fg-muted">Waiting...</span>}
                {result.status === "running" && <span className="text-primary">Generating...</span>}
                {result.status === "done" && !isShort && (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="size-4" /> {result.count} created
                  </span>
                )}
                {isShort && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="size-4" /> {result.count} of {perLevelToGenerate} created
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={running}
                      onClick={() => handleRetryLevel(index)}
                    >
                      Generate again
                    </Button>
                  </div>
                )}
                {result.status === "failed" && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-danger">
                      <AlertTriangle className="size-4" /> {result.error}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={running}
                      onClick={() => handleRetryLevel(index)}
                    >
                      Generate again
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {!running && quizId && (
            <div className="pt-2">
              <Link
                href={`/dashboard/quizzes/${quizId}/questions`}
                className={buttonVariants({ size: "sm" })}
              >
                Review questions
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
