export interface MicronutrientTargets {
  vitamin_a_mcg: number;
  vitamin_c_mg: number;
  vitamin_d_mcg: number;
  vitamin_e_mg: number;
  vitamin_k_mcg: number;
  thiamin_mg: number;
  riboflavin_mg: number;
  niacin_mg: number;
  vitamin_b6_mg: number;
  folate_mcg: number;
  vitamin_b12_mcg: number;
  calcium_mg: number;
  iron_mg: number;
  magnesium_mg: number;
  phosphorus_mg: number;
  potassium_mg: number;
  zinc_mg: number;
}

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  micronutrients: MicronutrientTargets;
}

/** source: formula = computed from profile; custom = user-edited targets */
export interface NutritionGoals extends NutritionTotals {
  source: "formula" | "custom";
}

export function emptyNutritionTotals(): NutritionTotals {
  return {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    micronutrients: emptyMicronutrients(),
  };
}

export function emptyMicronutrients(): MicronutrientTargets {
  return {
    vitamin_a_mcg: 0,
    vitamin_c_mg: 0,
    vitamin_d_mcg: 0,
    vitamin_e_mg: 0,
    vitamin_k_mcg: 0,
    thiamin_mg: 0,
    riboflavin_mg: 0,
    niacin_mg: 0,
    vitamin_b6_mg: 0,
    folate_mcg: 0,
    vitamin_b12_mcg: 0,
    calcium_mg: 0,
    iron_mg: 0,
    magnesium_mg: 0,
    phosphorus_mg: 0,
    potassium_mg: 0,
    zinc_mg: 0,
  };
}

export function addTotals(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  const m: MicronutrientTargets = { ...a.micronutrients };
  (Object.keys(m) as (keyof MicronutrientTargets)[]).forEach((k) => {
    m[k] = (a.micronutrients[k] ?? 0) + (b.micronutrients[k] ?? 0);
  });
  return {
    calories: a.calories + b.calories,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: a.fiber_g + b.fiber_g,
    sugar_g: a.sugar_g + b.sugar_g,
    sodium_mg: a.sodium_mg + b.sodium_mg,
    micronutrients: m,
  };
}

/** Normalize legacy stored goals from older app versions. */
export function normalizeStoredGoals(raw: unknown): NutritionGoals {
  const base = emptyNutritionTotals();
  if (!raw || typeof raw !== "object") {
    return { ...base, source: "formula" };
  }
  const o = raw as Record<string, unknown>;
  const microIn = (o.micronutrients as Record<string, unknown> | undefined) ?? {};
  const micro = { ...emptyMicronutrients() };
  (Object.keys(micro) as (keyof MicronutrientTargets)[]).forEach((k) => {
    const v = microIn[k as string];
    const n = typeof v === "number" ? v : Number(v);
    micro[k] = Number.isFinite(n) && n >= 0 ? n : 0;
  });

  const pick = (k: string) => {
    const v = o[k];
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  let source: "formula" | "custom" = "formula";
  if (o.source === "custom") source = "custom";
  if (o.source === "openai") source = "formula";

  return {
    source,
    calories: pick("calories"),
    protein_g: pick("protein_g"),
    carbs_g: pick("carbs_g"),
    fat_g: pick("fat_g"),
    fiber_g: pick("fiber_g"),
    sugar_g: pick("sugar_g"),
    sodium_mg: pick("sodium_mg"),
    micronutrients: micro,
  };
}
