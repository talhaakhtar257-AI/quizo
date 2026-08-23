import Link from "next/link";
import { Clock } from "lucide-react";
import type { Metadata } from "next";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Pending Approval" };

export default function PendingApprovalPage() {
  return (
    <Card className="p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-bg text-warning">
        <Clock className="size-6" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-fg">Almost there</h1>
      <p className="mt-2 text-sm text-fg-secondary">
        Your account is waiting for admin approval. You&apos;ll be able to log
        in as soon as it&apos;s approved.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
      >
        Back to log in
      </Link>
    </Card>
  );
}
