import { createServiceClient } from "@/lib/supabase/service";

// CLAUDE.md known limit #1: Resend's free tier only delivers to Talha's own
// verified address until a domain is bought. Every email in this project is
// expected to fail for real students right now — that's not a bug. What
// matters is that the failure is logged and never rolls back the action it
// followed (an approval/rejection always succeeds even if the email doesn't).
//
// Uses the service-role client, not the caller's session-scoped one —
// email_log only has an admin-facing SELECT policy (it's a system audit
// log, not something admins write to directly), so a normal session client
// has no INSERT policy to write through.
export async function logEmail(params: {
  organizationId: string;
  toEmail: string;
  template: string;
  subject: string;
  status: "sent" | "failed" | "bounced";
  resendId?: string | null;
  errorMessage?: string | null;
}) {
  const supabase = createServiceClient();
  await supabase.from("email_log").insert({
    organization_id: params.organizationId,
    to_email: params.toEmail,
    template: params.template,
    subject: params.subject,
    status: params.status,
    resend_id: params.resendId ?? null,
    error_message: params.errorMessage ?? null,
  });
}
