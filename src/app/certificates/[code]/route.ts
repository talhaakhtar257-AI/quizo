import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { createServiceClient } from "@/lib/supabase/service";
import { buildCertificatePdf, certificateFilename, fetchLogoDataUri } from "@/lib/certificate-pdf";

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
      "certificate_number, student_id, score, issued_at, quizzes(title, courses(name)), profiles(full_name), organizations(name, logo_url, plan)"
    )
    .eq("certificate_number", code)
    .maybeSingle();

  const isOwner = certificate?.student_id === currentUser.id;
  const isAdmin = currentUser.profile.role === "admin" || currentUser.profile.role === "sub_admin";
  if (!certificate || !(isOwner || isAdmin)) {
    return new NextResponse("Certificate not found.", { status: 404 });
  }

  const { data: limits } = await supabase
    .from("plan_limits")
    .select("has_custom_branding, has_white_label")
    .eq("plan", certificate.organizations?.plan ?? "free")
    .maybeSingle();

  const hasCustomBranding = limits?.has_custom_branding ?? false;
  const logoDataUri = hasCustomBranding
    ? await fetchLogoDataUri(certificate.organizations?.logo_url)
    : null;

  const doc = buildCertificatePdf({
    studentName: certificate.profiles?.full_name ?? currentUser.profile.full_name ?? "Student",
    quizTitle: certificate.quizzes?.title ?? "Quiz",
    courseTitle: certificate.quizzes?.courses?.name ?? "",
    academyName: certificate.organizations?.name ?? "Quizo Academy",
    score: certificate.score,
    issuedAt: certificate.issued_at ?? new Date().toISOString(),
    certificateNumber: certificate.certificate_number,
    hasCustomBranding,
    hasWhiteLabel: limits?.has_white_label ?? false,
    logoDataUri,
  });

  const pdfBytes = doc.output("arraybuffer");
  const filename = certificateFilename(certificate.quizzes?.title ?? "quiz", certificate.issued_at ?? new Date().toISOString());

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
