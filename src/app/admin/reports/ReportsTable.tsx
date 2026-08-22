"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  FileType,
  FileWarning,
} from "lucide-react";
import {
  Button,
  EmptyState,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { ResultBadge } from "@/components/admin/ResultBadge";
import { formatDate, formatDuration } from "@/lib/format";
import { resultKind, type ResultKind } from "@/lib/attempt-status";
import type { Difficulty } from "@/lib/quiz-engine";
import { useToast } from "@/components/ui";
import { exportToCsv, exportToExcel, exportToPdf, type FiltersSummary } from "./export";
import type { Enums } from "@/types/database";

type AttemptStatus = Enums<"attempt_status">;
const PAGE_SIZE = 50;
const LARGE_EXPORT_THRESHOLD = 5000;

export interface ReportRow {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  timerMinutes: number;
  passingPercent: number;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  status: AttemptStatus;
  score: number | null;
  totalQuestions: number | null;
  percentage: number | null;
  passed: boolean | null;
}

export interface AnswerRow {
  attemptId: string;
  isCorrect: boolean;
  questionId: string;
  questionText: string;
  difficulty: Difficulty;
  quizId: string;
}

interface FilterOption {
  id: string;
  title?: string;
  name?: string;
  courseId?: string;
}

type SortKey = "student" | "quiz" | "attemptNumber" | "date" | "timeTaken" | "score" | "percentage" | "result";
type ExportKind = "excel" | "csv" | "pdf";

function reportDate(row: ReportRow): string {
  return row.submittedAt ?? row.startedAt;
}

function rowResultKind(row: ReportRow, now: Date): ResultKind {
  return resultKind(row.status, row.passed, row.startedAt, row.timerMinutes, now);
}

function timeTakenSeconds(row: ReportRow): number | null {
  if (!row.submittedAt) return null;
  return Math.max(0, Math.round((new Date(row.submittedAt).getTime() - new Date(row.startedAt).getTime()) / 1000));
}

function sortValue(row: ReportRow, key: SortKey, now: Date): number | string {
  switch (key) {
    case "student":
      return row.studentName.toLowerCase();
    case "quiz":
      return row.quizTitle.toLowerCase();
    case "attemptNumber":
      return row.attemptNumber;
    case "date":
      return new Date(reportDate(row)).getTime();
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

export function ReportsTable({
  rows,
  answers,
  courses,
  quizzes,
  students,
  initialNow,
}: {
  rows: ReportRow[];
  answers: AnswerRow[];
  courses: FilterOption[];
  quizzes: FilterOption[];
  students: FilterOption[];
  initialNow: string;
}) {
  const { showToast } = useToast();
  const [now] = useState(() => new Date(initialNow));
  const [courseFilter, setCourseFilter] = useState("all");
  const [quizFilter, setQuizFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState<"all" | ResultKind>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pendingExport, setPendingExport] = useState<ExportKind | null>(null);
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  useEffect(() => {
    setPage(1);
  }, [courseFilter, quizFilter, studentFilter, resultFilter, dateFrom, dateTo]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const quizOptions = courseFilter === "all" ? quizzes : quizzes.filter((q) => q.courseId === courseFilter);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (courseFilter !== "all" && row.courseId !== courseFilter) return false;
      if (quizFilter !== "all" && row.quizId !== quizFilter) return false;
      if (studentFilter !== "all" && row.studentId !== studentFilter) return false;
      if (resultFilter !== "all" && rowResultKind(row, now) !== resultFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        if (new Date(reportDate(row)) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59");
        if (new Date(reportDate(row)) > to) return false;
      }
      return true;
    });
  }, [rows, courseFilter, quizFilter, studentFilter, resultFilter, dateFrom, dateTo, now]);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const graded = filtered.filter((row) => row.percentage !== null);
  const averagePercent =
    graded.length > 0 ? Math.round(graded.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / graded.length) : null;
  const passRate =
    graded.length > 0
      ? Math.round((graded.filter((row) => row.passed).length / graded.length) * 100)
      : null;

  const filteredAttemptIds = useMemo(() => new Set(filtered.map((row) => row.id)), [filtered]);
  const filteredAnswers = useMemo(
    () => answers.filter((answer) => filteredAttemptIds.has(answer.attemptId)),
    [answers, filteredAttemptIds]
  );

  function filtersSummary(): FiltersSummary {
    return {
      course: courseFilter === "all" ? "All courses" : (courses.find((c) => c.id === courseFilter)?.title ?? "—"),
      quiz: quizFilter === "all" ? "All quizzes" : (quizzes.find((q) => q.id === quizFilter)?.title ?? "—"),
      student: studentFilter === "all" ? "All students" : (students.find((s) => s.id === studentFilter)?.name ?? "—"),
      result: resultFilter === "all" ? "All results" : resultFilter,
      dateFrom: dateFrom || "—",
      dateTo: dateTo || "—",
      totalResults: filtered.length,
      averagePercent,
      passRate,
    };
  }

  async function runExport(kind: ExportKind) {
    setExporting(kind);
    try {
      const summary = filtersSummary();
      if (kind === "excel") {
        exportToExcel(filtered, filteredAnswers, summary);
      } else if (kind === "csv") {
        exportToCsv(filtered);
      } else {
        exportToPdf(filtered, summary);
      }
      showToast(`Export ready — check your downloads.`, "success");
    } catch {
      showToast("Export failed. Please try again.", "danger");
    } finally {
      setExporting(null);
    }
  }

  function requestExport(kind: ExportKind) {
    if (filtered.length === 0) {
      showToast("There are no results to export.", "warning");
      return;
    }
    if (filtered.length > LARGE_EXPORT_THRESHOLD) {
      setPendingExport(kind);
      return;
    }
    void runExport(kind);
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

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-10" />}
        title="No attempts yet"
        description="Once students take quizzes, their results will show up here for you to filter and export."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-secondary">Course</label>
          <select
            value={courseFilter}
            onChange={(event) => {
              setCourseFilter(event.target.value);
              setQuizFilter("all");
            }}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-secondary">Quiz</label>
          <select
            value={quizFilter}
            onChange={(event) => setQuizFilter(event.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">All quizzes</option>
            {quizOptions.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-fg-secondary">Student</label>
          <select
            value={studentFilter}
            onChange={(event) => setStudentFilter(event.target.value)}
            className="h-11 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

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
            <option value="expired">Expired</option>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-secondary">
          Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}.
          {averagePercent !== null && <> Average {averagePercent}%.</>}
          {passRate !== null && <> Pass rate {passRate}%.</>}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-muted">Exports use your current filters.</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => requestExport("excel")}
            loading={exporting === "excel"}
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => requestExport("csv")}
            loading={exporting === "csv"}
          >
            <FileText className="size-4" /> CSV
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => requestExport("pdf")}
            loading={exporting === "pdf"}
          >
            <FileType className="size-4" /> PDF
          </Button>
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <SortHeader label="Student" sortKeyName="student" />
            <TableHeaderCell>Email</TableHeaderCell>
            <SortHeader label="Quiz" sortKeyName="quiz" />
            <SortHeader label="Attempt" sortKeyName="attemptNumber" />
            <SortHeader label="Date" sortKeyName="date" />
            <SortHeader label="Score" sortKeyName="score" />
            <TableHeaderCell>Total</TableHeaderCell>
            <SortHeader label="%" sortKeyName="percentage" />
            <SortHeader label="Result" sortKeyName="result" />
            <SortHeader label="Time taken" sortKeyName="timeTaken" />
          </TableRow>
        </TableHead>
        <TableBody>
          {paged.map((row) => {
            const kind = rowResultKind(row, now);
            const seconds = timeTakenSeconds(row);
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/admin/users/${row.studentId}/attempts`} className="font-medium text-primary hover:underline">
                    {row.studentName}
                  </Link>
                </TableCell>
                <TableCell className="text-fg-secondary">{row.studentEmail}</TableCell>
                <TableCell>{row.quizTitle}</TableCell>
                <TableCell>{row.attemptNumber}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(reportDate(row))}</TableCell>
                <TableCell>{row.score !== null ? row.score : "—"}</TableCell>
                <TableCell>{row.totalQuestions !== null ? row.totalQuestions : "—"}</TableCell>
                <TableCell>{row.percentage !== null ? `${row.percentage}%` : "—"}</TableCell>
                <TableCell>
                  <ResultBadge kind={kind} startedAt={row.startedAt} now={now} />
                </TableCell>
                <TableCell>{seconds !== null ? formatDuration(seconds) : "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {sorted.length === 0 && <p className="text-sm text-fg-secondary">No results match your filters.</p>}

      {sorted.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-fg-secondary">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="flex size-11 items-center justify-center rounded-md border border-border text-fg-secondary hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              className="flex size-11 items-center justify-center rounded-md border border-border text-fg-secondary hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={pendingExport !== null}
        onClose={() => setPendingExport(null)}
        title="Large export"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FileWarning className="size-8 shrink-0 text-warning" />
            <p className="text-sm text-fg-secondary">
              You are about to export {filtered.length.toLocaleString()} rows. This is a lot of data and may take a
              moment to generate. Continue?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPendingExport(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                const kind = pendingExport;
                setPendingExport(null);
                if (kind) void runExport(kind);
              }}
            >
              Export anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
