import { BadgeCheck, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { Badge, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Verify Certificate" };

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createServiceClient();

  const { data: certificate } = await supabase
    .from("certificates")
    .select(
      "certificate_number, score, issued_at, quizzes(title, courses(name)), profiles(full_name), organizations(name)"
    )
    .eq("certificate_number", code)
    .maybeSingle();

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <Card className="space-y-4 p-6 text-center">
          {certificate ? (
            <>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-bg text-success">
                <BadgeCheck className="size-6" />
              </div>
              <div>
                <Badge variant="success">Valid Certificate</Badge>
                <h1 className="mt-3 text-2xl font-semibold text-fg">
                  {certificate.profiles?.full_name ?? "Student"}
                </h1>
                <p className="mt-1 text-sm text-fg-secondary">
                  has successfully completed
                </p>
                <p className="mt-1 text-lg font-medium text-fg">
                  {certificate.quizzes?.title ?? "Quiz"}
                </p>
                {certificate.quizzes?.courses?.name && (
                  <p className="text-sm text-fg-secondary">
                    {certificate.quizzes.courses.name}
                  </p>
                )}
                {certificate.organizations?.name && (
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-fg-muted">
                    Issued by {certificate.organizations.name}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-6 border-t border-border pt-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Score</p>
                  <p className="mt-1 font-semibold text-fg">{certificate.score}%</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Date Issued</p>
                  <p className="mt-1 font-semibold text-fg">
                    {certificate.issued_at ? formatDate(certificate.issued_at) : "—"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-fg-muted">{certificate.certificate_number}</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
                <ShieldX className="size-6" />
              </div>
              <div>
                <Badge variant="danger">Certificate Not Found</Badge>
                <h1 className="mt-3 text-xl font-semibold text-fg">We couldn&apos;t verify this code</h1>
                <p className="mt-2 text-sm text-fg-secondary">
                  &quot;{code}&quot; doesn&apos;t match any certificate on record. Double-check the code and
                  try again.
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
