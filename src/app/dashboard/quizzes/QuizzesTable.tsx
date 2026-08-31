"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ListChecks, Pencil, Search, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  buttonVariants,
  useToast,
} from "@/components/ui";
import { archiveQuiz, deleteQuiz, getQuizDeleteImpact } from "./actions";

type DifficultyMode = "adaptive" | "easy_only" | "medium_only" | "hard_only";
type QuizStatus = "draft" | "in_review" | "published" | "rejected" | "archived";

const MODE_LABELS: Record<DifficultyMode, string> = {
  adaptive: "Adaptive",
  easy_only: "Easy only",
  medium_only: "Medium only",
  hard_only: "Hard only",
};

const STATUS_BADGE: Record<QuizStatus, { label: string; variant: "success" | "info" | "danger" | "neutral" }> = {
  draft: { label: "Draft", variant: "neutral" },
  in_review: { label: "In Review", variant: "info" },
  published: { label: "Published", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  archived: { label: "Archived", variant: "neutral" },
};

export interface QuizRow {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  timeLimitMinutes: number | null;
  passingScore: number;
  difficultyMode: DifficultyMode;
  status: QuizStatus;
  approvedQuestions: number;
  totalQuestions: number;
}

interface Course {
  id: string;
  name: string;
}

export function QuizzesTable({ rows, courses }: { rows: QuizRow[]; courses: Course[] }) {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | QuizStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<QuizRow | null>(null);
  const [impact, setImpact] = useState<{ questionCount: number; attemptCount: number } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (query && !row.title.toLowerCase().includes(query)) return false;
      if (courseFilter !== "all" && row.courseId !== courseFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return true;
    });
  }, [rows, search, courseFilter, statusFilter]);

  async function openDeleteModal(row: QuizRow) {
    setDeleteTarget(row);
    setLoadingImpact(true);
    const result = await getQuizDeleteImpact(row.id);
    setImpact(result);
    setLoadingImpact(false);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
    setImpact(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteQuiz(deleteTarget.id);
        showToast(`"${deleteTarget.title}" deleted`, "success");
        closeDeleteModal();
      } catch {
        showToast("Could not delete this quiz", "danger");
      }
    });
  }

  function handleArchive(row: QuizRow) {
    startTransition(async () => {
      try {
        await archiveQuiz(row.id);
        showToast(`"${row.title}" archived`, "success");
      } catch {
        showToast("Could not archive this quiz", "danger");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="size-10" />}
        title="No quizzes yet"
        description="Create your first quiz, or generate one from your saved content with AI."
        action={
          <Link href="/dashboard/quizzes/new" className={buttonVariants({ size: "sm" })}>
            Create quiz
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="max-w-sm flex-1 min-w-[200px]">
          <Input
            placeholder="Search quizzes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="all">All courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | QuizStatus)}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Title</TableHeaderCell>
            <TableHeaderCell>Course</TableHeaderCell>
            <TableHeaderCell>Questions</TableHeaderCell>
            <TableHeaderCell>Timer</TableHeaderCell>
            <TableHeaderCell>Passing %</TableHeaderCell>
            <TableHeaderCell>Mode</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link
                  href={`/dashboard/quizzes/${row.id}/settings`}
                  className="font-medium text-primary hover:underline"
                >
                  {row.title}
                </Link>
              </TableCell>
              <TableCell>{row.courseName}</TableCell>
              <TableCell>
                {row.approvedQuestions}/{row.totalQuestions}
              </TableCell>
              <TableCell>{row.timeLimitMinutes ?? "—"} min</TableCell>
              <TableCell>{row.passingScore}%</TableCell>
              <TableCell>{MODE_LABELS[row.difficultyMode]}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE[row.status].variant}>
                  {STATUS_BADGE[row.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/quizzes/${row.id}/questions`}
                    aria-label={`Manage questions for ${row.title}`}
                    className="flex size-11 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg"
                  >
                    <ListChecks className="size-4" />
                  </Link>
                  <Link
                    href={`/dashboard/quizzes/${row.id}/settings`}
                    aria-label={`Edit settings for ${row.title}`}
                    className="flex size-11 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  {row.status !== "archived" && (
                    <button
                      type="button"
                      aria-label={`Archive ${row.title}`}
                      onClick={() => handleArchive(row)}
                      disabled={isPending}
                      className="flex size-11 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg"
                    >
                      <Archive className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete ${row.title}`}
                    onClick={() => openDeleteModal(row)}
                    className="flex size-11 items-center justify-center rounded-md text-fg-secondary hover:bg-danger-bg hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filtered.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-fg-secondary">
          <Search className="size-4" /> No quizzes match your filters.
        </p>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={closeDeleteModal}
        title={`Delete "${deleteTarget?.title}"?`}
      >
        {loadingImpact ? (
          <p className="text-sm text-fg-secondary">Checking what will be deleted...</p>
        ) : (
          <p className="text-sm text-fg-secondary">
            This will permanently delete this quiz, all {impact?.questionCount ?? 0} question(s)
            in it{(impact?.attemptCount ?? 0) > 0 && `, and ${impact?.attemptCount} attempt(s)`}.
            This cannot be undone.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={isPending}>
            Delete quiz
          </Button>
        </div>
      </Modal>
    </div>
  );
}
