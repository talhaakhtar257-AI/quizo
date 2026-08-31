// Pure constants and types shared by both server code and client components
// (e.g. SubAdminsCard.tsx). Kept separate from permissions.ts, which pulls in
// next/headers via the server Supabase client — importing that from a
// "use client" file breaks the build (Turbopack refuses to bundle a
// next/headers import into client code, even through a re-export chain).

// The nine toggles in sub_admin_permissions (docs/SCHEMA.md Table 4),
// matching docs/FEATURES.md §12's permission matrix exactly.
export type SubAdminPermission =
  | "create_course"
  | "edit_course"
  | "delete_course"
  | "create_quiz"
  | "approve_quiz"
  | "view_students"
  | "manage_enrollments"
  | "view_analytics"
  | "manage_settings";

export const PERMISSION_KEYS: SubAdminPermission[] = [
  "create_course",
  "edit_course",
  "delete_course",
  "create_quiz",
  "approve_quiz",
  "view_students",
  "manage_enrollments",
  "view_analytics",
  "manage_settings",
];

export const PERMISSION_LABELS: Record<SubAdminPermission, string> = {
  create_course: "Create courses",
  edit_course: "Edit courses",
  delete_course: "Delete courses",
  create_quiz: "Create or generate quizzes",
  approve_quiz: "Approve, publish, or archive quizzes",
  view_students: "View students",
  manage_enrollments: "Approve or reject students",
  view_analytics: "View analytics",
  manage_settings: "Change academy settings",
};
