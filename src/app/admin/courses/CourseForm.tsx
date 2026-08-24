"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, useToast } from "@/components/ui";
import { createCourse, updateCourse } from "./actions";

interface CourseFormProps {
  course?: { id: string; title: string; description: string | null };
}

export function CourseForm({ course }: CourseFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (course) {
        await updateCourse(course.id, { title, description });
        showToast("Course updated", "success");
        router.push("/admin/courses");
      } else {
        const created = await createCourse({ title, description });
        showToast("Course created", "success");
        router.push(`/admin/courses/${created.id}`);
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>
            {course ? "Save changes" : "Create course"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
