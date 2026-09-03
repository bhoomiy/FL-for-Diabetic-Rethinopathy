import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as loginRequest, readSession, saveSession, clearSession } from "@/services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Sessions are restored on the client only (LocalStorage is not available during SSR).
  useEffect(() => {
    setSession(readSession());
    setInitializing(false);
  }, []);

  const signIn = useCallback(async ({ email, password, remember }) => {
    const result = await loginRequest({ email, password });
    const next = { user: result.user, token: result.token };
    setSession(next);
    if (remember) saveSession(next);
    else saveSession(next); // demo sessions always persist so a refresh keeps you signed in
    return next;
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      isAdmin: session?.user?.role === "admin",
      initializing,
      signIn,
      signOut,
    }),
    [session, initializing, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
