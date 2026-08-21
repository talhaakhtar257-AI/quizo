"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, ListTree } from "lucide-react";
import { Button, Input, Textarea, Modal, EmptyState, useToast } from "@/components/ui";
import { addTopic, updateTopic, deleteTopic, moveTopic } from "./actions";

interface Topic {
  id: string;
  topic_title: string;
  topic_description: string | null;
  topic_order: number;
}

export function OutlineList({
  courseId,
  topics,
}: {
  courseId: string;
  topics: Topic[];
}) {
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function openAdd() {
    setModalMode("add");
    setEditingTopic(null);
    setTitle("");
    setDescription("");
    setError(null);
  }

  function openEdit(topic: Topic) {
    setModalMode("edit");
    setEditingTopic(topic);
    setTitle(topic.topic_title);
    setDescription(topic.topic_description ?? "");
    setError(null);
  }

  function closeModal() {
    setModalMode(null);
    setEditingTopic(null);
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    startTransition(async () => {
      try {
        if (editingTopic) {
          await updateTopic(courseId, editingTopic.id, { title, description });
          showToast("Topic updated", "success");
        } else {
          await addTopic(courseId, { title, description });
          showToast("Topic added", "success");
        }
        closeModal();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteTopic(courseId, deleteTarget.id);
        showToast("Topic deleted", "success");
        setDeleteTarget(null);
      } catch {
        showToast("Could not delete this topic", "danger");
      }
    });
  }

  function handleMove(topicId: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveTopic(courseId, topicId, direction);
    });
  }

  return (
    <div className="space-y-4">
      {topics.length === 0 ? (
        <EmptyState
          icon={<ListTree className="size-10" />}
          title="No topics yet"
          description="Break this course into topics to guide question generation."
          action={
            <Button size="sm" onClick={openAdd}>
              Add topic
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <ul className="divide-y divide-border">
              {topics.map((topic, index) => (
            <li
              key={topic.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-fg">{topic.topic_title}</p>
                {topic.topic_description && (
                  <p className="mt-0.5 truncate text-sm text-fg-secondary">
                    {topic.topic_description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0 || isPending}
                  onClick={() => handleMove(topic.id, "up")}
                  aria-label={`Move ${topic.topic_title} up`}
                  className="flex size-9 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg disabled:opacity-30"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === topics.length - 1 || isPending}
                  onClick={() => handleMove(topic.id, "down")}
                  aria-label={`Move ${topic.topic_title} down`}
                  className="flex size-9 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg disabled:opacity-30"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(topic)}
                  aria-label={`Edit ${topic.topic_title}`}
                  className="flex size-9 items-center justify-center rounded-md text-fg-secondary hover:bg-surface-raised hover:text-fg"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(topic)}
                  aria-label={`Delete ${topic.topic_title}`}
                  className="flex size-9 items-center justify-center rounded-md text-fg-secondary hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
              ))}
            </ul>
          </div>

          <Button size="sm" variant="secondary" onClick={openAdd}>
            <Plus className="size-4" /> Add topic
          </Button>
        </>
      )}

      <Modal
        open={modalMode !== null}
        onClose={closeModal}
        title={modalMode === "edit" ? "Edit topic" : "Add topic"}
      >
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            label="Description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isPending}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.topic_title}"?`}
      >
        <p className="text-sm text-fg-secondary">This cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={isPending}>
            Delete topic
          </Button>
        </div>
      </Modal>
    </div>
  );
}
