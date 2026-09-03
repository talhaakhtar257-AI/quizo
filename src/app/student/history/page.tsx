import Link from "next/link";
import { History as HistoryIcon } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "History" };
import {
  Badge,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  buttonVariants,
  LoadFailed,
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, status, score, submitted_at, quizzes(title, passing_score, courses(name))")
    .neq("status", "in_progress")
    .order("submitted_at", { ascending: false });

  const { data: certificates } = await supabase
    .from("certificates")
    .select("attempt_id, certificate_number");

  const certificateByAttempt = new Map(
    (certificates ?? []).map((cert) => [cert.attempt_id, cert.certificate_number])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">History</h1>
        <p className="mt-1 text-sm text-fg-secondary">Every quiz attempt you've made.</p>
      </div>

      {error ? (
        <LoadFailed what="your quiz history" />
      ) : !attempts || attempts.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="size-10" />}
          title="No attempts yet"
          description="Once you take a quiz, it will show up here."
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Quiz</TableHeaderCell>
              <TableHeaderCell>Course</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Score</TableHeaderCell>
              <TableHeaderCell>Result</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attempts.map((attempt) => {
              const certificateNumber = certificateByAttempt.get(attempt.id);
              const passed =
                attempt.score !== null && attempt.score >= (attempt.quizzes?.passing_score ?? 70);
              return (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium text-fg">
                    {attempt.quizzes?.title ?? "Quiz"}
                  </TableCell>
                  <TableCell>{attempt.quizzes?.courses?.name ?? "—"}</TableCell>
                  <TableCell>
                    {attempt.submitted_at ? formatDate(attempt.submitted_at) : "—"}
                  </TableCell>
                  <TableCell>{attempt.score !== null ? `${attempt.score}%` : "—"}</TableCell>
                  <TableCell>
                    {attempt.status === "timed_out" ? (
                      <Badge variant="neutral">Timed out</Badge>
                    ) : (
                      <Badge variant={passed ? "success" : "danger"}>{passed ? "Passed" : "Failed"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/quiz/result/${attempt.id}`}
                        className={buttonVariants({ size: "sm", variant: "secondary" })}
                      >
                        View Result
                      </Link>
                      {certificateNumber && (
                        <Link
                          href={`/certificates/${certificateNumber}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Download Certificate
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
