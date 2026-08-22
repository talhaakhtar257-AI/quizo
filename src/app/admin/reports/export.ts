import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatDuration } from "@/lib/format";
import { resultKind } from "@/lib/attempt-status";
import { levelLabel } from "@/lib/quiz-engine";
import type { ReportRow, AnswerRow } from "./ReportsTable";

export interface FiltersSummary {
  course: string;
  quiz: string;
  student: string;
  result: string;
  dateFrom: string;
  dateTo: string;
  totalResults: number;
  averagePercent: number | null;
  passRate: number | null;
}

const RESULT_LABEL: Record<string, string> = {
  pass: "Pass",
  fail: "Fail",
  in_progress: "In Progress",
  abandoned: "Abandoned",
  expired: "Expired",
};

function reportDate(row: ReportRow): string {
  return row.submittedAt ?? row.startedAt;
}

function timeTakenLabel(row: ReportRow): string {
  if (!row.submittedAt) return "—";
  const seconds = Math.max(
    0,
    Math.round((new Date(row.submittedAt).getTime() - new Date(row.startedAt).getTime()) / 1000)
  );
  return formatDuration(seconds);
}

function resultLabel(row: ReportRow): string {
  return RESULT_LABEL[resultKind(row.status, row.passed, row.startedAt, row.timerMinutes, new Date())];
}

function resultsAoa(rows: ReportRow[]): (string | number)[][] {
  const header = ["Student", "Email", "Quiz", "Attempt", "Date", "Score", "Total", "%", "Result", "Time taken"];
  const body = rows.map((row) => [
    row.studentName,
    row.studentEmail,
    row.quizTitle,
    row.attemptNumber,
    formatDate(reportDate(row)),
    row.score ?? "",
    row.totalQuestions ?? "",
    row.percentage !== null ? `${row.percentage}%` : "",
    resultLabel(row),
    timeTakenLabel(row),
  ]);
  return [header, ...body];
}

function todayFilename(prefix: string, extension: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${prefix}-${today}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildQuestionAnalysis(answers: AnswerRow[], quizTitleById: Map<string, string>) {
  const byQuestion = new Map<
    string,
    { questionText: string; quizTitle: string; difficulty: string; timesShown: number; timesCorrect: number }
  >();

  for (const answer of answers) {
    const existing = byQuestion.get(answer.questionId);
    if (existing) {
      existing.timesShown += 1;
      if (answer.isCorrect) existing.timesCorrect += 1;
    } else {
      byQuestion.set(answer.questionId, {
        questionText: answer.questionText,
        quizTitle: quizTitleById.get(answer.quizId) ?? "Deleted quiz",
        difficulty: levelLabel(answer.difficulty),
        timesShown: 1,
        timesCorrect: answer.isCorrect ? 1 : 0,
      });
    }
  }

  return Array.from(byQuestion.values())
    .sort((a, b) => a.quizTitle.localeCompare(b.quizTitle) || b.timesShown - a.timesShown)
    .map((q) => ({
      ...q,
      percentCorrect: q.timesShown > 0 ? Math.round((q.timesCorrect / q.timesShown) * 100) : 0,
    }));
}

export function exportToExcel(rows: ReportRow[], answers: AnswerRow[], summary: FiltersSummary) {
  const quizTitleById = new Map(rows.map((row) => [row.quizId, row.quizTitle]));
  const workbook = XLSX.utils.book_new();

  const summaryAoa = [
    ["Quizo — Quiz Results Report"],
    ["Generated", formatDate(new Date())],
    [],
    ["Filters applied"],
    ["Course", summary.course],
    ["Quiz", summary.quiz],
    ["Student", summary.student],
    ["Result", summary.result],
    ["Date from", summary.dateFrom],
    ["Date to", summary.dateTo],
    [],
    ["Totals"],
    ["Total results", summary.totalResults],
    ["Average score", summary.averagePercent !== null ? `${summary.averagePercent}%` : "—"],
    ["Pass rate", summary.passRate !== null ? `${summary.passRate}%` : "—"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet["!cols"] = [{ wch: 18 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const resultsSheet = XLSX.utils.aoa_to_sheet(resultsAoa(rows));
  resultsSheet["!cols"] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 24 },
    { wch: 9 },
    { wch: 14 },
    { wch: 8 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, resultsSheet, "Results");

  const questionRows = buildQuestionAnalysis(answers, quizTitleById);
  const questionAoa = [
    ["Question", "Quiz", "Difficulty", "Times shown", "Times correct", "% correct"],
    ...questionRows.map((q) => [
      q.questionText,
      q.quizTitle,
      q.difficulty,
      q.timesShown,
      q.timesCorrect,
      `${q.percentCorrect}%`,
    ]),
  ];
  const questionSheet = XLSX.utils.aoa_to_sheet(questionAoa);
  questionSheet["!cols"] = [{ wch: 50 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, questionSheet, "Question Analysis");

  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(new Blob([wbout], { type: "application/octet-stream" }), todayFilename("quiz-results", "xlsx"));
}

export function exportToCsv(rows: ReportRow[]) {
  const sheet = XLSX.utils.aoa_to_sheet(resultsAoa(rows));
  const csv = XLSX.utils.sheet_to_csv(sheet);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), todayFilename("quiz-results", "csv"));
}

export function exportToPdf(rows: ReportRow[], summary: FiltersSummary) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text("Quizo — Quiz Results Report", 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const filterLine = `Course: ${summary.course}   Quiz: ${summary.quiz}   Student: ${summary.student}   Result: ${summary.result}   From: ${summary.dateFrom}   To: ${summary.dateTo}`;
  doc.text(filterLine, 14, 23);

  const summaryLine = `Showing ${summary.totalResults} result${summary.totalResults === 1 ? "" : "s"}.${
    summary.averagePercent !== null ? ` Average ${summary.averagePercent}%.` : ""
  }${summary.passRate !== null ? ` Pass rate ${summary.passRate}%.` : ""}`;
  doc.text(summaryLine, 14, 29);

  const [header, ...body] = resultsAoa(rows);

  autoTable(doc, {
    startY: 34,
    head: [header.map(String)],
    body: body.map((row) => row.map(String)),
    styles: { fontSize: 8, textColor: [15, 23, 42], fillColor: [255, 255, 255] },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: "grid",
  });

  doc.save(todayFilename("quiz-results", "pdf"));
}
