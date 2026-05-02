import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
  age: z.coerce.number().int().min(13).max(120),
  gender: z.string().min(1).max(32),
  goal: z.string().min(1).max(64),
  weight_kg: z.coerce.number().positive().max(500),
  height_cm: z.coerce.number().positive().max(300),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const patchProfileSchema = z.object({
  age: z.coerce.number().int().min(13).max(120).optional(),
  gender: z.string().min(1).max(32).optional(),
  goal: z.string().min(1).max(64).optional(),
  weight_kg: z.coerce.number().positive().max(500).optional(),
  height_cm: z.coerce.number().positive().max(300).optional(),
});

export const manualFoodSchema = z.object({
  text: z.string().min(1).max(4000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const dashboardQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const microField = z.coerce.number().min(0).max(500000);

const micronutrientsSchema = z.object({
  vitamin_a_mcg: microField,
  vitamin_c_mg: microField,
  vitamin_d_mcg: microField,
  vitamin_e_mg: microField,
  vitamin_k_mcg: microField,
  thiamin_mg: microField,
  riboflavin_mg: microField,
  niacin_mg: microField,
  vitamin_b6_mg: microField,
  folate_mcg: microField,
  vitamin_b12_mcg: microField,
  calcium_mg: microField,
  iron_mg: microField,
  magnesium_mg: microField,
  phosphorus_mg: microField,
  potassium_mg: microField,
  zinc_mg: microField,
});

export const nutritionGoalsBodySchema = z.object({
  calories: z.coerce.number().min(400).max(20000),
  protein_g: z.coerce.number().min(0).max(800),
  carbs_g: z.coerce.number().min(0).max(1500),
  fat_g: z.coerce.number().min(0).max(800),
  fiber_g: z.coerce.number().min(0).max(200),
  sugar_g: z.coerce.number().min(0).max(1000),
  sodium_mg: z.coerce.number().min(0).max(20000),
  micronutrients: micronutrientsSchema,
});

export const VALID_GOAL_SLUGS = new Set([
  "general",
  "fat_loss",
  "muscle_gain",
  "bulking",
  "endurance",
  "athlete",
  "strength",
  "plant_based",
]);

export function normalizeGoalSlug(input: string): string {
  const s = input.toLowerCase().trim();

  if (s.includes("fat") && s.includes("loss")) return "fat_loss";
  if (s.includes("muscle") && (s.includes("gain") || s.includes("build"))) return "muscle_gain";
  if (s.includes("bulk")) return "bulking";
  if (s.includes("endurance") || s.includes("runner") || s.includes("marathon")) return "endurance";
  if (s.includes("plant") || s.includes("vegan") || s.includes("vegetarian")) return "plant_based";
  if (s.includes("strength") || s.includes("power") || s === "powerlifter") return "strength";
  if (s.includes("athlete")) return "athlete";
  if (s.includes("regular") || s.includes("normal") || s.includes("maintenance") || s === "general") return "general";

  const slug = s.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (VALID_GOAL_SLUGS.has(slug)) return slug;
  return "general";
}
