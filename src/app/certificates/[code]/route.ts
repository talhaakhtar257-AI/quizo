import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { buildCertificatePdf, certificateFilename } from "@/lib/certificate-pdf";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createServiceClient();
  const { data: certificate } = await supabase
    .from("certificates")
    .select(
      "certificate_code, user_id, issued_at, attempts(percentage, quizzes(title, courses(title))), profiles(full_name)"
    )
    .eq("certificate_code", code)
    .maybeSingle();

  const isOwner = certificate?.user_id === currentUser.id;
  const isAdmin = currentUser.profile.role === "admin";
  if (!certificate || !(isOwner || isAdmin)) {
    return new NextResponse("Certificate not found.", { status: 404 });
  }

  const doc = buildCertificatePdf({
    studentName: certificate.profiles?.full_name ?? currentUser.profile.full_name ?? "Student",
    quizTitle: certificate.attempts?.quizzes?.title ?? "Quiz",
    courseTitle: certificate.attempts?.quizzes?.courses?.title ?? "",
    percentage: certificate.attempts?.percentage ?? 0,
    issuedAt: certificate.issued_at,
    certificateCode: certificate.certificate_code,
  });

  const pdfBytes = doc.output("arraybuffer");
  const filename = certificateFilename(certificate.attempts?.quizzes?.title ?? "quiz", certificate.issued_at);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
