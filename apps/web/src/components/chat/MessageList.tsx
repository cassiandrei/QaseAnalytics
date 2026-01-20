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
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-sm">
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Bem-vindo ao QaseAnalytics
        </h3>
        <p className="text-gray-500 max-w-md mb-8 text-sm sm:text-base leading-relaxed">
          Faça perguntas sobre suas métricas de teste em linguagem natural.
          Eu posso ajudar com análises, comparações e insights.
        </p>

        {/* Suggestion chips */}
        <div className="flex flex-col gap-2 w-full max-w-lg px-2">
          <SuggestionChip
            text="Quais projetos eu tenho acesso?"
            onClick={onSendMessage}
            icon="search"
          />
          <SuggestionChip
            text="Mostre um gráfico donut com a distribuição de status dos testes"
            onClick={onSendMessage}
            icon="pie"
          />
          <SuggestionChip
            text="Crie um gráfico de barras horizontais dos testes por projeto"
            onClick={onSendMessage}
            icon="bar"
          />
          <SuggestionChip
            text="Gere um gráfico de linha com a evolução do pass rate"
            onClick={onSendMessage}
            icon="line"
          />
          <SuggestionChip
            text="Compare os resultados em um gráfico de barras empilhadas"
            onClick={onSendMessage}
            icon="stacked"
          />
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
  icon,
}: {
  text: string;
  onClick?: (message: string) => void;
  icon?: "search" | "pie" | "bar" | "line" | "stacked";
}) {
  return (
    <button
      className="
        w-full px-4 py-3 text-sm text-left text-gray-700 bg-white
        rounded-xl hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200
        transition-all duration-200 border border-gray-200
        cursor-pointer active:scale-[0.98] shadow-sm hover:shadow
        flex items-center gap-3
      "
      type="button"
      onClick={() => onClick?.(text)}
    >
      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-600">
        {icon === "search" && <SearchIcon />}
        {icon === "pie" && <PieIcon />}
        {icon === "bar" && <BarIcon />}
        {icon === "line" && <LineIcon />}
        {icon === "stacked" && <StackedIcon />}
      </span>
      <span className="flex-1">{text}</span>
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// Icons for suggestion chips
function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PieIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  );
}

function BarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  );
}

function StackedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}
