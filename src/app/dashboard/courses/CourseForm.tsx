"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea, UpgradePrompt, useToast } from "@/components/ui";
import { parsePlanLimitError } from "@/lib/plan-limits";
import { createCourse, updateCourse } from "./actions";

interface CourseFormProps {
  course?: {
    id: string;
    name: string;
    description: string | null;
    subject: string | null;
  };
}

export function CourseForm({ course }: CourseFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(course?.name ?? "");
  const [subject, setSubject] = useState(course?.subject ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 3) {
      setError("Name must be at least 3 characters.");
      return;
    }
    setError(null);
    setLimitMessage(null);
    setLoading(true);

    try {
      if (course) {
        await updateCourse(course.id, { name, description, subject });
        showToast("Course updated", "success");
        router.push("/dashboard/courses");
      } else {
        const created = await createCourse({ name, description, subject });
        showToast("Course created", "success");
        router.push(`/dashboard/courses/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      const limitError = parsePlanLimitError(err);
      if (limitError) {
        setLimitMessage(limitError);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="Subject"
          placeholder="e.g. Computer Science"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {limitMessage && (
          <UpgradePrompt
            message={limitMessage}
            benefits="Upgrade to Pro for unlimited courses, 100 students per course, 3× question pools, and full anti-cheating."
          />
        )}
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
