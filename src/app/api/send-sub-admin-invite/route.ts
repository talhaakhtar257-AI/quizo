import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireOwner } from "@/lib/permissions";
import { logEmail } from "@/lib/email-log";

interface RequestBody {
  email?: string;
  token?: string;
}

export async function POST(request: Request) {
  let orgId: string;
  let academyName = "your academy";
  try {
    const ctx = await requireOwner();
    orgId = ctx.orgId;
    const { data: org } = await ctx.supabase.from("organizations").select("name").eq("id", orgId).single();
    if (org?.name) academyName = org.name;
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

  const { email, token } = body;
  if (!email || !token) {
    return NextResponse.json({ error: "Missing email or token." }, { status: 400 });
  }

  const subject = `You've been invited to help run ${academyName} on Quizo`;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    await logEmail({
      organizationId: orgId,
      toEmail: email,
      template: "sub-admin-invite",
      subject,
      status: "failed",
      errorMessage: "RESEND_API_KEY is not configured.",
    });
    return NextResponse.json({ error: "Email service isn't configured." }, { status: 500 });
  }

  const signupUrl = `${new URL(request.url).origin}/signup/sub-admin?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Quizo <onboarding@resend.dev>",
      to: email,
      subject,
      html: inviteEmailHtml({ academyName, signupUrl }),
    });

    if (error) {
      await logEmail({
        organizationId: orgId,
        toEmail: email,
        template: "sub-admin-invite",
        subject,
        status: "failed",
        errorMessage: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    await logEmail({
      organizationId: orgId,
      toEmail: email,
      template: "sub-admin-invite",
      subject,
      status: "sent",
      resendId: data?.id,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send email.";
    await logEmail({
      organizationId: orgId,
      toEmail: email,
      template: "sub-admin-invite",
      subject,
      status: "failed",
      errorMessage: message,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function inviteEmailHtml({ academyName, signupUrl }: { academyName: string; signupUrl: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:32px;">
      <tr>
        <td>
          <h1 style="margin:0 0 16px;font-size:24px;color:#0F172A;">You're invited</h1>
          <p style="margin:0 0 24px;font-size:16px;color:#475569;">
            You've been invited to help run <strong>${escapeHtml(academyName)}</strong> on Quizo as
            a sub-admin. Follow the link below to create your account — the owner will turn on
            your permissions afterward.
          </p>
          <a href="${signupUrl}" style="display:inline-block;padding:12px 24px;background-color:#F4A300;color:#0A1F17;text-decoration:none;border-radius:6px;font-weight:bold;">
            Accept invite &rarr;
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#94A3B8;">This link expires in 7 days.</p>
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
