import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.profile.role !== "admin" || currentUser.profile.status !== "active") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .eq("status", "pending");

  return (
    <AdminShell
      userName={currentUser.profile.full_name ?? currentUser.email}
      pendingCount={pendingCount ?? 0}
    >
      {children}
    </AdminShell>
  );
}
