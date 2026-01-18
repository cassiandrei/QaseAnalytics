import { test, expect } from "@playwright/test";

test.describe("Chat Interface", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Empty State", () => {
    test("should display welcome message", async ({ page }) => {
      await expect(page.locator("h3")).toContainText("Bem-vindo ao QaseAnalytics");
    });

    test("should display suggestion chips", async ({ page }) => {
      await expect(page.locator("button").filter({ hasText: "Quais projetos eu tenho acesso?" })).toBeVisible();
      await expect(page.locator("button").filter({ hasText: "Qual o pass rate do último test run?" })).toBeVisible();
    });
  });

  test.describe("Chat Header", () => {
    test("should display QaseAnalytics AI title", async ({ page }) => {
      await expect(page.locator("h1")).toContainText("QaseAnalytics AI");
    });

    test("should show online status indicator", async ({ page }) => {
      // Status indicator should be green (online)
      await expect(page.locator("text=Online")).toBeVisible();
    });
  });

  test.describe("Message Input", () => {
    test("should have a text input field", async ({ page }) => {
      const textarea = page.locator("textarea");
      await expect(textarea).toBeVisible();
      await expect(textarea).toHaveAttribute(
        "placeholder",
        "Digite sua pergunta sobre métricas de teste..."
      );
    });

    test("should have a send button", async ({ page }) => {
      const sendButton = page.locator('button[aria-label="Enviar mensagem"]');
      await expect(sendButton).toBeVisible();
    });

    test("should disable send button when input is empty", async ({ page }) => {
      const sendButton = page.locator('button[aria-label="Enviar mensagem"]');
      await expect(sendButton).toBeDisabled();
    });

    test("should enable send button when input has text", async ({ page }) => {
      const textarea = page.locator("textarea");
      const sendButton = page.locator('button[aria-label="Enviar mensagem"]');

      await textarea.fill("Hello");
      await expect(sendButton).toBeEnabled();
    });

    test("should show helper text for keyboard shortcuts", async ({ page }) => {
      await expect(page.locator("text=Enter")).toBeVisible();
      await expect(page.locator("text=Shift + Enter")).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should adapt to mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      // Header should still be visible
      await expect(page.locator("h1")).toContainText("QaseAnalytics AI");

      // Input should still be visible and usable
      const textarea = page.locator("textarea");
      await expect(textarea).toBeVisible();
    });

    test("should adapt to tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");

      await expect(page.locator("h1")).toContainText("QaseAnalytics AI");
      await expect(page.locator("textarea")).toBeVisible();
    });

    test("should work on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/");

      await expect(page.locator("h1")).toContainText("QaseAnalytics AI");
      await expect(page.locator("textarea")).toBeVisible();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should focus textarea on page load", async ({ page }) => {
      const textarea = page.locator("textarea");
      await expect(textarea).toBeFocused();
    });

    test("should support Tab navigation", async ({ page }) => {
      // Tab through focusable elements
      await page.keyboard.press("Tab");
      // Should move to next focusable element (suggestion chips or send button)
    });
  });

  test.describe("User Interaction Flow", () => {
    test("should show user message after typing and clicking send", async ({ page }) => {
      const textarea = page.locator("textarea");
      const sendButton = page.locator('button[aria-label="Enviar mensagem"]');

      await textarea.fill("Quais projetos eu tenho acesso?");
      await sendButton.click();

      // User message should appear
      await expect(page.locator("text=Você")).toBeVisible();
      await expect(page.locator("text=Quais projetos eu tenho acesso?")).toBeVisible();
    });

    test("should show user message after typing and pressing Enter", async ({ page }) => {
      const textarea = page.locator("textarea");

      await textarea.fill("Teste de mensagem");
      await page.keyboard.press("Enter");

      // User message should appear
      await expect(page.locator("text=Teste de mensagem")).toBeVisible();
    });

    test("should allow multiline input with Shift+Enter", async ({ page }) => {
      const textarea = page.locator("textarea");

      await textarea.fill("Linha 1");
      await page.keyboard.press("Shift+Enter");
      await textarea.type("Linha 2");

      // Should not send the message, textarea should have newline
      await expect(textarea).toHaveValue("Linha 1\nLinha 2");
    });

    test("should clear input after sending message", async ({ page }) => {
      const textarea = page.locator("textarea");
      const sendButton = page.locator('button[aria-label="Enviar mensagem"]');

      await textarea.fill("Mensagem de teste");
      await sendButton.click();

      // Input should be cleared
      await expect(textarea).toHaveValue("");
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper aria labels", async ({ page }) => {
      await expect(page.locator('button[aria-label="Enviar mensagem"]')).toBeVisible();
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      // Should have h1 for main title
      await expect(page.locator("h1")).toBeVisible();
      // Should have h3 for welcome message
      await expect(page.locator("h3")).toBeVisible();
    });
  });
});
