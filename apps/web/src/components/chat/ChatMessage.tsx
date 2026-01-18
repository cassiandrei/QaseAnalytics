"use client";

/**
 * ChatMessage Component
 *
 * Renders a single chat message with visual differentiation
 * between user and assistant messages. Supports markdown rendering.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "../../lib/api";

export interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`
          max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3
          ${
            isUser
              ? "bg-primary-600 text-white rounded-br-md"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
          }
        `}
      >
        {/* Message header */}
        <div
          className={`
            text-xs mb-1 font-medium
            ${isUser ? "text-primary-100" : "text-gray-400"}
          `}
        >
          {isUser ? "Você" : "QaseAnalytics AI"}
        </div>

        {/* Message content */}
        <div
          className={`
            prose prose-sm max-w-none
            ${isUser ? "prose-invert" : "prose-gray"}
          `}
        >
          {isUser ? (
            <p className="m-0 whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom styling for markdown elements
                p: ({ children }) => (
                  <p className="m-0 mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="m-0 mb-2 pl-4 list-disc">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="m-0 mb-2 pl-4 list-decimal">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code
                      className={`
                        block bg-gray-900 text-gray-100 p-3 rounded-lg
                        overflow-x-auto text-sm font-mono
                        ${className}
                      `}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="m-0 mb-2 overflow-x-auto">{children}</pre>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto mb-2">
                    <table className="min-w-full border-collapse border border-gray-300 text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 px-2 py-1">
                    {children}
                  </td>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content || " "}
            </ReactMarkdown>
          )}

          {/* Streaming cursor */}
          {isStreaming && !isUser && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-gray-400 animate-pulse" />
          )}
        </div>

        {/* Timestamp */}
        <div
          className={`
            text-xs mt-2
            ${isUser ? "text-primary-200" : "text-gray-400"}
          `}
        >
          {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        {/* Metadata for assistant messages */}
        {!isUser && message.metadata?.toolsUsed && message.metadata.toolsUsed.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-1">
              {message.metadata.toolsUsed.map((tool, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
