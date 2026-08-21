import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const AUTH_PAGES = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedUserRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/quiz");
  const isAuthPage = AUTH_PAGES.has(pathname);

  // Logged out on a protected page → send to login.
  if (!user) {
    if (isAdminRoute || isProtectedUserRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  const isActive = profile?.status === "active";
  const isAdmin = profile?.role === "admin";

  // Logged in and active, but browsing to /login or /signup → their dashboard.
  if (isAuthPage && isActive) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/admin/dashboard" : "/dashboard", request.url)
    );
  }

  if (isAdminRoute && !(isAdmin && isActive)) {
    const destination = profile?.status === "pending" ? "/pending-approval" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isProtectedUserRoute && !isActive) {
    const destination = profile?.status === "pending" ? "/pending-approval" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
