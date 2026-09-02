import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Builds two throwaway academies against the real Supabase project, then
// deletes them again. Everything it creates is prefixed so it can never be
// confused with a real academy, and cleanup only ever touches ids this file
// created itself.
export const TEST_PREFIX = "zztest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// CI without Supabase secrets runs the unit tests and skips these.
export const hasSupabase = Boolean(url && serviceKey && anonKey);

export function serviceClient(): SupabaseClient<Database> {
  // persistSession:false matters: without it this client can silently pick
  // up a cached session and stop behaving as service_role.
  return createClient<Database>(url!, serviceKey!, { auth: { persistSession: false } });
}

function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(url!, anonKey!, { auth: { persistSession: false } });
}

// A client authenticated as one real user — this is what a browser gets, so
// it is what RLS is actually judged against.
export async function signIn(email: string, password: string): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}`);
  return client;
}

export const TEST_PASSWORD = "Test-Password-9f2a!";

export interface TestUser {
  id: string;
  email: string;
}

export interface TestOrg {
  orgId: string;
  admin: TestUser;
  courseId: string;
  inviteCode: string;
}

// Every academy this file creates, so cleanup is not dependent on the test
// that made it finishing successfully.
const createdOrgIds = new Set<string>();

function unique(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function createUser(
  service: SupabaseClient<Database>,
  metadata: Record<string, string>
): Promise<TestUser> {
  const email = `${TEST_PREFIX}-${unique()}@quizo-test.invalid`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error || !data.user) throw new Error(`Could not create test user: ${error?.message}`);
  return { id: data.user.id, email };
}

// The signup trigger builds the organization, profile and settings rows, so
// creating the auth user is all it takes to have a whole academy.
export async function createTestAcademy(service: SupabaseClient<Database>): Promise<TestOrg> {
  const admin = await createUser(service, {
    academy_name: `${TEST_PREFIX} Academy ${unique()}`,
    full_name: "Test Owner",
  });

  const { data: profile } = await service
    .from("profiles")
    .select("organization_id")
    .eq("id", admin.id)
    .single();
  const orgId = profile!.organization_id;
  // Registered before anything else can fail, so a crash halfway through
  // building the fixture still leaves nothing behind in the database.
  createdOrgIds.add(orgId);

  const inviteCode = `${TEST_PREFIX.toUpperCase()}-${unique().slice(0, 4).toUpperCase()}`;

  const { data: course, error: courseError } = await service
    .from("courses")
    .insert({
      organization_id: orgId,
      name: `${TEST_PREFIX} Course`,
      created_by: admin.id,
      invite_code: inviteCode,
    })
    .select("id")
    .single();
  if (courseError) throw new Error(`Could not create test course: ${courseError.message}`);
  const { error: codeError } = await service.from("invite_codes").insert({
    organization_id: orgId,
    course_id: course.id,
    code: inviteCode,
    max_uses: 50,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    created_by: admin.id,
  });
  if (codeError) throw new Error(`Could not create test invite code: ${codeError.message}`);

  return { orgId, admin, courseId: course.id, inviteCode };
}

export async function createTestStudent(
  service: SupabaseClient<Database>,
  inviteCode: string
): Promise<TestUser> {
  return createUser(service, { invite_code: inviteCode, full_name: "Test Student" });
}

// Deletes only what these tests made. Everything hangs off the organization,
// and organizations <-> profiles reference each other, so the whole academy
// has to come down inside one transaction — that is what the
// delete_test_organization SQL function does. It refuses any organization
// whose name does not start with the test prefix, so a real academy can
// never be passed to it by accident.
export async function destroyTestAcademy(
  service: SupabaseClient<Database>,
  orgId: string
): Promise<void> {
  const { error } = await service.rpc("delete_test_organization", { p_org_id: orgId });
  if (error) throw new Error(`Test cleanup failed for org ${orgId}: ${error.message}`);
  createdOrgIds.delete(orgId);
}

// Safety net: removes any academy this run created that was not torn down
// individually — including ones whose setup threw partway through.
export async function destroyAllTestAcademies(service: SupabaseClient<Database>): Promise<void> {
  for (const orgId of [...createdOrgIds]) {
    await destroyTestAcademy(service, orgId);
  }
}

export interface TestQuiz {
  quizId: string;
  poolId: string;
}

// Builds a published quiz with a real question pool, so a browser test can
// take it end to end without going near the AI generator.
export async function createTestQuiz(
  service: SupabaseClient<Database>,
  org: TestOrg,
  options: {
    title?: string;
    questionsToShow?: number;
    timeLimitMinutes?: number | null;
    perLevel?: number;
    maxAttempts?: number;
  } = {}
): Promise<TestQuiz> {
  const questionsToShow = options.questionsToShow ?? 3;
  const perLevel = options.perLevel ?? questionsToShow;

  const { data: quiz, error: quizError } = await service
    .from("quizzes")
    .insert({
      organization_id: org.orgId,
      course_id: org.courseId,
      title: options.title ?? `${TEST_PREFIX} Quiz`,
      topic: "Testing",
      questions_to_show: questionsToShow,
      time_limit_minutes: options.timeLimitMinutes === undefined ? 30 : options.timeLimitMinutes,
      max_attempts: options.maxAttempts ?? 2,
      passing_score: 70,
      difficulty_mode: "adaptive",
      status: "published",
      published_at: new Date().toISOString(),
      created_by: org.admin.id,
    })
    .select("id")
    .single();
  if (quizError) throw new Error(`Could not create test quiz: ${quizError.message}`);

  const { data: pool, error: poolError } = await service
    .from("quiz_pools")
    .insert({
      organization_id: org.orgId,
      quiz_id: quiz.id,
      total_questions: perLevel * 3,
      easy_count: perLevel,
      medium_count: perLevel,
      hard_count: perLevel,
    })
    .select("id")
    .single();
  if (poolError) throw new Error(`Could not create test quiz pool: ${poolError.message}`);

  // Option "a" is always the correct one. The engine shuffles the order the
  // options are displayed in, so the browser test still has to read them.
  const questions = (["easy", "medium", "hard"] as const).flatMap((difficulty) =>
    Array.from({ length: perLevel }, (_unused, index) => ({
      organization_id: org.orgId,
      pool_id: pool.id,
      question_text: `${difficulty} question ${index + 1}: which option is right?`,
      difficulty,
      option_a: `Correct ${difficulty} ${index + 1}`,
      option_b: `Wrong B ${difficulty} ${index + 1}`,
      option_c: `Wrong C ${difficulty} ${index + 1}`,
      option_d: `Wrong D ${difficulty} ${index + 1}`,
      correct_option: "a",
      is_approved: true,
      generated_by_ai: false,
    }))
  );
  const { error: questionError } = await service.from("pool_questions").insert(questions);
  if (questionError) throw new Error(`Could not create test questions: ${questionError.message}`);

  return { quizId: quiz.id, poolId: pool.id };
}

export async function approveEnrollmentDirectly(
  service: SupabaseClient<Database>,
  studentId: string
): Promise<void> {
  const { error } = await service
    .from("enrollments")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("student_id", studentId);
  if (error) throw new Error(`Could not approve test enrollment: ${error.message}`);
}
