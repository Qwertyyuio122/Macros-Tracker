import { Router } from "express";
import type { AuthedRequest } from "../middleware/requireUser.js";
import { requireUser } from "../middleware/requireUser.js";
import { db } from "../db.js";
import { dashboardQuerySchema } from "../validation.js";
import type { NutritionGoals } from "../types/nutrition.js";
import { normalizeStoredGoals } from "../types/nutrition.js";
import type { NutritionTotals } from "../types/nutrition.js";
import { addTotals, emptyNutritionTotals } from "../types/nutrition.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireUser, (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const parsed = dashboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const date = parsed.data.date ?? utcToday();

  const goalsRow = db.prepare("SELECT goals_json FROM nutrition_goals WHERE user_id = ?").get(userId) as
    | { goals_json: string }
    | undefined;

  if (!goalsRow) {
    res.status(404).json({ error: "Goals not found" });
    return;
  }

  const goals = normalizeStoredGoals(JSON.parse(goalsRow.goals_json));

  const rows = db
    .prepare(
      `SELECT id, entry_date, source, description, nutrients_json, created_at FROM food_entries
       WHERE user_id = ? AND entry_date = ?
       ORDER BY created_at ASC`
    )
    .all(userId, date) as Array<{
    id: number;
    entry_date: string;
    source: string;
    description: string | null;
    nutrients_json: string;
    created_at: string;
  }>;

  let consumed = emptyNutritionTotals();
  const entries = rows.map((r) => {
    const nutrients = JSON.parse(r.nutrients_json) as NutritionTotals;
    consumed = addTotals(consumed, nutrients);
    return {
      id: r.id,
      entry_date: r.entry_date,
      source: r.source,
      description: r.description,
      nutrients,
      created_at: r.created_at,
    };
  });

  res.json({
    date,
    goals,
    consumed,
    entries,
  });
});

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}
