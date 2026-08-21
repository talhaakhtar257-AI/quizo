import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.profile.role !== "admin" || currentUser.profile.status !== "active") {
    redirect("/dashboard");
  }

  return (
    <AdminShell userName={currentUser.profile.full_name ?? currentUser.email}>
      {children}
    </AdminShell>
  );
}
