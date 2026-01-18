/**
 * Testes unitários para o gerenciamento de memória conversacional.
 *
 * @see US-011: Configuração do LangChain Agent
 * @see US-013: Memória Conversacional
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  ConversationMemory,
  SessionMemoryStore,
} from "../../../agents/memory.js";

describe("ConversationMemory", () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    memory = new ConversationMemory();
  });

  describe("addHumanMessage", () => {
    it("should add a human message to history", async () => {
      await memory.addHumanMessage("Hello, AI!");

      const messages = await memory.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toBeInstanceOf(HumanMessage);
      expect(messages[0]?.content).toBe("Hello, AI!");
    });
  });

  describe("addAIMessage", () => {
    it("should add an AI message to history", async () => {
      await memory.addAIMessage("Hello, human!");

      const messages = await memory.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toBeInstanceOf(AIMessage);
      expect(messages[0]?.content).toBe("Hello, human!");
    });
  });

  describe("conversation flow", () => {
    it("should maintain message order", async () => {
      await memory.addHumanMessage("Question 1");
      await memory.addAIMessage("Answer 1");
      await memory.addHumanMessage("Question 2");
      await memory.addAIMessage("Answer 2");

      const messages = await memory.getMessages();
      expect(messages).toHaveLength(4);
      expect(messages[0]?.content).toBe("Question 1");
      expect(messages[1]?.content).toBe("Answer 1");
      expect(messages[2]?.content).toBe("Question 2");
      expect(messages[3]?.content).toBe("Answer 2");
    });
  });

  describe("getChatHistory", () => {
    it("should return messages as ChatMessage array", async () => {
      await memory.addHumanMessage("Hello");
      await memory.addAIMessage("Hi there!");

      const history = await memory.getChatHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ role: "human", content: "Hello" });
      expect(history[1]).toEqual({ role: "ai", content: "Hi there!" });
    });
  });

  describe("getMessageCount", () => {
    it("should return correct message count", async () => {
      expect(await memory.getMessageCount()).toBe(0);

      await memory.addHumanMessage("Message 1");
      expect(await memory.getMessageCount()).toBe(1);

      await memory.addAIMessage("Message 2");
      expect(await memory.getMessageCount()).toBe(2);
    });
  });

  describe("clear", () => {
    it("should clear all messages", async () => {
      await memory.addHumanMessage("Message 1");
      await memory.addAIMessage("Message 2");

      await memory.clear();

      expect(await memory.getMessageCount()).toBe(0);
    });
  });

  describe("maxMessages limit", () => {
    it("should trim history when exceeding maxMessages", async () => {
      const limitedMemory = new ConversationMemory({ maxMessages: 4 });

      // Add 6 messages
      for (let i = 1; i <= 6; i++) {
        await limitedMemory.addHumanMessage(`Message ${i}`);
      }

      const messages = await limitedMemory.getMessages();

      // Should only keep last 4
      expect(messages).toHaveLength(4);
      expect(messages[0]?.content).toBe("Message 3");
      expect(messages[3]?.content).toBe("Message 6");
    });
  });

  describe("createBufferMemory", () => {
    it("should create a BufferMemory instance", async () => {
      await memory.addHumanMessage("Test message");

      const bufferMemory = memory.createBufferMemory();

      expect(bufferMemory).toBeDefined();
      expect(bufferMemory.memoryKey).toBe("chat_history");
      expect(bufferMemory.returnMessages).toBe(true);
    });
  });

  describe("createWindowMemory", () => {
    it("should create a BufferWindowMemory instance", () => {
      const windowMemory = memory.createWindowMemory(5);

      expect(windowMemory).toBeDefined();
      expect(windowMemory.memoryKey).toBe("chat_history");
      expect(windowMemory.k).toBe(5);
    });

    it("should use default k value", () => {
      const windowMemory = memory.createWindowMemory();

      expect(windowMemory.k).toBe(10);
    });
  });
});

describe("SessionMemoryStore", () => {
  let store: SessionMemoryStore;

  beforeEach(() => {
    store = new SessionMemoryStore();
  });

  describe("getSession", () => {
    it("should create new session if not exists", () => {
      const session = store.getSession("session-1");

      expect(session).toBeInstanceOf(ConversationMemory);
      expect(store.hasSession("session-1")).toBe(true);
    });

    it("should return existing session", async () => {
      const session1 = store.getSession("session-1");
      await session1.addHumanMessage("Hello");

      const session2 = store.getSession("session-1");
      const count = await session2.getMessageCount();

      expect(count).toBe(1);
    });

    it("should create independent sessions", async () => {
      const session1 = store.getSession("session-1");
      const session2 = store.getSession("session-2");

      await session1.addHumanMessage("Message for session 1");

      expect(await session1.getMessageCount()).toBe(1);
      expect(await session2.getMessageCount()).toBe(0);
    });
  });

  describe("hasSession", () => {
    it("should return false for non-existent session", () => {
      expect(store.hasSession("unknown")).toBe(false);
    });

    it("should return true for existing session", () => {
      store.getSession("session-1");
      expect(store.hasSession("session-1")).toBe(true);
    });
  });

  describe("deleteSession", () => {
    it("should delete existing session", () => {
      store.getSession("session-1");
      expect(store.hasSession("session-1")).toBe(true);

      const result = store.deleteSession("session-1");

      expect(result).toBe(true);
      expect(store.hasSession("session-1")).toBe(false);
    });

    it("should return false for non-existent session", () => {
      const result = store.deleteSession("unknown");
      expect(result).toBe(false);
    });
  });

  describe("clearAllSessions", () => {
    it("should clear all sessions", () => {
      store.getSession("session-1");
      store.getSession("session-2");
      store.getSession("session-3");

      store.clearAllSessions();

      expect(store.getSessionCount()).toBe(0);
    });
  });

  describe("getSessionCount", () => {
    it("should return correct session count", () => {
      expect(store.getSessionCount()).toBe(0);

      store.getSession("session-1");
      expect(store.getSessionCount()).toBe(1);

      store.getSession("session-2");
      expect(store.getSessionCount()).toBe(2);
    });
  });

  describe("getSessionIds", () => {
    it("should return all session IDs", () => {
      store.getSession("alpha");
      store.getSession("beta");
      store.getSession("gamma");

      const ids = store.getSessionIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain("alpha");
      expect(ids).toContain("beta");
      expect(ids).toContain("gamma");
    });
  });

  describe("with custom config", () => {
    it("should apply config to new sessions", async () => {
      const customStore = new SessionMemoryStore({ maxMessages: 3 });
      const session = customStore.getSession("test");

      // Add 5 messages
      for (let i = 1; i <= 5; i++) {
        await session.addHumanMessage(`Message ${i}`);
      }

      // Should be trimmed to 3
      expect(await session.getMessageCount()).toBe(3);
    });
  });
});
