"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Square, Trash2 } from "lucide-react";
import { Button, Input, Modal, LoadingSpinner, EmptyState, useToast } from "@/components/ui";
import type { Difficulty } from "@/components/ui";
import {
  approveQuestion,
  bulkApprove,
  bulkDelete,
  deleteQuestion,
  fetchQuestions,
  updateQuestion,
  type QuestionFilters,
} from "./actions";
import { QuestionCard, type Question } from "./QuestionCard";

export interface Summary {
  total: number;
  approved: number;
  pending: number;
  byDifficulty: Record<Difficulty, { total: number; approved: number }>;
}

const DIFFICULTY_TABS: { value: Difficulty | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const APPROVAL_TABS: { value: "all" | "approved" | "pending"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
];

export function QuestionsReview({
  quizId,
  initialSummary,
}: {
  quizId: string;
  initialSummary: Summary;
}) {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(initialSummary);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [approval, setApproval] = useState<"all" | "approved" | "pending">("all");
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const filters: QuestionFilters = useMemo(
    () => ({ difficulty, approval, search }),
    [difficulty, approval, search]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setSelected(new Set());

    const timer = setTimeout(() => {
      fetchQuestions(quizId, filters, 0)
        .then((result) => {
          if (cancelled) return;
          setQuestions(result.questions as Question[]);
          setHasMore(result.hasMore);
        })
        .catch(() => {
          if (cancelled) return;
          setLoadError(true);
          showToast("Could not load questions", "danger");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, filters, reloadKey]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const result = await fetchQuestions(quizId, filters, questions.length);
      setQuestions((current) => [...current, ...(result.questions as Question[])]);
      setHasMore(result.hasMore);
    } catch {
      showToast("Could not load more questions", "danger");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((current) => {
      const allVisible = questions.every((question) => current.has(question.id));
      if (allVisible) return new Set();
      return new Set(questions.map((question) => question.id));
    });
  }

  function adjustSummary(target: Question, patch: Partial<{ approved: boolean; removed: boolean }>) {
    setSummary((current) => {
      const next: Summary = {
        ...current,
        byDifficulty: { ...current.byDifficulty },
      };
      const bucket = { ...next.byDifficulty[target.difficulty] };

      if (patch.removed) {
        next.total -= 1;
        bucket.total -= 1;
        if (target.is_approved) {
          next.approved -= 1;
          bucket.approved -= 1;
        } else {
          next.pending -= 1;
        }
      } else if (patch.approved && !target.is_approved) {
        next.approved += 1;
        next.pending -= 1;
        bucket.approved += 1;
      }

      next.byDifficulty[target.difficulty] = bucket;
      return next;
    });
  }

  async function handleApprove(question: Question) {
    try {
      await approveQuestion(quizId, question.id);
    } catch {
      showToast("Could not approve this question", "danger");
      return;
    }
    adjustSummary(question, { approved: true });
    setQuestions((current) =>
      current.map((item) => (item.id === question.id ? { ...item, is_approved: true } : item))
    );
    showToast("Question approved", "success");
  }

  async function handleDelete(question: Question) {
    try {
      await deleteQuestion(quizId, question.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete this question", "danger");
      return;
    }
    adjustSummary(question, { removed: true });
    setQuestions((current) => current.filter((item) => item.id !== question.id));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(question.id);
      return next;
    });
    showToast("Question deleted", "success");
  }

  async function handleSave(question: Question, input: Parameters<typeof updateQuestion>[1]) {
    try {
      await updateQuestion(question.id, input);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save this question", "danger");
      throw error; // let QuestionCard keep the edit form open
    }
    setQuestions((current) =>
      current.map((item) =>
        item.id === question.id
          ? {
              ...item,
              difficulty: input.difficulty,
              question_text: input.questionText,
              explanation: input.explanation,
              options: item.options.map((option) => {
                const match = input.options.find((o) => o.id === option.id);
                return match
                  ? { ...option, option_text: match.text, is_correct: match.isCorrect }
                  : option;
              }),
            }
          : item
      )
    );
    showToast("Question updated", "success");
  }

  async function handleBulkApprove() {
    setBulkBusy(true);
    try {
      const ids = [...selected];
      await bulkApprove(quizId, ids);
      setQuestions((current) =>
        current.map((item) => (ids.includes(item.id) ? { ...item, is_approved: true } : item))
      );
      setSummary((current) => {
        let approvedDelta = 0;
        const byDifficulty = { ...current.byDifficulty };
        for (const question of questions) {
          if (ids.includes(question.id) && !question.is_approved) {
            approvedDelta += 1;
            byDifficulty[question.difficulty] = {
              ...byDifficulty[question.difficulty],
              approved: byDifficulty[question.difficulty].approved + 1,
            };
          }
        }
        return {
          ...current,
          approved: current.approved + approvedDelta,
          pending: current.pending - approvedDelta,
          byDifficulty,
        };
      });
      setSelected(new Set());
      showToast(`${ids.length} question(s) approved`, "success");
    } catch {
      showToast("Could not approve the selected questions", "danger");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkDelete() {
    setBulkBusy(true);
    try {
      const ids = [...selected];
      await bulkDelete(quizId, ids);
      setSummary((current) => {
        let total = current.total;
        let approved = current.approved;
        let pending = current.pending;
        const byDifficulty = { ...current.byDifficulty };
        for (const question of questions) {
          if (!ids.includes(question.id)) continue;
          total -= 1;
          const bucket = { ...byDifficulty[question.difficulty] };
          bucket.total -= 1;
          if (question.is_approved) {
            approved -= 1;
            bucket.approved -= 1;
          } else {
            pending -= 1;
          }
          byDifficulty[question.difficulty] = bucket;
        }
        return { ...current, total, approved, pending, byDifficulty };
      });
      setQuestions((current) => current.filter((item) => !ids.includes(item.id)));
      setSelected(new Set());
      setBulkDeleteConfirm(false);
      showToast(`${ids.length} question(s) deleted`, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not delete the selected questions",
        "danger"
      );
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryTile label="Total" value={summary.total} />
        <SummaryTile label="Approved" value={summary.approved} tone="success" />
        <SummaryTile label="Pending" value={summary.pending} tone="warning" />
        <SummaryTile
          label="Easy"
          value={`${summary.byDifficulty.easy.approved}/${summary.byDifficulty.easy.total}`}
        />
        <SummaryTile
          label="Medium / Hard"
          value={`${summary.byDifficulty.medium.approved}/${summary.byDifficulty.medium.total} · ${summary.byDifficulty.hard.approved}/${summary.byDifficulty.hard.total}`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <TabGroup value={difficulty} onChange={setDifficulty} options={DIFFICULTY_TABS} />
        <TabGroup value={approval} onChange={setApproval} options={APPROVAL_TABS} />
        <div className="min-w-[220px] flex-1">
          <Input
            placeholder="Search question text..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex items-center justify-between rounded-lg border border-primary/30 bg-primary-faint px-4 py-3 shadow-md">
          <p className="text-sm font-medium text-fg">{selected.size} selected</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={selectAllVisible}>
              {questions.every((question) => selected.has(question.id)) ? (
                <>
                  <Square className="size-4" /> Deselect all
                </>
              ) : (
                <>
                  <CheckSquare className="size-4" /> Select all visible
                </>
              )}
            </Button>
            <Button size="sm" onClick={handleBulkApprove} loading={bulkBusy}>
              Bulk approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setBulkDeleteConfirm(true)}
              disabled={bulkBusy}
            >
              <Trash2 className="size-4" /> Bulk delete
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner label="Loading questions" />
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<Square className="size-10" />}
          title="Could not load questions"
          description="Something went wrong while loading this list."
          action={
            <Button size="sm" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </Button>
          }
        />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<Square className="size-10" />}
          title="No questions match"
          description="Try a different filter or search term."
        />
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              selected={selected.has(question.id)}
              onToggleSelect={() => toggleSelect(question.id)}
              onApprove={() => handleApprove(question)}
              onDelete={() => handleDelete(question)}
              onSave={(input) => handleSave(question, input)}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        title={`Delete ${selected.size} question(s)?`}
      >
        <p className="text-sm text-fg-secondary">This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setBulkDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleBulkDelete} loading={bulkBusy}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-fg-muted">{label}</p>
      <p
        className={
          tone === "success"
            ? "mt-1 text-xl font-semibold text-success"
            : tone === "warning"
              ? "mt-1 text-xl font-semibold text-warning"
              : "mt-1 text-xl font-semibold text-fg"
        }
      >
        {value}
      </p>
    </div>
  );
}

function TabGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={
            value === option.value
              ? "rounded-md bg-primary-subtle px-3 py-1.5 text-sm font-medium text-primary"
              : "rounded-md px-3 py-1.5 text-sm font-medium text-fg-secondary hover:text-fg"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
