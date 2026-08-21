import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import { UserShell } from "@/components/user/UserShell";

export default async function UserLayout({ children }: { children: ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.profile.status !== "active") redirect("/pending-approval");

  return (
    <UserShell userName={currentUser.profile.full_name ?? currentUser.email}>
      {children}
    </UserShell>
  );
}
