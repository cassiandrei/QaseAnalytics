"use client";

/**
 * MessageInput Component
 *
 * Text input for sending chat messages with Enter key support.
 */

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";

export interface MessageInputProps {
  onSend: (message: string) => void;
  isDisabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  isDisabled = false,
  isStreaming = false,
  placeholder = "Digite sua pergunta sobre métricas de teste...",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isDisabled && !isStreaming) {
      onSend(message.trim());
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = message.trim() && !isDisabled && !isStreaming;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 bg-white p-4"
    >
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className="
              w-full resize-none rounded-xl border border-gray-300
              px-4 py-3 pr-12
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-500
              text-gray-800 placeholder-gray-400
              transition-shadow
            "
            style={{ maxHeight: "200px" }}
          />

          {/* Character count (optional, shows when near limit) */}
          {message.length > 800 && (
            <span
              className={`
                absolute right-3 bottom-3 text-xs
                ${message.length > 1000 ? "text-red-500" : "text-gray-400"}
              `}
            >
              {message.length}/1000
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!canSend}
          className={`
            flex-shrink-0 p-3 rounded-xl
            transition-all duration-200
            ${
              canSend
                ? "bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }
          `}
          aria-label="Enviar mensagem"
        >
          {isStreaming ? (
            // Stop icon when streaming
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // Send icon
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Pressione <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd> para enviar ou{" "}
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Shift + Enter</kbd> para nova linha
      </p>
    </form>
  );
}
