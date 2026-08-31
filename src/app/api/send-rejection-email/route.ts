import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requirePermission } from "@/lib/permissions";
import { logEmail } from "@/lib/email-log";

interface RequestBody {
  email?: string;
  name?: string;
  courseName?: string;
  reason?: string;
}

export async function POST(request: Request) {
  let organizationId: string;
  try {
    const ctx = await requirePermission("manage_enrollments");
    organizationId = ctx.orgId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin access required.";
    return NextResponse.json({ error: message }, { status: message.includes("logged in") ? 401 : 403 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email, name, courseName, reason } = body;
  if (!email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  const subject = "Update on your enrollment request";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    await logEmail({
      organizationId,
      toEmail: email,
      template: "enrollment-rejected",
      subject,
      status: "failed",
      errorMessage: "RESEND_API_KEY is not configured.",
    });
    return NextResponse.json({ error: "Email service isn't configured." }, { status: 500 });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Quizo <onboarding@resend.dev>",
      to: email,
      subject,
      html: rejectionEmailHtml({ name: name?.trim() || "there", courseName, reason }),
    });

    if (error) {
      await logEmail({
        organizationId,
        toEmail: email,
        template: "enrollment-rejected",
        subject,
        status: "failed",
        errorMessage: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    await logEmail({
      organizationId,
      toEmail: email,
      template: "enrollment-rejected",
      subject,
      status: "sent",
      resendId: data?.id,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send email.";
    await logEmail({
      organizationId,
      toEmail: email,
      template: "enrollment-rejected",
      subject,
      status: "failed",
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function rejectionEmailHtml({
  name,
  courseName,
  reason,
}: {
  name: string;
  courseName?: string;
  reason?: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:32px;">
      <tr>
        <td>
          <h1 style="margin:0 0 16px;font-size:24px;color:#0F172A;">Update on your request</h1>
          <p style="margin:0 0 16px;font-size:16px;color:#475569;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 16px;font-size:16px;color:#475569;">
            Your enrollment request${courseName ? ` for "${escapeHtml(courseName)}"` : ""} was not approved at this time.
          </p>
          ${reason ? `<p style="margin:0 0 16px;font-size:16px;color:#475569;">${escapeHtml(reason)}</p>` : ""}
          <p style="margin:0;font-size:14px;color:#94A3B8;">If you have questions, contact your instructor.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
