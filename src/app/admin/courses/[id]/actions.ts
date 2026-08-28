"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

export interface TopicInput {
  title: string;
  description: string;
}

export async function addTopic(courseId: string, input: TopicInput) {
  const supabase = await requireAdmin();
  const { data: existing } = await supabase
    .from("course_outlines")
    .select("topic_order")
    .eq("course_id", courseId)
    .order("topic_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.topic_order ?? 0) + 1;

  const { error } = await supabase.from("course_outlines").insert({
    course_id: courseId,
    topic_title: input.title,
    topic_description: input.description || null,
    topic_order: nextOrder,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateTopic(
  courseId: string,
  topicId: string,
  input: TopicInput
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("course_outlines")
    .update({
      topic_title: input.title,
      topic_description: input.description || null,
    })
    .eq("id", topicId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteTopic(courseId: string, topicId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("course_outlines")
    .delete()
    .eq("id", topicId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function moveTopic(
  courseId: string,
  topicId: string,
  direction: "up" | "down"
) {
  const supabase = await requireAdmin();
  const { data: topics } = await supabase
    .from("course_outlines")
    .select("id, topic_order")
    .eq("course_id", courseId)
    .order("topic_order", { ascending: true });

  if (!topics) return;

  const index = topics.findIndex((topic) => topic.id === topicId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= topics.length) return;

  const current = topics[index];
  const swapWith = topics[swapIndex];

  await supabase
    .from("course_outlines")
    .update({ topic_order: swapWith.topic_order })
    .eq("id", current.id);
  await supabase
    .from("course_outlines")
    .update({ topic_order: current.topic_order })
    .eq("id", swapWith.id);

  revalidatePath(`/admin/courses/${courseId}`);
}
