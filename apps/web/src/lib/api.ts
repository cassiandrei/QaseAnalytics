/**
 * API Client for QaseAnalytics Backend
 *
 * Provides functions to communicate with the Hono API backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiError {
  error: string;
  code?: string;
}

export interface SendMessageResponse {
  response: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    toolsUsed?: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    toolsUsed?: string[];
  };
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  sessionId: string;
}

export interface ChatStatusResponse {
  active: boolean;
  projectCode: string | null;
  hasQaseConnection: boolean;
  messageCount: number;
}

/**
 * Send a message to the chat API with SSE streaming support.
 * Falls back to JSON response if SSE is not available.
 *
 * @param message - The user's message
 * @param userId - The user ID
 * @param onChunk - Callback for each streamed chunk
 * @param onComplete - Callback when streaming is complete
 * @param onError - Callback for errors
 */
export async function sendMessageStream(
  message: string,
  userId: string,
  onChunk: (chunk: string) => void,
  onComplete: (metadata?: SendMessageResponse["metadata"]) => void,
  onError: (error: string) => void,
  onToolStart?: (toolName: string) => void,
  onToolEnd?: (toolName: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": userId,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ message, stream: true }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as ApiError;
      onError(errorData.error || "Failed to send message");
      return;
    }

    const contentType = response.headers.get("content-type") || "";

    // Handle JSON response (non-streaming)
    if (contentType.includes("application/json")) {
      const data = await response.json() as {
        success: boolean;
        message?: {
          content: string;
          toolsUsed?: string[];
        };
        error?: string;
      };

      if (!data.success || !data.message) {
        onError(data.error || "Failed to get response");
        return;
      }

      // Emit the full content as a single chunk
      onChunk(data.message.content);
      onComplete({
        toolsUsed: data.message.toolsUsed,
      });
      return;
    }

    // Handle SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      onError("Failed to read response stream");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let metadata: SendMessageResponse["metadata"] | undefined;
    let currentEventType = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        // Hono SSE format: "event: <type>" followed by "data: <json>"
        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
          continue;
        }

        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            onComplete(metadata);
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              type?: string;
              content?: string;
              tool?: string;
              toolsUsed?: string[];
              durationMs?: number;
              error?: string;
              metadata?: SendMessageResponse["metadata"];
            };

            // Use event type from SSE "event:" line, fall back to type in data
            const eventType = currentEventType || parsed.type;

            if (eventType === "chunk" && parsed.content) {
              onChunk(parsed.content);
            } else if (eventType === "tool_start" && parsed.tool) {
              onToolStart?.(parsed.tool);
            } else if (eventType === "tool_end" && parsed.tool) {
              onToolEnd?.(parsed.tool);
            } else if (eventType === "done") {
              metadata = {
                toolsUsed: parsed.toolsUsed,
              };
              onComplete(metadata);
              return;
            } else if (eventType === "metadata" && parsed.metadata) {
              metadata = parsed.metadata;
            } else if (eventType === "error") {
              onError(parsed.error || parsed.content || "Unknown error");
              return;
            }

            // Reset event type after processing
            currentEventType = "";
          } catch {
            // Not JSON, treat as raw chunk
            onChunk(data);
            currentEventType = "";
          }
        }
      }
    }

    onComplete(metadata);
  } catch (error) {
    onError(error instanceof Error ? error.message : "Network error");
  }
}

/**
 * Send a message without streaming (fallback).
 */
export async function sendMessage(
  message: string,
  userId: string
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || "Failed to send message");
  }

  return response.json() as Promise<SendMessageResponse>;
}

/**
 * Get chat history for a user.
 */
export async function getChatHistory(
  userId: string
): Promise<ChatHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
    headers: {
      "X-User-ID": userId,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || "Failed to get chat history");
  }

  return response.json() as Promise<ChatHistoryResponse>;
}

/**
 * Clear chat history for a user.
 */
export async function clearChatHistory(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
    method: "DELETE",
    headers: {
      "X-User-ID": userId,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || "Failed to clear chat history");
  }
}

/**
 * Get chat session status.
 */
export async function getChatStatus(userId: string): Promise<ChatStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat/status`, {
    headers: {
      "X-User-ID": userId,
    },
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || "Failed to get chat status");
  }

  return response.json() as Promise<ChatStatusResponse>;
}

/**
 * Set project for chat context.
 */
export async function setProjectForChat(
  userId: string,
  projectCode: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/project`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-ID": userId,
    },
    body: JSON.stringify({ projectCode }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || "Failed to set project");
  }
}
