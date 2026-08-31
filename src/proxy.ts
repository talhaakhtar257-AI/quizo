import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const AUTH_PAGES = new Set(["/login", "/signup"]);
const PLATFORM_OWNER_EMAILS = new Set(
  (process.env.PLATFORM_OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

// Multi-tenant note: this only decides WHICH area a request may enter
// (admin/sub_admin vs student vs platform-owner). It never decides which
// organization's data a request can see — that boundary is enforced by
// RLS via current_org() in the database, not here. A student and an admin
// in the same org, or an admin in a different org, are both blocked from
// each other's /dashboard data by RLS even though both pass this check.
export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isStudentRoute = pathname.startsWith("/student") || pathname.startsWith("/quiz");
  const isPlatformRoute = pathname.startsWith("/platform");
  // A certificate can belong to a student (who owns it) or be downloaded by
  // an admin — the route itself checks which, so middleware only needs to
  // require "logged in and active," not pick a single role to exclude.
  const isSharedRoute = pathname.startsWith("/certificates");
  const isAuthPage = AUTH_PAGES.has(pathname);

  // Logged out on any protected area → send to login.
  if (!user) {
    if (isDashboardRoute || isStudentRoute || isPlatformRoute || isSharedRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Platform-owner area: gated by an env allowlist, never a database role —
  // no combination of row values a customer's account holds can grant this.
  if (isPlatformRoute) {
    const email = user.email?.toLowerCase();
    if (!email || !PLATFORM_OWNER_EMAILS.has(email)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, organizations!profiles_organization_id_fkey(is_suspended)")
    .eq("id", user.id)
    .maybeSingle();

  // No profile row at all (e.g. a platform-owner-only account, gated
  // separately above and never needing one) is NOT the same as a real
  // deactivation — only an existing profile with is_active = false is that.
  const hasNoProfile = !profile;
  const isActive = profile?.is_active === true;
  const isAdminOrSubAdmin = profile?.role === "admin" || profile?.role === "sub_admin";
  const isStudent = profile?.role === "student";
  const isSuspended =
    (profile?.organizations as { is_suspended: boolean } | null)?.is_suspended === true;

  // Logged in and active, but browsing to /login or /signup → their own area.
  if (isAuthPage && isActive) {
    return NextResponse.redirect(
      new URL(isAdminOrSubAdmin ? "/dashboard" : "/student", request.url)
    );
  }

  // A profile-less account has no academy area to enter — send it to the
  // public site instead of treating the missing row as a deactivation.
  if ((isDashboardRoute || isStudentRoute || isSharedRoute) && hasNoProfile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // A deactivated account (profiles.is_active = false) reaches neither area,
  // regardless of role — signed out and sent back to login with a reason.
  if ((isDashboardRoute || isStudentRoute || isSharedRoute) && !isActive) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?deactivated=1", request.url));
  }

  // The whole academy is suspended (platform-owner action, Phase P) — every
  // member, admin or student, is blocked the same way a deactivated
  // individual account is. Checked separately from is_active since a
  // perfectly active member of a suspended org must still be turned away.
  if ((isDashboardRoute || isStudentRoute || isSharedRoute) && isSuspended) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?suspended=1", request.url));
  }

  // A student must never reach /dashboard, even by typing the URL —
  // CLAUDE.md's single most important security test in the project.
  if (isDashboardRoute && !isAdminOrSubAdmin) {
    return NextResponse.redirect(new URL("/student", request.url));
  }

  // Symmetric: an admin/sub_admin has no reason to be on the student side.
  if (isStudentRoute && !isStudent) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
