import type { NutritionTotals } from "../types/nutrition.js";
import { addTotals, emptyMicronutrients, emptyNutritionTotals } from "../types/nutrition.js";

type NutrientCell = { quantity?: number; label?: string; unit?: string } | Array<{ quantity?: number }>;

type EdamamNutrients = Record<string, NutrientCell>;

function readQty(n: EdamamNutrients, ...keys: string[]): number {
  for (const k of keys) {
    const cell = n[k];
    if (!cell) continue;
    if (Array.isArray(cell)) {
      const q = cell[0]?.quantity;
      if (typeof q === "number" && Number.isFinite(q)) return q;
      continue;
    }
    const q = cell.quantity;
    if (typeof q === "number" && Number.isFinite(q)) return q;
  }
  return 0;
}

/** True if Edamam returned usable energy or macronutrients. */
export function totalsHaveEnergyOrMacros(t: NutritionTotals): boolean {
  return (
    t.calories > 1 ||
    t.protein_g > 0.05 ||
    t.carbs_g > 0.05 ||
    t.fat_g > 0.05
  );
}

function mapTotalNutrients(n: EdamamNutrients, rootCalories?: number): NutritionTotals {
  const base = emptyNutritionTotals();

  base.calories = round(readQty(n, "ENERC_KCAL", "ENERCC_KCAL"));
  if (base.calories <= 0 && typeof rootCalories === "number" && rootCalories > 0) {
    base.calories = round(rootCalories);
  }

  base.protein_g = round(readQty(n, "PROCNT"));
  base.carbs_g = round(readQty(n, "CHOCDF"));
  base.fat_g = round(readQty(n, "FAT"));
  base.fiber_g = round(readQty(n, "FIBTG"));
  base.sugar_g = round(readQty(n, "SUGAR", "SUGAR.added"));
  base.sodium_mg = round(readQty(n, "NA"));

  const m = base.micronutrients;
  m.vitamin_a_mcg = round(readQty(n, "VITA_RAE", "VITAA"));
  m.vitamin_c_mg = round(readQty(n, "VITC"));
  m.vitamin_d_mcg = round(readQty(n, "VITD"));
  m.vitamin_e_mg = round(readQty(n, "TOCPHA"));
  m.vitamin_k_mcg = round(readQty(n, "VITK1"));
  m.thiamin_mg = round(readQty(n, "THIA"));
  m.riboflavin_mg = round(readQty(n, "RIBF"));
  m.niacin_mg = round(readQty(n, "NIA"));
  m.vitamin_b6_mg = round(readQty(n, "VITB6A"));
  m.folate_mcg = round(readQty(n, "FOLDFE", "FOLFD", "FOLAC"));
  m.vitamin_b12_mcg = round(readQty(n, "VITB12"));
  m.calcium_mg = round(readQty(n, "CA"));
  m.iron_mg = round(readQty(n, "FE"));
  m.magnesium_mg = round(readQty(n, "MG"));
  m.phosphorus_mg = round(readQty(n, "P"));
  m.potassium_mg = round(readQty(n, "K"));
  m.zinc_mg = round(readQty(n, "ZN"));

  return base;
}

function parseAnalyzedRecipe(data: unknown): NutritionTotals | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const totalNutrients = o.totalNutrients as EdamamNutrients | undefined;
  const rootCal = typeof o.calories === "number" ? o.calories : Number(o.calories);
  if (!totalNutrients || typeof totalNutrients !== "object") {
    if (Number.isFinite(rootCal) && rootCal > 0) {
      const b = emptyNutritionTotals();
      b.calories = round(rootCal);
      return b;
    }
    return null;
  }
  return mapTotalNutrients(totalNutrients, Number.isFinite(rootCal) ? rootCal : undefined);
}

function hasEdamamCreds(): boolean {
  return Boolean(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY);
}

/** Official multi-ingredient analysis (requires `title` + `ingr` per Edamam OpenAPI). */
export async function postNutritionDetails(ingredients: string[]): Promise<{
  totals: NutritionTotals | null;
  httpStatus: number;
  errorBody: string;
}> {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) {
    return { totals: null, httpStatus: 0, errorBody: "Missing Edamam credentials" };
  }

  const url = new URL("https://api.edamam.com/api/nutrition-details");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Meal log",
      ingr: ingredients,
    }),
  });

  const errorBody = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("Edamam nutrition-details:", res.status, errorBody.slice(0, 500));
    return { totals: null, httpStatus: res.status, errorBody };
  }

  let data: unknown;
  try {
    data = JSON.parse(errorBody) as unknown;
  } catch {
    return { totals: null, httpStatus: res.status, errorBody: "Invalid JSON from Edamam" };
  }

  return { totals: parseAnalyzedRecipe(data), httpStatus: res.status, errorBody: "" };
}

/** Single-line food-logging context (handles items like "1 orange" better than raw recipe mode). */
export async function getNutritionDataLine(ingredientLine: string): Promise<{
  totals: NutritionTotals | null;
  httpStatus: number;
  errorBody: string;
}> {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) {
    return { totals: null, httpStatus: 0, errorBody: "Missing Edamam credentials" };
  }

  const url = new URL("https://api.edamam.com/api/nutrition-data");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("nutrition-type", "logging");
  url.searchParams.set("ingr", ingredientLine);

  const res = await fetch(url.toString());
  const errorBody = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("Edamam nutrition-data:", res.status, errorBody.slice(0, 500));
    return { totals: null, httpStatus: res.status, errorBody };
  }

  let data: unknown;
  try {
    data = JSON.parse(errorBody) as unknown;
  } catch {
    return { totals: null, httpStatus: res.status, errorBody: "Invalid JSON from Edamam" };
  }

  return { totals: parseAnalyzedRecipe(data), httpStatus: res.status, errorBody: "" };
}

/**
 * Try Edamam in order: recipe POST → single-line GET (full text) → sum per-line GET.
 * (Previously used a non-documented v2/nutrients URL that fails silently.)
 */
export async function analyzeIngredientsWithEdamam(
  lines: string[],
  fullTextHint: string
): Promise<NutritionTotals | null> {
  if (!hasEdamamCreds()) return null;

  const cleanLines = lines.map((s) => s.trim()).filter(Boolean);
  if (!cleanLines.length) return null;

  const { totals: a } = await postNutritionDetails(cleanLines.slice(0, 100));
  if (a && totalsHaveEnergyOrMacros(a)) return a;

  const hint = fullTextHint.trim();
  const { totals: b } = await getNutritionDataLine(hint);
  if (b && totalsHaveEnergyOrMacros(b)) return b;

  if (cleanLines.length > 1) {
    let sum = emptyNutritionTotals();
    let any = false;
    for (const line of cleanLines.slice(0, 20)) {
      const { totals: t } = await getNutritionDataLine(line);
      if (t && totalsHaveEnergyOrMacros(t)) {
        sum = addTotals(sum, t);
        any = true;
      }
    }
    if (any && totalsHaveEnergyOrMacros(sum)) return sum;
  }

  return null;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
