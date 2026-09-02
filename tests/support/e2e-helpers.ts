import { expect, type Page } from "@playwright/test";
import { TEST_PASSWORD } from "./fixtures";

// Logs in the way a real person does — through the form — because the login
// page does its own profile, deactivation and suspension checks after the
// password succeeds, and a token injected behind its back would skip them.
export async function loginAs(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}
