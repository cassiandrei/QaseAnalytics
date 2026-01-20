"use client";

/**
 * ChatHeader Component
 *
 * Header section for the chat interface with title and actions.
 *
 * @see US-027: Listar Meus Widgets (navigation link)
 */

import Link from "next/link";

export interface ChatHeaderProps {
  projectCode: string | null;
  onClearHistory: () => void;
  isLoading: boolean;
  messageCount: number;
}

export function ChatHeader({
  projectCode,
  onClearHistory,
  isLoading,
  messageCount,
}: ChatHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Title and status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              QaseAnalytics AI
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span
                className={`
                  w-2 h-2 rounded-full
                  ${isLoading ? "bg-yellow-400 animate-pulse" : "bg-green-400"}
                `}
              />
              <span>
                {isLoading
                  ? "Processando..."
                  : projectCode
                  ? `Projeto: ${projectCode}`
                  : "Online"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Widgets link */}
          <Link
            href="/widgets"
            className="
              flex items-center gap-1.5 px-3 py-1.5 text-sm
              text-gray-600 hover:text-gray-800
              hover:bg-gray-100 rounded-lg
              transition-colors
            "
            title="Meus Widgets"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
            <span className="hidden sm:inline">Widgets</span>
          </Link>

          {messageCount > 0 && (
            <button
              onClick={onClearHistory}
              disabled={isLoading}
              className="
                flex items-center gap-1.5 px-3 py-1.5 text-sm
                text-gray-600 hover:text-gray-800
                hover:bg-gray-100 rounded-lg
                transition-colors disabled:opacity-50
              "
              title="Limpar histórico"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
