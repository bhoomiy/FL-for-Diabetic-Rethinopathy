import { DEMO_USERS } from "@/data/demoUsers";
import { delay } from "./apiClient";

const STORAGE_KEY = "fedretina.session";

// Mock login. Replace the body with: apiRequest("/auth/login", { method: "POST", ... })
export async function login({ email, password }) {
  await delay(700);
  const match = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.password === password,
  );
  if (!match) {
    throw new Error("Invalid email or password. Try one of the demo accounts below.");
  }
  const { password: _pw, ...safeUser } = match;
  return { user: safeUser, token: `mock-token-${safeUser.id}` };
}

export function saveSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
