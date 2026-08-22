import { AlertTriangle } from "lucide-react";
import { Badge, EmptyState, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { levelLabel, type Difficulty } from "@/lib/quiz-engine";

export interface WeakQuestionRow {
  questionId: string;
  questionText: string;
  quizTitle: string;
  difficulty: Difficulty;
  timesShown: number;
  timesWrong: number;
  wrongPercent: number;
}

function shorten(text: string, max = 80) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function WeakQuestionsTable({ rows }: { rows: WeakQuestionRow[] }) {
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
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Question</TableHeaderCell>
            <TableHeaderCell>Quiz</TableHeaderCell>
            <TableHeaderCell>Difficulty</TableHeaderCell>
            <TableHeaderCell>Shown</TableHeaderCell>
            <TableHeaderCell>Wrong</TableHeaderCell>
            <TableHeaderCell>Wrong %</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.questionId}>
              <TableCell className="max-w-xs">{shorten(row.questionText)}</TableCell>
              <TableCell>{row.quizTitle}</TableCell>
              <TableCell>{levelLabel(row.difficulty)}</TableCell>
              <TableCell>{row.timesShown}</TableCell>
              <TableCell>{row.timesWrong}</TableCell>
              <TableCell>
                <Badge variant={row.wrongPercent > 70 ? "danger" : "neutral"}>{row.wrongPercent}%</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
