import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "../api/client";
import type { NutritionGoals, User } from "../types";

type AuthState = {
  user: User | null;
  goals: NutritionGoals | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    age: number;
    gender: string;
    goal: string;
    weight_kg: number;
    height_cm: number;
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setSession: (user: User, goals: NutritionGoals | null) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const t = api.getToken();
    if (!t) {
      setUser(null);
      setGoals(null);
      return;
    }
    const data = await api.fetchMe();
    setUser(data.user);
    setGoals(data.goals);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!api.getToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.fetchMe();
        if (cancelled) return;
        setUser(data.user);
        setGoals(data.goals);
      } catch {
        api.clearToken();
        setUser(null);
        setGoals(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login({ username, password });
    api.setToken(res.token);
    setUser(res.user);
    setGoals(res.goals);
  }, []);

  const register = useCallback(
    async (payload: {
      username: string;
      password: string;
      age: number;
      gender: string;
      goal: string;
      weight_kg: number;
      height_cm: number;
    }) => {
      const res = await api.register(payload);
      api.setToken(res.token);
      setUser(res.user);
      setGoals(res.goals);
    },
    []
  );

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setGoals(null);
  }, []);

  const setSession = useCallback((u: User, g: NutritionGoals | null) => {
    setUser(u);
    setGoals(g);
  }, []);

  const value = useMemo(
    () => ({
      user,
      goals,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      setSession,
    }),
    [user, goals, loading, login, register, logout, refreshProfile, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
