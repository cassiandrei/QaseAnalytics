import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the QaseAnalytics AI header", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("QaseAnalytics AI");
  });

  test("should display the chat interface", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("textarea")).toBeVisible();
  });
});
