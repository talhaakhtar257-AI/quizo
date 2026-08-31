"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { Card, Button, useToast } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { regenerateInviteCode } from "./actions";

export function InviteCodeCard({
  courseId,
  initialCode,
  initialExpiresAt,
}: {
  courseId: string;
  initialCode: string;
  initialExpiresAt: string | null;
}) {
  const [code, setCode] = useState(initialCode);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleRegenerate() {
    startTransition(async () => {
      try {
        const result = await regenerateInviteCode(courseId);
        setCode(result.code);
        setExpiresAt(result.expiresAt);
        showToast("New invite code generated — the old one no longer works", "success");
      } catch {
        showToast("Could not regenerate the code", "danger");
      }
    });
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-fg-secondary">Invite Code</h3>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-md border border-border bg-surface-raised px-3 py-1.5 font-mono text-lg text-fg">
          {code}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy invite code"
          className="flex size-9 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised"
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </button>
      </div>
      {expiresAt && (
        <p className="mt-2 text-xs text-fg-secondary">Expires {formatDate(expiresAt)}</p>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={handleRegenerate}
        loading={isPending}
      >
        <RefreshCw className="size-4" />
        Regenerate
      </Button>
    </Card>
  );
}
