"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Search, BookOpen, Copy, Check } from "lucide-react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Input,
  Button,
  buttonVariants,
  Modal,
  EmptyState,
  useToast,
} from "@/components/ui";
import { deleteCourse, getCourseDeleteImpact } from "./actions";
import { formatDate } from "@/lib/format";

export interface CourseRow {
  id: string;
  name: string;
  inviteCode: string;
  inviteExpiresAt: string | null;
  maxStudents: number;
  studentCount: number;
  quizCount: number;
  createdAt: string | null;
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs text-fg hover:bg-surface-raised"
    >
      {code}
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 text-fg-muted" />
      )}
    </button>
  );
}

export function CoursesTable({ rows }: { rows: CourseRow[] }) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CourseRow | null>(null);
  const [impact, setImpact] = useState<{
    quizCount: number;
    questionCount: number;
    attemptCount: number;
    certificateCount: number;
  } | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(query));
  }, [rows, search]);

  async function openDeleteModal(row: CourseRow) {
    setDeleteTarget(row);
    setLoadingImpact(true);
    const result = await getCourseDeleteImpact(row.id);
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
        await deleteCourse(deleteTarget.id);
        showToast(`"${deleteTarget.name}" deleted`, "success");
        closeDeleteModal();
      } catch {
        showToast("Could not delete this course", "danger");
      }
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="size-10" />}
        title="No courses yet"
        description="Create your first course to get an invite code students can join with."
        action={
          <Link href="/dashboard/courses/new" className={buttonVariants({ size: "sm" })}>
            Add course
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Input
          placeholder="Search courses..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Invite Code</TableHeaderCell>
            <TableHeaderCell>Students</TableHeaderCell>
            <TableHeaderCell>Quizzes</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link
                  href={`/dashboard/courses/${row.id}`}
                  className="font-medium text-secondary hover:underline"
                >
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>
                <CopyCodeButton code={row.inviteCode} />
              </TableCell>
              <TableCell>
                {row.studentCount} / {row.maxStudents}
              </TableCell>
              <TableCell>{row.quizCount}</TableCell>
              <TableCell>{row.createdAt ? formatDate(row.createdAt) : "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/courses/${row.id}/edit`}
                    aria-label={`Edit ${row.name}`}
                    className="flex size-11 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${row.name}`}
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
          <Search className="size-4" /> No courses match &quot;{search}&quot;.
        </p>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={closeDeleteModal}
        title={`Delete "${deleteTarget?.name}"?`}
      >
        {loadingImpact ? (
          <p className="text-sm text-fg-secondary">Checking what will be deleted...</p>
        ) : (
          <p className="text-sm text-fg-secondary">
            This will permanently delete this course, all {impact?.quizCount ?? 0}{" "}
            quiz(zes) in it, and all {impact?.questionCount ?? 0} question(s) in
            those quizzes{(impact?.attemptCount ?? 0) > 0 &&
              `, ${impact?.attemptCount} student attempt(s)`}
            {(impact?.certificateCount ?? 0) > 0 &&
              `, and ${impact?.certificateCount} issued certificate(s)`}
            . This cannot be undone.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={isPending}>
            Delete course
          </Button>
        </div>
      </Modal>
    </div>
  );
}
