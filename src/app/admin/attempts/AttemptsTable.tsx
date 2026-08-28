"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ClipboardList, Eye } from "lucide-react";
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { ResultBadge } from "@/components/admin/ResultBadge";
import { formatDateTime, formatDuration } from "@/lib/format";
import { resultKind, type ResultKind } from "@/lib/attempt-status";
import type { Enums } from "@/types/database";

type AttemptStatus = Enums<"attempt_status">;

export interface AttemptRow {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizId: string;
  quizTitle: string;
  timerMinutes: number;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  status: AttemptStatus;
  score: number | null;
  totalQuestions: number | null;
  percentage: number | null;
  passed: boolean | null;
}

interface FilterOption {
  id: string;
  title?: string;
  name?: string;
}

type SortKey =
  | "student"
  | "quiz"
  | "attemptNumber"
  | "startedAt"
  | "submittedAt"
  | "timeTaken"
  | "score"
  | "percentage"
  | "result";

function rowResultKind(row: AttemptRow, now: Date): ResultKind {
  return resultKind(row.status, row.passed, row.startedAt, row.timerMinutes, now);
}

function timeTakenSeconds(row: AttemptRow): number | null {
  if (!row.submittedAt) return null;
  return Math.max(
    0,
    Math.round((new Date(row.submittedAt).getTime() - new Date(row.startedAt).getTime()) / 1000)
  );
}

function sortValue(row: AttemptRow, key: SortKey, now: Date): number | string {
  switch (key) {
    case "student":
      return row.studentName.toLowerCase();
    case "quiz":
      return row.quizTitle.toLowerCase();
    case "attemptNumber":
      return row.attemptNumber;
    case "startedAt":
      return new Date(row.startedAt).getTime();
    case "submittedAt":
      return row.submittedAt ? new Date(row.submittedAt).getTime() : -1;
    case "timeTaken":
      return timeTakenSeconds(row) ?? -1;
    case "score":
      return row.percentage !== null ? (row.score ?? -1) : -1;
    case "percentage":
      return row.percentage ?? -1;
    case "result":
      return rowResultKind(row, now);
  }
}

export function AttemptsTable({
  rows,
  quizzes,
  students,
  initialNow,
  hideStudentColumn = false,
  emptyDescription = "Attempts will appear here once students start taking quizzes.",
}: {
  rows: AttemptRow[];
  quizzes: FilterOption[];
  students?: FilterOption[];
  initialNow: string;
  hideStudentColumn?: boolean;
  emptyDescription?: string;
}) {
  const [now, setNow] = useState(() => new Date(initialNow));
  const [quizFilter, setQuizFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState<"all" | ResultKind>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("startedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Keep "started X ago" and the abandoned flag fresh for anyone leaving this
  // tab open. Starts from the server-computed initialNow so the first render
  // matches SSR exactly, then ticks client-side after mount.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (quizFilter !== "all" && row.quizId !== quizFilter) return false;
      if (studentFilter !== "all" && row.studentId !== studentFilter) return false;
      if (resultFilter !== "all" && rowResultKind(row, now) !== resultFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        if (new Date(row.startedAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59");
        if (new Date(row.startedAt) > to) return false;
      }
      return true;
    });
  }, [rows, quizFilter, studentFilter, resultFilter, dateFrom, dateTo, now]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = sortValue(a, sortKey, now);
      const vb = sortValue(b, sortKey, now);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, now]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-10" />}
        title="No attempts yet"
        description={emptyDescription}
      />
    );
  }

  function SortHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    const active = sortKey === sortKeyName;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <TableHeaderCell>
        <button
          type="button"
          onClick={() => toggleSort(sortKeyName)}
          className="flex items-center gap-1 font-medium hover:text-fg"
        >
          {label}
          <Icon className={"size-3.5 " + (active ? "text-fg" : "text-fg-muted")} />
        </button>
      </TableHeaderCell>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-secondary">Quiz</label>
          <select
            value={quizFilter}
            onChange={(event) => setQuizFilter(event.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">All quizzes</option>
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
        </div>

        {!hideStudentColumn && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-fg-secondary">Student</label>
            <select
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
              className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="all">All students</option>
              {(students ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-secondary">Result</label>
          <select
            value={resultFilter}
            onChange={(event) => setResultFilter(event.target.value as "all" | ResultKind)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">All results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="in_progress">In progress</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-secondary">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-secondary">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            {!hideStudentColumn && <SortHeader label="Student" sortKeyName="student" />}
            <SortHeader label="Quiz" sortKeyName="quiz" />
            <SortHeader label="Attempt #" sortKeyName="attemptNumber" />
            <SortHeader label="Started" sortKeyName="startedAt" />
            <SortHeader label="Submitted" sortKeyName="submittedAt" />
            <SortHeader label="Time taken" sortKeyName="timeTaken" />
            <SortHeader label="Score" sortKeyName="score" />
            <SortHeader label="%" sortKeyName="percentage" />
            <SortHeader label="Result" sortKeyName="result" />
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => {
            const kind = rowResultKind(row, now);
            const seconds = timeTakenSeconds(row);
            return (
              <TableRow key={row.id}>
                {!hideStudentColumn && (
                  <TableCell>
                    <Link
                      href={`/admin/users/${row.studentId}/attempts`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.studentName}
                    </Link>
                    <div className="text-xs text-fg-muted">{row.studentEmail}</div>
                  </TableCell>
                )}
                <TableCell>{row.quizTitle}</TableCell>
                <TableCell>{row.attemptNumber}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTime(row.startedAt)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.submittedAt ? formatDateTime(row.submittedAt) : "—"}
                </TableCell>
                <TableCell>{seconds !== null ? formatDuration(seconds) : "—"}</TableCell>
                <TableCell>
                  {row.score !== null && row.totalQuestions !== null
                    ? `${row.score}/${row.totalQuestions}`
                    : "—"}
                </TableCell>
                <TableCell>{row.percentage !== null ? `${row.percentage}%` : "—"}</TableCell>
                <TableCell>
                  <ResultBadge kind={kind} startedAt={row.startedAt} now={now} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/attempts/${row.id}`}
                    aria-label={`View attempt by ${row.studentName}`}
                    className="flex size-11 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg"
                  >
                    <Eye className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {sorted.length === 0 && (
        <p className="text-sm text-fg-secondary">No attempts match your filters.</p>
      )}
    </div>
  );
}
