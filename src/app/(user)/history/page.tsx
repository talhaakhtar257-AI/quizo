import Link from "next/link";
import { History as HistoryIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
} from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, quiz_id, status, percentage, passed, submitted_at, quizzes(title, courses(title))")
    .neq("status", "in_progress")
    .order("submitted_at", { ascending: false });

  const { data: certificates } = await supabase
    .from("certificates")
    .select("attempt_id, certificate_code");

  const certificateByAttempt = new Map(
    (certificates ?? []).map((cert) => [cert.attempt_id, cert.certificate_code])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">History</h1>
        <p className="mt-1 text-sm text-fg-secondary">Every quiz attempt you've made.</p>
      </div>

      {!attempts || attempts.length === 0 ? (
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
              const certificateCode = certificateByAttempt.get(attempt.id);
              return (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium text-fg">
                    {attempt.quizzes?.title ?? "Quiz"}
                  </TableCell>
                  <TableCell>{attempt.quizzes?.courses?.title ?? "—"}</TableCell>
                  <TableCell>
                    {attempt.submitted_at ? formatDate(attempt.submitted_at) : "—"}
                  </TableCell>
                  <TableCell>{attempt.percentage !== null ? `${attempt.percentage}%` : "—"}</TableCell>
                  <TableCell>
                    {attempt.status === "expired" ? (
                      <Badge variant="neutral">Expired</Badge>
                    ) : (
                      <Badge variant={attempt.passed ? "success" : "danger"}>
                        {attempt.passed ? "Passed" : "Failed"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/quiz/${attempt.quiz_id}/result?attempt=${attempt.id}`}
                        className={buttonVariants({ size: "sm", variant: "secondary" })}
                      >
                        View Result
                      </Link>
                      {certificateCode && (
                        <Link
                          href={`/certificates/${certificateCode}`}
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
