import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";

// Placeholder — replaced with the real student dashboard in a later phase.
export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-fg">Your dashboard</h1>
      <p className="mt-2 text-fg-secondary">
        Welcome back, {currentUser.profile.full_name ?? currentUser.email}.
      </p>
    </div>
  );
}
