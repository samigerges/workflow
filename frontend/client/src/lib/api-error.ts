export interface ParsedApiError {
  message: string;
  statusCode?: number;
}

function extractMessage(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        const parsedMessage = extractMessage(parsed);
        if (parsedMessage) {
          return parsedMessage;
        }
      } catch {
        // Ignore JSON parse errors and fall back to the raw string
      }
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => extractMessage(item))
      .filter((item): item is string => Boolean(item));

    if (messages.length > 0) {
      return messages.join(", ");
    }

    return undefined;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keysToCheck = ["message", "error", "detail", "title"];

    for (const key of keysToCheck) {
      const maybe = extractMessage(obj[key]);
      if (maybe) {
        return maybe;
      }
    }

    if (obj.errors) {
      const maybeErrors = extractMessage(obj.errors);
      if (maybeErrors) {
        return maybeErrors;
      }
    }
  }

  return undefined;
}

export function parseApiError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred",
): ParsedApiError {
  let statusCode: number | undefined;
  let message = fallbackMessage;

  if (typeof error === "string") {
    const extracted = extractMessage(error);
    if (extracted) {
      message = extracted;
    }
    return { statusCode, message };
  }

  if (typeof error === "object" && error !== null) {
    const anyError = error as Record<string, unknown> & {
      response?: { status?: number; data?: unknown };
      message?: string;
    };

    if (typeof anyError.response?.status === "number") {
      statusCode = anyError.response.status;
    }

    const responseMessage = extractMessage(anyError.response?.data);
    if (responseMessage) {
      return { statusCode, message: responseMessage };
    }

    if (typeof anyError.message === "string") {
      const statusMatch = anyError.message.match(/^(\d{3}):\s*([\s\S]+)$/);
      if (statusMatch) {
        const parsedStatus = Number(statusMatch[1]);
        if (!Number.isNaN(parsedStatus)) {
          statusCode = statusCode ?? parsedStatus;
        }
        const extractedFromBody = extractMessage(statusMatch[2]);
        if (extractedFromBody) {
          message = extractedFromBody;
        }
      } else {
        const extracted = extractMessage(anyError.message);
        if (extracted) {
          message = extracted;
        }
      }

      return { statusCode, message };
    }

    const fallbackFromObject =
      extractMessage(anyError.error) ||
      extractMessage(anyError.detail) ||
      extractMessage(anyError.title);

    if (fallbackFromObject) {
      message = fallbackFromObject;
    }

    return { statusCode, message };
  }

  return { statusCode, message };
}
