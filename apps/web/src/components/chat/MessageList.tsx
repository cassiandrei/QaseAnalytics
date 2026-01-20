"use client";

/**
 * MessageList Component
 *
 * Displays the list of chat messages with auto-scroll functionality.
 *
 * @see US-026: Salvar Gráfico como Widget
 */

import { useEffect, useRef, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage as ChatMessageType } from "../../lib/api";
import type { SaveWidgetData } from "./SaveWidgetModal";

export interface MessageListProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  isLoading: boolean;
  onSendMessage?: (message: string) => void;
  onSaveWidget?: (data: SaveWidgetData) => Promise<void>;
}

export function MessageList({
  messages,
  isStreaming,
  isLoading,
  onSendMessage,
  onSaveWidget,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Map of assistant message index to the previous user query
  const userQueryMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 0; i < messages.length; i++) {
      const currentMsg = messages[i];
      if (currentMsg?.role === "assistant" && i > 0) {
        // Find the most recent user message before this assistant message
        for (let j = i - 1; j >= 0; j--) {
          const prevMsg = messages[j];
          if (prevMsg?.role === "user" && prevMsg.content) {
            map.set(i, prevMsg.content);
            break;
          }
        }
      }
    }
    return map;
  }, [messages]);

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
          <SuggestionChip text="Quais projetos eu tenho acesso?" onClick={onSendMessage} />
          <SuggestionChip text="Mostre um gráfico donut com a distribuição de status dos testes" onClick={onSendMessage} />
          <SuggestionChip text="Crie um gráfico de barras horizontais dos testes por projeto" onClick={onSendMessage} />
          <SuggestionChip text="Gere um gráfico de linha com a evolução do pass rate" onClick={onSendMessage} />
          <SuggestionChip text="Compare os resultados em um gráfico de barras empilhadas" onClick={onSendMessage} />
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
          userQuery={message.role === "assistant" ? userQueryMap.get(index) : undefined}
          onSaveWidget={onSaveWidget}
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
function SuggestionChip({
  text,
  onClick,
}: {
  text: string;
  onClick?: (message: string) => void;
}) {
  return (
    <button
      className="
        px-3 py-2 text-sm text-gray-600 bg-gray-100
        rounded-full hover:bg-gray-200 hover:text-gray-900
        transition-colors border border-gray-200
        cursor-pointer active:scale-95
      "
      type="button"
      onClick={() => onClick?.(text)}
    >
      {text}
    </button>
  );
}
