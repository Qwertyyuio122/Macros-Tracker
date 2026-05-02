import { Router } from "express";
import bcrypt from "bcrypt";
import type { AuthedRequest } from "../middleware/requireUser.js";
import { requireUser } from "../middleware/requireUser.js";
import { signToken } from "../auth/jwt.js";
import { db } from "../db.js";
import {
  loginSchema,
  normalizeGoalSlug,
  nutritionGoalsBodySchema,
  patchProfileSchema,
  registerSchema,
} from "../validation.js";
import { computeGoalsForProfile } from "../services/goalsService.js";
import type { NutritionGoals } from "../types/nutrition.js";
import { normalizeStoredGoals } from "../types/nutrition.js";

const BCRYPT_ROUNDS = 12;

export const authRouter = Router();

function readGoals(userId: number): NutritionGoals | null {
  const goalsRow = db.prepare("SELECT goals_json FROM nutrition_goals WHERE user_id = ?").get(userId) as
    | { goals_json: string }
    | undefined;
  if (!goalsRow) return null;
  try {
    return normalizeStoredGoals(JSON.parse(goalsRow.goals_json));
  } catch {
    return null;
  }
}

function writeGoals(userId: number, goals: NutritionGoals): void {
  db.prepare(
    `INSERT INTO nutrition_goals (user_id, goals_json, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET goals_json = excluded.goals_json, updated_at = datetime('now')`
  ).run(userId, JSON.stringify(goals));
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  const goalSlug = normalizeGoalSlug(body.goal);

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(body.username) as
    | { id: number }
    | undefined;
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const password_hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

  const insert = db.prepare(
    `INSERT INTO users (username, password_hash, age, gender, goal, weight_kg, height_cm)
     VALUES (@username, @password_hash, @age, @gender, @goal, @weight_kg, @height_cm)`
  );

  const info = insert.run({
    username: body.username,
    password_hash,
    age: body.age,
    gender: body.gender,
    goal: goalSlug,
    weight_kg: body.weight_kg,
    height_cm: body.height_cm,
  });

  const userId = Number(info.lastInsertRowid);
  const goals = computeGoalsForProfile({
    age: body.age,
    gender: body.gender,
    goal: goalSlug,
    weight_kg: body.weight_kg,
    height_cm: body.height_cm,
  });

  writeGoals(userId, goals);

  const token = signToken({ sub: userId, username: body.username });

  res.status(201).json({
    token,
    user: {
      id: userId,
      username: body.username,
      age: body.age,
      gender: body.gender,
      goal: goalSlug,
      weight_kg: body.weight_kg,
      height_cm: body.height_cm,
    },
    goals,
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { username, password } = parsed.data;

  const row = db
    .prepare(
      `SELECT id, username, password_hash, age, gender, goal, weight_kg, height_cm FROM users WHERE username = ?`
    )
    .get(username) as
    | {
        id: number;
        username: string;
        password_hash: string;
        age: number;
        gender: string;
        goal: string;
        weight_kg: number;
        height_cm: number;
      }
    | undefined;

  if (!row) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  let goals = readGoals(row.id);
  if (!goals) {
    goals = computeGoalsForProfile({
      age: row.age,
      gender: row.gender,
      goal: row.goal,
      weight_kg: row.weight_kg,
      height_cm: row.height_cm,
    });
    writeGoals(row.id, goals);
  }

  const token = signToken({ sub: row.id, username: row.username });

  res.json({
    token,
    user: {
      id: row.id,
      username: row.username,
      age: row.age,
      gender: row.gender,
      goal: row.goal,
      weight_kg: row.weight_kg,
      height_cm: row.height_cm,
    },
    goals,
  });
});

authRouter.get("/me", requireUser, (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const row = db
    .prepare(
      `SELECT id, username, age, gender, goal, weight_kg, height_cm FROM users WHERE id = ?`
    )
    .get(userId) as
    | {
        id: number;
        username: string;
        age: number;
        gender: string;
        goal: string;
        weight_kg: number;
        height_cm: number;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const goals = readGoals(userId);

  res.json({ user: row, goals });
});

authRouter.patch("/me", requireUser, (req: AuthedRequest, res) => {
  const parsed = patchProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = req.userId!;
  const body = parsed.data;

  const row = db
    .prepare(
      `SELECT id, username, age, gender, goal, weight_kg, height_cm FROM users WHERE id = ?`
    )
    .get(userId) as
    | {
        id: number;
        username: string;
        age: number;
        gender: string;
        goal: string;
        weight_kg: number;
        height_cm: number;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const next = {
    age: body.age ?? row.age,
    gender: body.gender ?? row.gender,
    goal: body.goal ? normalizeGoalSlug(body.goal) : row.goal,
    weight_kg: body.weight_kg ?? row.weight_kg,
    height_cm: body.height_cm ?? row.height_cm,
  };

  db.prepare(
    `UPDATE users SET age = ?, gender = ?, goal = ?, weight_kg = ?, height_cm = ? WHERE id = ?`
  ).run(next.age, next.gender, next.goal, next.weight_kg, next.height_cm, userId);

  const current = readGoals(userId);
  let goals: NutritionGoals;
  if (current?.source === "custom") {
    goals = current;
  } else {
    goals = computeGoalsForProfile({
      age: next.age,
      gender: next.gender,
      goal: next.goal,
      weight_kg: next.weight_kg,
      height_cm: next.height_cm,
    });
    writeGoals(userId, goals);
  }

  res.json({
    user: {
      id: userId,
      username: row.username,
      ...next,
    },
    goals,
  });
});

authRouter.patch("/goals", requireUser, (req: AuthedRequest, res) => {
  const parsed = nutritionGoalsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const userId = req.userId!;
  const goals: NutritionGoals = { ...parsed.data, source: "custom" };
  writeGoals(userId, goals);
  res.json({ goals });
});

authRouter.post("/goals/recompute", requireUser, (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const row = db
    .prepare(`SELECT age, gender, goal, weight_kg, height_cm FROM users WHERE id = ?`)
    .get(userId) as
    | { age: number; gender: string; goal: string; weight_kg: number; height_cm: number }
    | undefined;

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const goals = computeGoalsForProfile({
    age: row.age,
    gender: row.gender,
    goal: row.goal,
    weight_kg: row.weight_kg,
    height_cm: row.height_cm,
  });
  writeGoals(userId, goals);
  res.json({ goals });
});
