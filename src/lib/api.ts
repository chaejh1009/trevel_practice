import type { Session } from "./types";
const KEY = "china-passport-session-v1";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function readSession(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null");
    return value &&
      typeof value.token === "string" &&
      typeof value.sessionId === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function saveSession(value: Session) {
  localStorage.setItem(KEY, JSON.stringify(value));
}
export async function api<T>(
  path: string,
  token?: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      data.error ||
        data.message ||
        data.detail ||
        `요청을 처리하지 못했어요 (${response.status})`,
      response.status,
    );
  return data as T;
}
