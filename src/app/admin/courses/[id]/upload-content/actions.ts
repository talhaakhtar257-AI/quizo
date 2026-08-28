"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import type { Enums } from "@/types/database";

// Mirrors the client-side warnings in ContentUploader.tsx (2MB text/markdown,
// 10MB PDF worth of extracted text, ~50,000 recommended chars) — those are
// UI-only hints, so this is the actual enforcement: a Server Action is
// directly POST-able independent of the form, and the raw_text column has no
// database-level limit of its own.
const MIN_CONTENT_CHARS = 20;
const MAX_CONTENT_CHARS = 300_000;

export interface SaveContentInput {
  sourceType: Enums<"content_source_type">;
  rawText: string;
  originalFilename?: string | null;
}

export async function saveContent(courseId: string, input: SaveContentInput) {
  const trimmed = input.rawText.trim();
  if (trimmed.length < MIN_CONTENT_CHARS) {
    throw new Error("This content is too short to save.");
  }
  if (trimmed.length > MAX_CONTENT_CHARS) {
    throw new Error("This content is too long. Please split it into smaller uploads.");
  }

  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("content_uploads")
    .insert({
      course_id: courseId,
      source_type: input.sourceType,
      raw_text: input.rawText,
      original_filename: input.originalFilename ?? null,
      uploaded_by: user?.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/courses/${courseId}/upload-content`);
  return data;
}

export async function deleteContentUpload(courseId: string, uploadId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("content_uploads")
    .delete()
    .eq("id", uploadId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/courses/${courseId}/upload-content`);
}
