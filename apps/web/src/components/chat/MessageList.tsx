"use client";

/**
 * MessageList Component
 *
 * Displays the list of chat messages with auto-scroll functionality.
 */

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage as ChatMessageType } from "../../lib/api";

export interface MessageListProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  isLoading: boolean;
}

export function MessageList({
  messages,
  isStreaming,
  isLoading,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-primary-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Bem-vindo ao QaseAnalytics
        </h3>
        <p className="text-gray-500 max-w-sm mb-6">
          Faça perguntas sobre suas métricas de teste em linguagem natural.
          Eu posso ajudar com análises, comparações e insights.
        </p>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 justify-center max-w-md">
          <SuggestionChip text="Quais projetos eu tenho acesso?" />
          <SuggestionChip text="Qual o pass rate do último test run?" />
          <SuggestionChip text="Liste os casos de teste do projeto GV" />
          <SuggestionChip text="Compare as últimas 3 execuções" />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <svg
            className="animate-spin h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando histórico...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-2"
    >
      {messages.map((message, index) => (
        <ChatMessage
          key={message.id}
          message={message}
          isStreaming={
            isStreaming &&
            message.role === "assistant" &&
            index === messages.length - 1
          }
        />
      ))}

      {/* Typing indicator when waiting for response */}
      {isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1]?.role === "user" && <TypingIndicator />}

      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * Suggestion chip component for empty state.
 */
function SuggestionChip({ text }: { text: string }) {
  return (
    <button
      className="
        px-3 py-2 text-sm text-gray-600 bg-gray-100
        rounded-full hover:bg-gray-200 transition-colors
        border border-gray-200
      "
      type="button"
    >
      {text}
    </button>
  );
}
