import type { MicronutrientTargets, NutritionGoals } from "../types/nutrition.js";

/**
 * Personalized energy targets use the Mifflin–St Jeor equation (public health / clinical standard for resting energy).
 * Protein g/kg choices sit within ranges commonly cited for general adults through trained athletes
 * (e.g., U.S./Canadian DRI adult protein RDA ~0.8 g/kg/d; higher intakes often used in sport nutrition contexts).
 * This file does not fabricate micronutrient targets beyond established adult Daily Values / RDA-style defaults.
 */

export type UserGoalType =
  | "general"
  | "fat_loss"
  | "muscle_gain"
  | "bulking"
  | "endurance"
  | "athlete"
  | "strength"
  | "plant_based";

const ALL_GOALS: UserGoalType[] = [
  "general",
  "fat_loss",
  "muscle_gain",
  "bulking",
  "endurance",
  "athlete",
  "strength",
  "plant_based",
];

function mifflinBmr(weightKg: number, heightCm: number, age: number, gender: string): number {
  const g = gender.toLowerCase();
  const s = g === "male" || g === "m" ? 5 : g === "female" || g === "f" ? -161 : -78;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

/** Moderate activity default (user can override via custom calorie goal). */
function activityFactor(): number {
  return 1.55;
}

function goalToProteinGPerKg(goal: UserGoalType): number {
  switch (goal) {
    case "fat_loss":
      return 1.8;
    case "muscle_gain":
      return 1.6;
    case "bulking":
      return 1.6;
    case "strength":
      return 1.7;
    case "athlete":
      return 1.5;
    case "endurance":
      return 1.3;
    case "plant_based":
      return 1.1;
    case "general":
    default:
      return 1.1;
  }
}

function goalToFatPctCalories(goal: UserGoalType): number {
  switch (goal) {
    case "fat_loss":
      return 0.3;
    case "endurance":
      return 0.25;
    case "bulking":
      return 0.25;
    default:
      return 0.28;
  }
}

function calorieMultiplier(goal: UserGoalType): number {
  switch (goal) {
    case "fat_loss":
      return 0.85;
    case "muscle_gain":
      return 1.07;
    case "bulking":
      return 1.1;
    default:
      return 1.0;
  }
}

/** FDA Daily Values / NIH-style adult reference targets for label comparison (not a medical prescription). */
function defaultMicronutrientTargets(gender: string): MicronutrientTargets {
  const isFemale = /^(f|female|w|woman)$/i.test(gender.trim());
  return {
    vitamin_a_mcg: 900,
    vitamin_c_mg: 90,
    vitamin_d_mcg: 20,
    vitamin_e_mg: 15,
    vitamin_k_mcg: 120,
    thiamin_mg: 1.2,
    riboflavin_mg: 1.3,
    niacin_mg: 16,
    vitamin_b6_mg: 1.7,
    folate_mcg: 400,
    vitamin_b12_mcg: 2.4,
    calcium_mg: 1300,
    iron_mg: isFemale ? 18 : 8,
    magnesium_mg: isFemale ? 320 : 420,
    phosphorus_mg: 1250,
    potassium_mg: 4700,
    zinc_mg: isFemale ? 8 : 11,
  };
}

export function slugToGoalType(slug: string): UserGoalType {
  const g = slug.toLowerCase().trim() as UserGoalType;
  return ALL_GOALS.includes(g) ? g : "general";
}

export function computeGoalsFromProfile(input: {
  age: number;
  gender: string;
  goal: string;
  weight_kg: number;
  height_cm: number;
}): NutritionGoals {
  const safeGoal = slugToGoalType(input.goal);

  const bmr = mifflinBmr(input.weight_kg, input.height_cm, input.age, input.gender);
  const tdee = bmr * activityFactor();
  const targetCalories = Math.round(tdee * calorieMultiplier(safeGoal));

  const proteinG = Math.round(input.weight_kg * goalToProteinGPerKg(safeGoal) * 10) / 10;
  const fatCal = targetCalories * goalToFatPctCalories(safeGoal);
  const fatG = Math.max(0, Math.round((fatCal / 9) * 10) / 10);
  const proteinCal = proteinG * 4;
  const remaining = Math.max(0, targetCalories - proteinCal - fatG * 9);
  const carbsG = Math.max(0, Math.round((remaining / 4) * 10) / 10);
  const fiberG = Math.round(14 * (targetCalories / 1000));
  const sugarG = Math.round(targetCalories * 0.1 / 4);
  const sodiumMg = 2300;

  return {
    source: "formula",
    calories: targetCalories,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
    fiber_g: fiberG,
    sugar_g: sugarG,
    sodium_mg: sodiumMg,
    micronutrients: defaultMicronutrientTargets(input.gender),
  };
}
