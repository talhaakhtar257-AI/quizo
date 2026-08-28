import { NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/require-admin";

interface RequestBody {
  email?: string;
  name?: string;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
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

  const { email, name } = body;
  if (!email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email service isn't configured." }, { status: 500 });
  }

  const loginUrl = `${new URL(request.url).origin}/login`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "Quizo <onboarding@resend.dev>",
      to: email,
      subject: "Your account has been approved",
      html: approvalEmailHtml({ name: name?.trim() || "there", loginUrl }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send email." },
      { status: 502 }
    );
  }
}

function approvalEmailHtml({ name, loginUrl }: { name: string; loginUrl: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:32px;">
      <tr>
        <td>
          <h1 style="margin:0 0 16px;font-size:24px;color:#0F172A;">Your account has been approved</h1>
          <p style="margin:0 0 16px;font-size:16px;color:#475569;">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 24px;font-size:16px;color:#475569;">
            Good news — your Quizo account is now active. You can log in and start taking your assigned quizzes.
          </p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background-color:#4F46E5;color:#FFFFFF;text-decoration:none;border-radius:6px;font-weight:bold;">
            Log in to Quizo
          </a>
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
