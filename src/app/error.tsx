"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background p-4">
      <EmptyState
        icon={<AlertTriangle className="size-10 text-danger" />}
        title="Something went wrong"
        description="This page ran into a problem. Try again, or go back and try a different page."
        action={
          <Button onClick={() => reset()}>Try again</Button>
        }
      />
    </div>
  );
}
