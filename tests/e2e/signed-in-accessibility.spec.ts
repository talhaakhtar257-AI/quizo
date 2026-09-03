import AxeBuilder from "@axe-core/playwright";
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

// accessibility.spec.ts covers the pages a stranger can reach. These are the
// pages people actually spend their day in — and they are the ones nobody
// ever scans, because reaching them needs a real account, a real academy and
// a real quiz first.
//
// Every page here is checked TWICE, once in each theme. The light-theme
// colour tokens were audited by hand; the dark ones never were, and a
// contrast failure that only appears in dark mode is invisible to anyone
// whose machine is set to light.

const ADMIN_PAGES = [
  "/dashboard",
  "/dashboard/courses",
  "/dashboard/quizzes",
  "/dashboard/users",
  "/dashboard/attempts",
  "/dashboard/reports",
  "/dashboard/settings",
];

const STUDENT_PAGES = ["/student", "/student/quizzes", "/student/history"];

let service: SupabaseClient<Database>;
let org: TestOrg;
let student: TestUser;

test.beforeAll(async () => {
  service = serviceClient();
  org = await createTestAcademy(service);
  student = await createTestStudent(service, org.inviteCode);
  await approveEnrollmentDirectly(service, student.id);
  await createTestQuiz(service, org);
});

test.afterAll(async () => {
  if (service) await destroyAllTestAcademies(service);
});

// next-themes is set to `attribute="class"` with `defaultTheme="system"`, so
// the OS preference decides unless a choice was stored. Setting both the
// emulated preference and the stored value makes the theme deterministic no
// matter which path the provider takes on first paint.
async function useTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value);
    } catch {
      // A browser with site data blocked still gets the emulated preference.
    }
  }, theme);
}

async function expectNoSeriousViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical"
  );
  const summary = serious
    .map(
      (violation) =>
        `${label} — ${violation.id}: ${violation.help}\n` +
        violation.nodes
          .slice(0, 5)
          .map((node) => `    ${node.target.join(" ")}\n    ${node.failureSummary ?? ""}`)
          .join("\n")
    )
    .join("\n\n");
  expect(serious, summary).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test(`admin pages have no serious accessibility violations in ${theme} mode`, async ({ page }) => {
    await useTheme(page, theme);
    await loginAs(page, org.admin.email);

    for (const path of ADMIN_PAGES) {
      await page.goto(path);
      // Server Components stream, so the shell can be present while the real
      // content is still a skeleton. Waiting for the network to settle scans
      // the page a person would actually see.
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page, `${path} (${theme})`);
    }
  });

  test(`student pages have no serious accessibility violations in ${theme} mode`, async ({ page }) => {
    await useTheme(page, theme);
    await loginAs(page, student.email);

    for (const path of STUDENT_PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousViolations(page, `${path} (${theme})`);
    }
  });
}

test("the public pages are also clean in dark mode", async ({ page }) => {
  await useTheme(page, "dark");
  for (const path of ["/", "/pricing", "/login", "/signup", "/privacy", "/terms"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoSeriousViolations(page, `${path} (dark)`);
  }
});
