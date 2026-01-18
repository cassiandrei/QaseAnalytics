import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("QaseAnalytics");
  });

  test("should display the description", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("p").first()).toContainText("AI-powered analytics");
  });
});
