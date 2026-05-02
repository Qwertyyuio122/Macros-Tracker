import type { NutritionGoals } from "../types/nutrition.js";
import { computeGoalsFromProfile } from "./goalFormulas.js";

export function computeGoalsForProfile(profile: {
  age: number;
  gender: string;
  goal: string;
  weight_kg: number;
  height_cm: number;
}): NutritionGoals {
  return computeGoalsFromProfile(profile);
}
