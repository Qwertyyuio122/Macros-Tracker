import type { DashboardResponse, NutritionGoals, User } from "../types";

const TOKEN_KEY = "macro_tracker_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  const body = options.body;
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { error?: unknown };
      if (typeof data.error === "string") message = data.error;
      else if (data.error) message = JSON.stringify(data.error);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function register(body: {
  username: string;
  password: string;
  age: number;
  gender: string;
  goal: string;
  weight_kg: number;
  height_cm: number;
}): Promise<{ token: string; user: User; goals: NutritionGoals }> {
  return api("/api/auth/register", { method: "POST", body: JSON.stringify(body) });
}

export async function login(body: {
  username: string;
  password: string;
}): Promise<{ token: string; user: User; goals: NutritionGoals }> {
  return api("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
}

export async function fetchMe(): Promise<{ user: User; goals: NutritionGoals | null }> {
  return api("/api/auth/me");
}

export async function patchProfile(body: Partial<{
  age: number;
  gender: string;
  goal: string;
  weight_kg: number;
  height_cm: number;
}>): Promise<{ user: User; goals: NutritionGoals }> {
  return api("/api/auth/me", { method: "PATCH", body: JSON.stringify(body) });
}

export async function patchGoals(goals: Omit<NutritionGoals, "source">): Promise<{ goals: NutritionGoals }> {
  return api("/api/auth/goals", { method: "PATCH", body: JSON.stringify(goals) });
}

export async function recomputeGoals(): Promise<{ goals: NutritionGoals }> {
  return api("/api/auth/goals/recompute", { method: "POST" });
}

export async function fetchDashboard(date: string): Promise<DashboardResponse> {
  const q = new URLSearchParams({ date });
  return api(`/api/dashboard?${q.toString()}`);
}

export async function logManualFood(text: string, date: string): Promise<unknown> {
  return api("/api/food/manual", {
    method: "POST",
    body: JSON.stringify({ text, date }),
  });
}

export async function logImageFood(file: File, date: string): Promise<unknown> {
  const fd = new FormData();
  fd.append("photo", file);
  fd.append("date", date);
  return api("/api/food/image", { method: "POST", body: fd });
}

export async function deleteFoodEntry(id: number): Promise<void> {
  await api(`/api/food/${id}`, { method: "DELETE" });
}
