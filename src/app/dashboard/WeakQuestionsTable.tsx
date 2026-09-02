import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { levelLabel, type Difficulty } from "@/lib/quiz-engine";

export interface WeakQuestionRow {
  questionId: string;
  questionText: string;
  quizId: string;
  quizTitle: string;
  difficulty: Difficulty;
  timesShown: number;
  timesWrong: number;
  wrongPercent: number;
}

const WEAK_THRESHOLD = 70;

export function WeakQuestionsTable({
  rows,
  filteredQuizTitle,
}: {
  rows: WeakQuestionRow[];
  /** Set when the dashboard's own Quiz filter is pinned to one quiz — shown as a sub-header
   * instead of repeating the same quiz name down every row of the table. */
  filteredQuizTitle?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-10" />}
        title="Not enough data yet"
        description="A question needs to have been shown at least 5 times in this range before it shows up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-secondary">
        A question wrong more than 70% of the time may be unclear or may have the wrong answer marked. Review
        these.
      </p>
      {filteredQuizTitle && (
        <p className="text-xs font-medium text-fg-secondary">Quiz: {filteredQuizTitle}</p>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Question</TableHeaderCell>
            {!filteredQuizTitle && <TableHeaderCell>Quiz</TableHeaderCell>}
            <TableHeaderCell>Difficulty</TableHeaderCell>
            <TableHeaderCell>Shown</TableHeaderCell>
            <TableHeaderCell>Wrong</TableHeaderCell>
            <TableHeaderCell>Wrong %</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.questionId}>
              <TableCell className="max-w-md whitespace-normal">
                <Link
                  href={`/dashboard/quizzes/${row.quizId}/questions`}
                  className="text-secondary hover:underline"
                >
                  {row.questionText}
                </Link>
              </TableCell>
              {!filteredQuizTitle && <TableCell>{row.quizTitle}</TableCell>}
              <TableCell>{levelLabel(row.difficulty)}</TableCell>
              <TableCell>{row.timesShown}</TableCell>
              <TableCell>{row.timesWrong}</TableCell>
              <TableCell>
                {row.wrongPercent > WEAK_THRESHOLD ? (
                  <Badge variant="danger">{row.wrongPercent}%</Badge>
                ) : (
                  <span className="text-fg-secondary">{row.wrongPercent}%</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
