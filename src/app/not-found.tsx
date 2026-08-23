import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { EmptyState, buttonVariants } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background p-4">
      <EmptyState
        icon={<CompassIcon className="size-10" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have been moved."
        action={
          <Link href="/" className={buttonVariants()}>
            Back to home
          </Link>
        }
      />
    </div>
  );
}
