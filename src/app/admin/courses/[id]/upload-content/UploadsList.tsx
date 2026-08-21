"use client";

import { useState, useTransition } from "react";
import { Trash2, FileText, ImageIcon } from "lucide-react";
import { Button, Modal, EmptyState, useToast } from "@/components/ui";
import { deleteContentUpload } from "./actions";
import { formatDate } from "@/lib/format";

interface Upload {
  id: string;
  source_type: "text" | "image";
  raw_text: string | null;
  original_filename: string | null;
  created_at: string;
}

export function UploadsList({
  courseId,
  uploads,
}: {
  courseId: string;
  uploads: Upload[];
}) {
  const [deleteTarget, setDeleteTarget] = useState<Upload | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteContentUpload(courseId, deleteTarget.id);
        showToast("Upload deleted", "success");
        setDeleteTarget(null);
      } catch {
        showToast("Could not delete this upload", "danger");
      }
    });
  }

  if (uploads.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-10" />}
        title="No uploads yet"
        description="Paste text or upload an image above to add your first piece of content."
      />
    );
  }

  return (
    <div className="space-y-3">
      {uploads.map((upload) => {
        const preview = (upload.raw_text ?? "").slice(0, 100);
        return (
          <div
            key={upload.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              {upload.source_type === "image" ? (
                <ImageIcon className="mt-0.5 size-5 shrink-0 text-fg-muted" />
              ) : (
                <FileText className="mt-0.5 size-5 shrink-0 text-fg-muted" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-fg-muted">{formatDate(upload.created_at)}</p>
                <p className="mt-0.5 truncate text-sm text-fg">
                  {preview || "(no text)"}
                  {(upload.raw_text?.length ?? 0) > 100 ? "..." : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeleteTarget(upload)}
              aria-label="Delete upload"
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-fg-secondary hover:bg-danger-bg hover:text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this upload?"
      >
        <p className="text-sm text-fg-secondary">This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
