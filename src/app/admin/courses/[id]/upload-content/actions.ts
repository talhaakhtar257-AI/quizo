"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export interface SaveContentInput {
  sourceType: Enums<"content_source_type">;
  rawText: string;
  originalFilename?: string | null;
}

export async function saveContent(courseId: string, input: SaveContentInput) {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_uploads")
    .delete()
    .eq("id", uploadId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/courses/${courseId}/upload-content`);
}
