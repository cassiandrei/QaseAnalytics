/**
 * Zustand Store for Chat State Management
 *
 * Manages chat messages, loading states, and user interactions.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "../lib/api";

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  userId: string;
  projectCode: string | null;

  // Actions
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamingContent: (chunk: string) => void;
  clearStreamingContent: () => void;
  setError: (error: string | null) => void;
  setUserId: (userId: string) => void;
  setProjectCode: (projectCode: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isLoading: false,
      isStreaming: false,
      streamingContent: "",
      error: null,
      userId: "",
      projectCode: null,

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      updateLastMessage: (content) =>
        set((state) => {
          const messages = [...state.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage) {
            messages[messages.length - 1] = {
              ...lastMessage,
              content,
            };
          }
          return { messages };
        }),

      setMessages: (messages) => set({ messages }),

      clearMessages: () => set({ messages: [], error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setStreaming: (isStreaming) => set({ isStreaming }),

      appendStreamingContent: (chunk) =>
        set((state) => ({
          streamingContent: state.streamingContent + chunk,
        })),

      clearStreamingContent: () => set({ streamingContent: "" }),

      setError: (error) => set({ error }),

      setUserId: (userId) => set({ userId }),

      setProjectCode: (projectCode) => set({ projectCode }),
    }),
    {
      name: "qase-analytics-chat",
      partialize: (state) => ({
        userId: state.userId,
        projectCode: state.projectCode,
      }),
    }
  )
);
