import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, buttonVariants } from "@/components/ui";

export function IneligibleNotice({ reason }: { reason: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md space-y-4 p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-bg text-warning">
          <AlertTriangle className="size-6" />
        </div>
        <p className="text-sm text-fg-secondary">{reason}</p>
        <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
          Back to Dashboard
        </Link>
      </Card>
    </div>
  );
}
