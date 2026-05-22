import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getMeApi, loginApi, type AuthUser, type UserLoginRequest } from "@/lib/api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: UserLoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMeApi()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("auth-token");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (data: UserLoginRequest) => {
    const res = await loginApi(data);
    localStorage.setItem("auth-token", res.token);
    // Persist role for ProtectedRoute backward-compat
    localStorage.setItem("user-role", res.user.role);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("user-role");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
