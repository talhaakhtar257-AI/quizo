import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  approveEnrollmentDirectly,
  createTestAcademy,
  createTestQuiz,
  createTestStudent,
  destroyAllTestAcademies,
  serviceClient,
  type TestOrg,
  type TestUser,
} from "../support/fixtures";
import { loginAs } from "../support/e2e-helpers";

// CLAUDE.md rule 8: "A student must never reach an admin route, even by
// typing the URL." Rule 11: the platform-owner area is gated by an env
// allowlist. Both are enforced in the proxy, which is exactly the kind of
// thing that keeps working right up until someone edits a matcher.

let service: SupabaseClient<Database>;
let org: TestOrg;
let student: TestUser;
let pendingStudent: TestUser;
let quizId: string;

test.beforeAll(async () => {
  service = serviceClient();
  org = await createTestAcademy(service);
  student = await createTestStudent(service, org.inviteCode);
  pendingStudent = await createTestStudent(service, org.inviteCode);
  await approveEnrollmentDirectly(service, student.id);
  ({ quizId } = await createTestQuiz(service, org));
});

test.afterAll(async () => {
  if (service) await destroyAllTestAcademies(service);
});

test("a signed-out visitor is sent to the login page, not into the app", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("a student typing the admin URL is bounced back to their own area", async ({ page }) => {
  await loginAs(page, student.email);
  await expect(page).toHaveURL(/\/student/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/student/);

  await page.goto("/dashboard/settings");
  await expect(page).toHaveURL(/\/student/);
});

test("a student cannot reach the platform-owner area", async ({ page }) => {
  await loginAs(page, student.email);
  await page.goto("/platform");
  await expect(page).not.toHaveURL(/\/platform/);
});

test("an academy owner cannot reach the platform-owner area either", async ({ page }) => {
  // The allowlist is an environment variable, so being an admin — even the
  // owner of an academy — is not enough.
  await loginAs(page, org.admin.email);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/platform");
  await expect(page).not.toHaveURL(/\/platform/);
});

test("a student waiting for approval cannot start a quiz", async ({ page }) => {
  await loginAs(page, pendingStudent.email);
  await page.goto(`/quiz/${quizId}/start`);

  await expect(page.getByRole("button", { name: "Start Quiz" })).toHaveCount(0);
  await expect(page.getByText(/not an approved student/i)).toBeVisible();
});

test("an approved student is never told they are pending", async ({ page }) => {
  // The mirror of the test above: the guard must not be so eager that it
  // blocks the students who are allowed in.
  await loginAs(page, student.email);
  await page.goto(`/quiz/${quizId}/start`);
  await expect(page.getByRole("button", { name: "Start Quiz" })).toBeVisible();
});
