// Thin fetch wrapper around the future Flask / FastAPI backend.
// Every service falls back to mock data when the backend is unavailable,
// so the UI always keeps working during the demo.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const { timeoutMs = 6000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// Try the real endpoint first, fall back to mock data when it is not reachable.
export async function withMockFallback(request, mockValue) {
  try {
    const data = await request();
    return { data, source: "api" };
  } catch {
    return { data: await Promise.resolve(mockValue), source: "mock" };
  }
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
