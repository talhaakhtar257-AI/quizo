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

// Students take quizzes on phones. The failure this catches is the one that
// looks fine on a laptop and is unusable on a handset: one element wider
// than the screen, which makes the WHOLE page slide sideways and puts the
// answer buttons half off the edge.
//
// A wide table is allowed to scroll — inside its own box. What is not
// allowed is the document itself scrolling sideways.

const PHONE = { width: 375, height: 812 }; // iPhone X-class, the narrow end of real traffic

let service: SupabaseClient<Database>;
let org: TestOrg;
let student: TestUser;
let quizId: string;

test.beforeAll(async () => {
  service = serviceClient();
  org = await createTestAcademy(service);
  student = await createTestStudent(service, org.inviteCode);
  await approveEnrollmentDirectly(service, student.id);
  ({ quizId } = await createTestQuiz(service, org, { questionsToShow: 3, perLevel: 3 }));
});

test.afterAll(async () => {
  if (service) await destroyAllTestAcademies(service);
});

interface Overflow {
  documentWidth: number;
  viewportWidth: number;
  culprits: string[];
}

async function measureOverflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const culprits: string[] = [];

    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      // Only blame an element that spills past the right edge AND is not
      // inside something that scrolls on purpose.
      if (box.right <= viewportWidth + 1) continue;

      let scrollableAncestor = false;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") {
          scrollableAncestor = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (scrollableAncestor) continue;

      const id = element.id ? `#${element.id}` : "";
      const cls = element.className && typeof element.className === "string"
        ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
      culprits.push(`${element.tagName.toLowerCase()}${id}${cls} → ${Math.round(box.right)}px`);
      if (culprits.length >= 5) break;
    }

    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth,
      culprits,
    };
  });
}

async function expectNoSidewaysScroll(page: Page, label: string): Promise<void> {
  const overflow = await measureOverflow(page);
  const message =
    `${label} scrolls sideways on a ${PHONE.width}px screen ` +
    `(page is ${overflow.documentWidth}px wide).` +
    (overflow.culprits.length ? `\nWidest offenders:\n  ${overflow.culprits.join("\n  ")}` : "");
  // One pixel of slack: sub-pixel rounding on a scaled layout is not a bug.
  expect(overflow.documentWidth, message).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test.describe("on a phone screen", () => {
  test.use({ viewport: PHONE });

  test("public pages fit the screen", async ({ page }) => {
    for (const path of ["/", "/pricing", "/login", "/signup", "/signup/student", "/privacy", "/terms"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSidewaysScroll(page, path);
    }
  });

  test("admin pages fit the screen", async ({ page }) => {
    await loginAs(page, org.admin.email);
    for (const path of [
      "/dashboard",
      "/dashboard/courses",
      "/dashboard/quizzes",
      "/dashboard/users",
      "/dashboard/attempts",
      "/dashboard/reports",
      "/dashboard/settings",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSidewaysScroll(page, path);
    }
  });

  test("student pages fit the screen", async ({ page }) => {
    await loginAs(page, student.email);
    for (const path of ["/student", "/student/quizzes", "/student/history"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSidewaysScroll(page, path);
    }
  });

  test("the quiz itself is usable on a phone", async ({ page }) => {
    await loginAs(page, student.email);
    await page.goto(`/quiz/${quizId}/start`);
    await expectNoSidewaysScroll(page, "the quiz instructions");

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Start Quiz" }).click();
    await expect(page.getByText("Question 1 of 3")).toBeVisible();
    await expectNoSidewaysScroll(page, "the quiz question screen");

    // Every answer must be tappable: 44px is the minimum target size this
    // project set for itself in docs/DESIGN-SYSTEM.md.
    const options = page.getByRole("button", { name: /(Correct|Wrong) / });
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      const box = await options.nth(index).boundingBox();
      expect(box, `answer ${index + 1} has no box`).not.toBeNull();
      expect(box!.height, `answer ${index + 1} is only ${box!.height}px tall`).toBeGreaterThanOrEqual(44);
    }
  });
});
