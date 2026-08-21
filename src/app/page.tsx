import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/get-current-user";

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");

  redirect(
    currentUser.profile.role === "admin" ? "/admin/dashboard" : "/dashboard"
  );
}
