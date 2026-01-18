/**
 * Custom Hook for Chat Functionality
 *
 * Provides a clean interface for sending messages and managing chat state.
 */

import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "../stores/chat-store";
import {
  sendMessageStream,
  getChatHistory,
  clearChatHistory as apiClearHistory,
  getChatStatus,
  setProjectForChat,
  type ChatMessage,
} from "../lib/api";

export function useChat() {
  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    userId,
    projectCode,
    addMessage,
    updateLastMessage,
    setMessages,
    clearMessages,
    setLoading,
    setStreaming,
    appendStreamingContent,
    clearStreamingContent,
    setError,
    setUserId,
    setProjectCode,
  } = useChatStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Initialize chat by loading history if user is set.
   */
  const initializeChat = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const [historyResponse, statusResponse] = await Promise.all([
        getChatHistory(userId),
        getChatStatus(userId),
      ]);

      setMessages(historyResponse.messages);
      setProjectCode(statusResponse.projectCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize chat");
    } finally {
      setLoading(false);
    }
  }, [userId, setLoading, setError, setMessages, setProjectCode]);

  /**
   * Send a message and handle streaming response.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !userId) return;

      // Create user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      addMessage(userMessage);
      setError(null);
      setStreaming(true);
      clearStreamingContent();

      // Create placeholder assistant message
      const assistantId = `assistant-${Date.now()}`;
      const placeholderMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      addMessage(placeholderMessage);

      let fullContent = "";

      await sendMessageStream(
        content.trim(),
        userId,
        // onChunk
        (chunk) => {
          fullContent += chunk;
          appendStreamingContent(chunk);
          updateLastMessage(fullContent);
        },
        // onComplete
        (metadata) => {
          setStreaming(false);
          clearStreamingContent();
          // Update with final content and metadata
          const finalMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: fullContent,
            timestamp: new Date().toISOString(),
            metadata,
          };
          updateLastMessage(finalMessage.content);
        },
        // onError
        (errorMessage) => {
          setStreaming(false);
          clearStreamingContent();
          setError(errorMessage);
          // Remove placeholder message on error
          setMessages(messages.filter((m) => m.id !== assistantId));
        }
      );
    },
    [
      userId,
      messages,
      addMessage,
      updateLastMessage,
      setMessages,
      setError,
      setStreaming,
      appendStreamingContent,
      clearStreamingContent,
    ]
  );

  /**
   * Clear chat history.
   */
  const clearHistory = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      await apiClearHistory(userId);
      clearMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    } finally {
      setLoading(false);
    }
  }, [userId, setLoading, setError, clearMessages]);

  /**
   * Set active project for chat context.
   */
  const setProject = useCallback(
    async (code: string) => {
      if (!userId) return;

      setLoading(true);
      try {
        await setProjectForChat(userId, code);
        setProjectCode(code);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set project");
      } finally {
        setLoading(false);
      }
    },
    [userId, setLoading, setError, setProjectCode]
  );

  /**
   * Cancel ongoing streaming request.
   */
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
    clearStreamingContent();
  }, [setStreaming, clearStreamingContent]);

  // Initialize chat when userId changes
  useEffect(() => {
    if (userId) {
      initializeChat();
    }
  }, [userId, initializeChat]);

  return {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    userId,
    projectCode,
    sendMessage,
    clearHistory,
    setProject,
    setUserId,
    cancelStreaming,
    initializeChat,
  };
}
