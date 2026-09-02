import { expect, test, type Page } from "@playwright/test";
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

// The whole point of the product, taken end to end in a real browser: start
// a quiz, answer one question at a time, get scored by the server, and be
// issued a certificate on a pass. Two of the things checked here — pool
// exhaustion and the timer running out — are impossible to test by hand
// without sitting in front of the screen for half an hour.

let service: SupabaseClient<Database>;
let org: TestOrg;
let student: TestUser;

test.beforeAll(async () => {
  service = serviceClient();
  org = await createTestAcademy(service);
  student = await createTestStudent(service, org.inviteCode);
  await approveEnrollmentDirectly(service, student.id);
});

test.afterAll(async () => {
  if (service) await destroyAllTestAcademies(service);
});

// Starting a quiz deliberately requires ticking the "I have read and
// understood the instructions" box first — the button stays disabled until
// then, so a student cannot start by accident.
async function startQuiz(page: Page): Promise<void> {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start Quiz" }).click();
}

// The seeded pool always makes option "a" correct, but the engine shuffles
// the display order, so the answer has to be found by reading the screen.
// Each option button is numbered on screen, so its accessible name reads
// "1 Correct easy 1" — matched loosely rather than anchored to the start.
async function answerCurrentQuestion(page: Page, correctly: boolean): Promise<void> {
  const correct = page.getByRole("button", { name: /Correct / });
  const wrong = page.getByRole("button", { name: /Wrong / }).first();
  await (correctly ? correct : wrong).click();
  await page.getByRole("button", { name: /Next Question|Submit Quiz/ }).click();
}

test("a student takes a quiz and is certified on a pass", async ({ page }) => {
  const { quizId } = await createTestQuiz(service, org, { questionsToShow: 3, perLevel: 3 });

  await loginAs(page, student.email);
  await page.goto(`/quiz/${quizId}/start`);
  await startQuiz(page);

  // Question 1 is always Easy — an adaptive attempt starts at the bottom.
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  await expect(page.getByText("Easy", { exact: true })).toBeVisible();
  await answerCurrentQuestion(page, true);

  // A correct answer climbs the ladder.
  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await answerCurrentQuestion(page, true);

  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await expect(page.getByText("Hard", { exact: true })).toBeVisible();
  await answerCurrentQuestion(page, true);

  await expect(page).toHaveURL(/\/quiz\/result\//, { timeout: 30_000 });
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText("PASS")).toBeVisible();

  const { data: attempt } = await service
    .from("quiz_attempts")
    .select("id, status, score, is_best_attempt")
    .eq("quiz_id", quizId)
    .eq("student_id", student.id)
    .single();
  expect(attempt!.status).toBe("submitted");
  expect(Number(attempt!.score)).toBe(100);
  expect(attempt!.is_best_attempt).toBe(true);

  // Rule 16: a certificate is issued automatically, on a pass, at submission.
  const { count } = await service
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attempt!.id);
  expect(count).toBe(1);
});

test("a wrong answer moves the next question down a level", async ({ page }) => {
  const { quizId } = await createTestQuiz(service, org, { questionsToShow: 3, perLevel: 3 });

  await loginAs(page, student.email);
  await page.goto(`/quiz/${quizId}/start`);
  await startQuiz(page);

  await expect(page.getByText("Easy", { exact: true })).toBeVisible();
  await answerCurrentQuestion(page, true);

  await expect(page.getByText("Medium", { exact: true })).toBeVisible();
  await answerCurrentQuestion(page, false);

  // Wrong at Medium drops back to Easy, and never below it.
  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await expect(page.getByText("Easy", { exact: true })).toBeVisible();
});

test("a quiz with too few questions submits early and says why", async ({ page }) => {
  // One question per level. The quiz is asked for six only AFTER it starts —
  // beforehand the publish gate correctly refuses to let a student begin a
  // quiz with too few approved questions, so the pool can only truly run dry
  // mid-attempt. Nobody could reach this by hand.
  const { quizId } = await createTestQuiz(service, org, { questionsToShow: 1, perLevel: 1 });

  await loginAs(page, student.email);
  await page.goto(`/quiz/${quizId}/start`);
  await startQuiz(page);
  await expect(page.getByRole("button", { name: /(Correct|Wrong) / }).first()).toBeVisible();
  await service.from("quizzes").update({ questions_to_show: 6 }).eq("id", quizId);

  for (let asked = 0; asked < 3; asked++) {
    if (await page.getByRole("button", { name: /(Correct|Wrong) / }).first().isVisible().catch(() => false)) {
      await answerCurrentQuestion(page, true);
    }
  }

  await expect(page).toHaveURL(/\/quiz\/result\//, { timeout: 30_000 });

  // Scored on what was actually asked, not marked wrong for questions that
  // were never shown.
  const { data: attempt } = await service
    .from("quiz_attempts")
    .select("status, score, total_questions")
    .eq("quiz_id", quizId)
    .eq("student_id", student.id)
    .single();
  expect(attempt!.status).toBe("submitted");
  expect(attempt!.total_questions).toBeLessThan(6);
  expect(Number(attempt!.score)).toBe(100);
});

test("an attempt whose time ran out is closed by the server, not the browser", async ({ page }) => {
  const { quizId } = await createTestQuiz(service, org, {
    questionsToShow: 3,
    perLevel: 3,
    timeLimitMinutes: 1,
  });

  await loginAs(page, student.email);
  await page.goto(`/quiz/${quizId}/start`);
  await startQuiz(page);
  await expect(page.getByText("Question 1 of 3")).toBeVisible();

  // Rather than waiting a real minute, move the attempt's start time into
  // the past. The server recomputes the remaining time from started_at on
  // every request, so this is the same situation as a student walking away.
  const { data: attempt } = await service
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_id", quizId)
    .eq("student_id", student.id)
    .eq("status", "in_progress")
    .single();
  await service
    .from("quiz_attempts")
    .update({ started_at: new Date(Date.now() - 10 * 60_000).toISOString() })
    .eq("id", attempt!.id);

  await answerCurrentQuestion(page, true);

  await expect(page).toHaveURL(/\/quiz\/result\//, { timeout: 30_000 });

  const { data: after } = await service
    .from("quiz_attempts")
    .select("status")
    .eq("id", attempt!.id)
    .single();
  expect(after!.status).toBe("submitted");
});

test("a submitted attempt cannot be re-opened by going back to its URL", async ({ page }) => {
  // Rule 9: a submitted attempt is immutable.
  const { quizId } = await createTestQuiz(service, org, { questionsToShow: 1, perLevel: 1 });

  await loginAs(page, student.email);
  await page.goto(`/quiz/${quizId}/start`);
  await startQuiz(page);
  await answerCurrentQuestion(page, true);
  await expect(page).toHaveURL(/\/quiz\/result\//, { timeout: 30_000 });

  const { data: attempt } = await service
    .from("quiz_attempts")
    .select("id, score")
    .eq("quiz_id", quizId)
    .eq("student_id", student.id)
    .single();

  await page.goto(`/quiz/${quizId}/attempt/${attempt!.id}`);
  await expect(page.getByRole("button", { name: /(Correct|Wrong) / })).toHaveCount(0);

  const { data: after } = await service
    .from("quiz_attempts")
    .select("score, status")
    .eq("id", attempt!.id)
    .single();
  expect(after!.status).toBe("submitted");
  expect(Number(after!.score)).toBe(Number(attempt!.score));
});
