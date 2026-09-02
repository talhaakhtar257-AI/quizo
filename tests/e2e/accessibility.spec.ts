import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The public pages are the ones anyone can land on, so they are the ones an
// automated accessibility scan is worth running on every push. Serious
// violations only — axe also reports stylistic preferences, and a test that
// fails on those gets switched off within a week.

const PUBLIC_PAGES = ["/", "/pricing", "/login", "/signup", "/signup/student", "/privacy", "/terms"];

for (const path of PUBLIC_PAGES) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical"
    );
    const summary = serious
      .map((violation) => `${violation.id}: ${violation.nodes.length} × ${violation.help}`)
      .join("\n");
    expect(serious, summary).toEqual([]);
  });
}

test("the landing page can be navigated with the keyboard alone", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");

  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    return {
      tag: element.tagName,
      // A focus ring that is invisible is the same as no focus ring.
      hasVisibleFocus: style.outlineStyle !== "none" || style.boxShadow !== "none",
    };
  });

  expect(focused, "nothing was focusable with the first Tab press").not.toBeNull();
  expect(focused!.hasVisibleFocus).toBe(true);
});
