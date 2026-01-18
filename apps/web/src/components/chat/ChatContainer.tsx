"use client";

/**
 * ChatContainer Component
 *
 * Main container that orchestrates all chat components.
 */

import { useEffect, useCallback } from "react";
import { useChat } from "../../hooks/use-chat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export interface ChatContainerProps {
  userId?: string;
}

export function ChatContainer({ userId: propUserId }: ChatContainerProps) {
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    userId,
    projectCode,
    sendMessage,
    clearHistory,
    setUserId,
  } = useChat();

  // Set userId from props or generate a demo one
  useEffect(() => {
    if (propUserId) {
      setUserId(propUserId);
    } else if (!userId) {
      // For demo purposes, use a fixed test user ID
      // In production, this would come from authentication
      setUserId("test-user");
    }
  }, [propUserId, userId, setUserId]);

  const handleSend = useCallback(
    (message: string) => {
      sendMessage(message);
    },
    [sendMessage]
  );

  const handleClearHistory = useCallback(() => {
    if (window.confirm("Tem certeza que deseja limpar o histórico de chat?")) {
      clearHistory();
    }
  }, [clearHistory]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <ChatHeader
        projectCode={projectCode}
        onClearHistory={handleClearHistory}
        isLoading={isLoading || isStreaming}
        messageCount={messages.length}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Messages area */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        isLoading={isLoading}
        onSendMessage={handleSend}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        isDisabled={isLoading || !userId}
        isStreaming={isStreaming}
      />
    </div>
  );
}
