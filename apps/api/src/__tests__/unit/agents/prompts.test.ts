/**
 * Testes unitários para os prompt templates.
 *
 * @see US-011: Configuração do LangChain Agent
 */

import { describe, it, expect } from "vitest";
import {
  QASE_AGENT_SYSTEM_PROMPT,
  CONVERSATION_SUMMARY_PROMPT,
  FALLBACK_RESPONSE_PROMPT,
  SUGGESTIONS_PROMPT,
  createAgentPrompt,
} from "../../../agents/prompts.js";

describe("Prompt Templates", () => {
  describe("QASE_AGENT_SYSTEM_PROMPT", () => {
    it("should contain agent identity", () => {
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("QaseAnalytics AI");
    });

    it("should describe capabilities", () => {
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("List projects");
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("Get test cases");
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("Get test runs");
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("Get detailed results");
    });

    it("should contain context placeholders", () => {
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("{userId}");
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("{projectCode}");
    });

    it("should provide response guidelines", () => {
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("Response Guidelines");
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("language");
    });

    it("should explain data interpretation", () => {
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("Pass Rate");
      expect(QASE_AGENT_SYSTEM_PROMPT).toContain("Automation Rate");
    });
  });

  describe("CONVERSATION_SUMMARY_PROMPT", () => {
    it("should contain conversation placeholder", () => {
      expect(CONVERSATION_SUMMARY_PROMPT).toContain("{conversation}");
    });

    it("should request summary of key elements", () => {
      expect(CONVERSATION_SUMMARY_PROMPT).toContain("Key questions");
      expect(CONVERSATION_SUMMARY_PROMPT).toContain("metrics");
      expect(CONVERSATION_SUMMARY_PROMPT).toContain("Projects");
    });
  });

  describe("FALLBACK_RESPONSE_PROMPT", () => {
    it("should apologize for not understanding", () => {
      expect(FALLBACK_RESPONSE_PROMPT).toContain("sorry");
      expect(FALLBACK_RESPONSE_PROMPT).toContain("understand");
    });

    it("should suggest available actions", () => {
      expect(FALLBACK_RESPONSE_PROMPT).toContain("Project Analysis");
      expect(FALLBACK_RESPONSE_PROMPT).toContain("Test Cases");
      expect(FALLBACK_RESPONSE_PROMPT).toContain("Test Runs");
      expect(FALLBACK_RESPONSE_PROMPT).toContain("Metrics");
    });

    it("should ask user to rephrase", () => {
      expect(FALLBACK_RESPONSE_PROMPT).toContain("rephrase");
    });
  });

  describe("SUGGESTIONS_PROMPT", () => {
    it("should contain context placeholders", () => {
      expect(SUGGESTIONS_PROMPT).toContain("{lastQuestion}");
      expect(SUGGESTIONS_PROMPT).toContain("{projectCode}");
    });

    it("should request 3 suggestions", () => {
      expect(SUGGESTIONS_PROMPT).toContain("3");
    });
  });

  describe("createAgentPrompt", () => {
    it("should return a ChatPromptTemplate", () => {
      const prompt = createAgentPrompt();
      expect(prompt).toBeDefined();
      expect(prompt.inputVariables).toBeDefined();
    });

    it("should include required input variables", () => {
      const prompt = createAgentPrompt();
      const variables = prompt.inputVariables;

      expect(variables).toContain("input");
      expect(variables).toContain("userId");
      expect(variables).toContain("projectCode");
      expect(variables).toContain("chat_history");
      expect(variables).toContain("agent_scratchpad");
    });

    it("should format messages correctly", async () => {
      const prompt = createAgentPrompt();
      const formatted = await prompt.formatMessages({
        input: "Test question",
        userId: "user-123",
        projectCode: "DEMO",
        chat_history: [],
        agent_scratchpad: [],
      });

      // Should have at least system and human messages
      expect(formatted.length).toBeGreaterThanOrEqual(2);
      expect(formatted[0]?.content).toContain("QaseAnalytics AI");
      // Human message is the last one
      expect(formatted[formatted.length - 1]?.content).toBe("Test question");
    });
  });
});
