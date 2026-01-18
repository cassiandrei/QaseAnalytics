import { test, expect } from "@playwright/test";

/**
 * Teste E2E de integração do chat com a API.
 *
 * Pré-requisitos:
 * - API rodando em localhost:3001
 * - Usuário "test-user" criado e conectado ao Qase
 * - Docker com PostgreSQL e Redis rodando
 */
test.describe("Chat Integration", () => {
  test.beforeEach(async ({ page, request }) => {
    // Configura timeout maior para respostas da IA
    test.setTimeout(60000);

    // Limpa o histórico de chat antes de cada teste
    await request.delete("http://localhost:3001/api/chat/history", {
      headers: { "X-User-ID": "test-user" },
    });

    await page.goto("/");
    // Aguarda a página carregar completamente
    await page.waitForLoadState("networkidle");
  });

  test("should send message and receive AI response with pass rate", async ({ page }) => {
    // Localiza o textarea de input
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();

    // Digita a pergunta
    await textarea.fill("qual o pass rate do último test run?");

    // Clica no botão de enviar
    const sendButton = page.locator('button[aria-label="Enviar mensagem"]');
    await sendButton.click();

    // Verifica se a mensagem do usuário aparece
    await expect(page.getByText("qual o pass rate do último test run?").first()).toBeVisible();

    // Verifica se aparece o label "Você" (mensagem do usuário)
    await expect(page.getByText("Você", { exact: true }).first()).toBeVisible();

    // Aguarda a resposta da IA (pode demorar até 30s)
    // A resposta deve conter "pass rate" ou percentual
    await expect(page.getByText(/\d+%|pass rate/i).first()).toBeVisible({ timeout: 45000 });

    // Verifica que existe resposta da IA
    await expect(page.getByText("QaseAnalytics AI").first()).toBeVisible();
  });

  test("should show user message and wait for AI response", async ({ page }) => {
    const textarea = page.locator("textarea");
    await textarea.fill("liste os projetos");

    const sendButton = page.locator('button[aria-label="Enviar mensagem"]');
    await sendButton.click();

    // Verificamos se a mensagem do usuário foi enviada
    await expect(page.getByText("liste os projetos").first()).toBeVisible();

    // Aguarda resposta da IA (deve mencionar projeto)
    await expect(page.getByText(/projeto|GV|Grupo Voalle/i).first()).toBeVisible({ timeout: 45000 });
  });

  test("should clear input after sending message", async ({ page }) => {
    const textarea = page.locator("textarea");
    await textarea.fill("teste de mensagem");

    const sendButton = page.locator('button[aria-label="Enviar mensagem"]');
    await sendButton.click();

    // Input deve ser limpo
    await expect(textarea).toHaveValue("");

    // Mensagem deve aparecer no histórico
    await expect(page.getByText("teste de mensagem").first()).toBeVisible();
  });

  test("should display empty state with suggestions when no messages", async ({ page, request }) => {
    // Limpa novamente para garantir
    await request.delete("http://localhost:3001/api/chat/history", {
      headers: { "X-User-ID": "test-user" },
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verifica empty state
    await expect(page.getByText("Bem-vindo ao QaseAnalytics")).toBeVisible();

    // Verifica sugestões
    await expect(page.getByRole("button", { name: /projetos/i }).first()).toBeVisible();
  });
});
