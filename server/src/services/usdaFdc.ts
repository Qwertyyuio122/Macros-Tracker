import type { NutritionTotals } from "../types/nutrition.js";
import { emptyMicronutrients, emptyNutritionTotals } from "../types/nutrition.js";

type MacroKey = "calories" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g" | "sugar_g" | "sodium_mg";
type MicroKey = keyof ReturnType<typeof emptyMicronutrients>;

/** FDC nutrient.id (stable) → app field; amounts from FDC are per 100 g for Survey/SR/Foundation foods. */
const NUTRIENT_MAP: Record<number, MacroKey | MicroKey> = {
  1008: "calories",
  1003: "protein_g",
  1005: "carbs_g",
  1004: "fat_g",
  1079: "fiber_g",
  2000: "sugar_g",
  1093: "sodium_mg",
  1106: "vitamin_a_mcg",
  1162: "vitamin_c_mg",
  1114: "vitamin_d_mcg",
  1109: "vitamin_e_mg",
  1185: "vitamin_k_mcg",
  1165: "thiamin_mg",
  1166: "riboflavin_mg",
  1167: "niacin_mg",
  1175: "vitamin_b6_mg",
  1190: "folate_mcg",
  1178: "vitamin_b12_mcg",
  1087: "calcium_mg",
  1089: "iron_mg",
  1086: "magnesium_mg",
  1091: "phosphorus_mg",
  1092: "potassium_mg",
  1095: "zinc_mg",
};

function apiKey(): string {
  return process.env.USDA_API_KEY?.trim() || "DEMO_KEY";
}

function foodSearchQuery(line: string): string {
  return line
    .toLowerCase()
    .replace(/\b\d+(?:\.\d+)?\b/g, " ")
    .replace(
      /\b(g|gram|grams|kg|ml|l|liter|liters|oz|ounce|ounces|cup|cups|tbsp|tablespoons?|tsp|teaspoons?|slice|slices|piece|pieces|serving|servings|bowl|plate|can|packet|scoop|scoops|large|medium|small|half|quarter)\b/g,
      " "
    )
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Grams to scale per-100g nutrient amounts. */
function inferGramsForUserLine(line: string): number {
  const t = line.trim();
  const gMatch = t.match(/^([\d.]+)\s*(g|grams?)\b/i);
  if (gMatch?.[1]) return Math.max(1, parseFloat(gMatch[1]));
  const kg = t.match(/^([\d.]+)\s*kg\b/i);
  if (kg?.[1]) return Math.max(1, parseFloat(kg[1]) * 1000);
  const oz = t.match(/^([\d.]+)\s*(oz|ounces?)\b/i);
  if (oz?.[1]) return Math.max(1, parseFloat(oz[1]) * 28.3495);

  const onePiece = t.match(/^\s*1\s+(oranges?|apples?|bananas?)\b/i);
  if (onePiece?.[1]) {
    const w = onePiece[1].toLowerCase();
    if (w.startsWith("orange")) return 131;
    if (w.startsWith("apple")) return 182;
    if (w.startsWith("banana")) return 126;
  }
  return 100;
}

type FoodNutrientRow = {
  nutrient?: { id?: number };
  nutrientId?: number;
  amount?: number;
  value?: number;
};

function readNutrientId(row: FoodNutrientRow): number | undefined {
  const nested = row.nutrient?.id;
  if (typeof nested === "number" && Number.isFinite(nested)) return nested;
  const top = row.nutrientId;
  if (typeof top === "number" && Number.isFinite(top)) return top;
  return undefined;
}

function readNutrientAmount(row: FoodNutrientRow): number | undefined {
  if (typeof row.amount === "number" && Number.isFinite(row.amount)) return row.amount;
  if (typeof row.value === "number" && Number.isFinite(row.value)) return row.value;
  return undefined;
}

function mapFoodNutrientsToTotalsPer100g(rows: FoodNutrientRow[]): NutritionTotals {
  const byId = new Map<number, number>();
  for (const row of rows) {
    const id = readNutrientId(row);
    const amt = readNutrientAmount(row);
    if (typeof id !== "number" || typeof amt !== "number" || !Number.isFinite(amt)) continue;
    if (!byId.has(id)) byId.set(id, amt);
    else if (amt !== 0) byId.set(id, amt);
  }

  const out = emptyNutritionTotals();
  const micro = { ...emptyMicronutrients() };

  for (const [id, amt] of byId) {
    const key = NUTRIENT_MAP[id];
    if (!key) continue;
    if (key === "calories") out.calories = amt;
    else if (key === "protein_g") out.protein_g = amt;
    else if (key === "carbs_g") out.carbs_g = amt;
    else if (key === "fat_g") out.fat_g = amt;
    else if (key === "fiber_g") out.fiber_g = amt;
    else if (key === "sugar_g") out.sugar_g = amt;
    else if (key === "sodium_mg") out.sodium_mg = amt;
    else micro[key] = amt;
  }

  out.micronutrients = micro;
  return out;
}

function scaleFrom100g(t: NutritionTotals, grams: number): NutritionTotals {
  const f = grams / 100;
  const m = { ...t.micronutrients };
  (Object.keys(m) as MicroKey[]).forEach((k) => {
    m[k] = round((m[k] ?? 0) * f);
  });
  return {
    calories: round(t.calories * f),
    protein_g: round(t.protein_g * f),
    carbs_g: round(t.carbs_g * f),
    fat_g: round(t.fat_g * f),
    fiber_g: round(t.fiber_g * f),
    sugar_g: round(t.sugar_g * f),
    sodium_mg: round(t.sodium_mg * f),
    micronutrients: m,
  };
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

const SINGLE_PRODUCE_WORDS = new Set(["apple", "orange", "banana"]);
const PREPARED_FOOD_WORDS = [
  "baked",
  "candied",
  "canned",
  "cider",
  "cobbler",
  "crisp",
  "dried",
  "drink",
  "fried",
  "juice",
  "peel",
  "pie",
  "sauce",
  "zest",
];

function wordsForRanking(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/s$/, ""))
    .filter((w) => w.length > 2);
}

function wordInText(word: string, text: string): boolean {
  return new RegExp(`\\b${word}s?\\b`, "i").test(text);
}

function scoreFdcFood(
  food: SearchFood,
  query: string,
  queryWords: string[],
  singleProduceWord: string | undefined
): number {
  if (typeof food.fdcId !== "number") return Number.NEGATIVE_INFINITY;

  const description = (food.description ?? "").toLowerCase();
  if (!description) return Number.NEGATIVE_INFINITY;

  let score = 0;
  for (const word of queryWords) {
    if (wordInText(word, description)) score += 12;
  }

  if (description === query) score += 4;
  if (singleProduceWord && (description.includes(`${singleProduceWord}, raw`) || description.includes(`raw ${singleProduceWord}`))) {
    score += 90;
  }

  const dataType = (food.dataType ?? "").toLowerCase();
  if (dataType.includes("survey")) score += 30;
  else if (dataType.includes("foundation")) score += 24;
  else if (dataType.includes("sr legacy")) score += 18;
  else if (dataType.includes("branded")) score -= 12;

  for (const word of PREPARED_FOOD_WORDS) {
    if (wordInText(word, description) && !wordInText(word, query)) score -= 35;
  }

  return score;
}

function pickFdcId(foods: SearchFood[], query: string): number | undefined {
  const q = query.toLowerCase();
  const queryWords = wordsForRanking(q);
  const singleProduceWord =
    queryWords.length === 1 && SINGLE_PRODUCE_WORDS.has(queryWords[0] ?? "")
      ? queryWords[0]
      : undefined;

  return [...foods]
    .sort((a, b) => scoreFdcFood(b, q, queryWords, singleProduceWord) - scoreFdcFood(a, q, queryWords, singleProduceWord))
    .find((f) => typeof f.fdcId === "number")?.fdcId;
}

async function usdaFetch(url: string, init?: RequestInit): Promise<Response> {
  let delayMs = 700;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, init);
    if (res.status !== 429 && res.status !== 503) return res;
    if (attempt === 5) return res;
    await new Promise((r) => setTimeout(r, delayMs));
    delayMs = Math.min(delayMs * 2, 15000);
  }
  throw new Error("unreachable");
}

type SearchFood = { fdcId?: number; description?: string; dataType?: string };

async function searchFdcFoods(query: string, key: string): Promise<SearchFood[]> {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return [];

  const postUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`;
  const postBody = {
    query: q,
    pageSize: 15,
    dataType: ["Survey (FNDDS)", "Foundation", "SR Legacy", "Branded"],
  };

  const sRes = await usdaFetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postBody),
  });
  const raw = await sRes.text();
  let sJson: { error?: { code?: string; message?: string }; foods?: SearchFood[] };
  try {
    sJson = JSON.parse(raw) as typeof sJson;
  } catch {
    console.error("USDA search: invalid JSON", sRes.status, raw.slice(0, 240));
    return [];
  }
  if (sJson.error) {
    console.error("USDA search:", sJson.error.code, sJson.error.message ?? "");
  }
  if (sRes.ok && Array.isArray(sJson.foods) && sJson.foods.length) {
    return sJson.foods;
  }

  const searchUrl = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  searchUrl.searchParams.set("api_key", key);
  searchUrl.searchParams.set("query", q);
  searchUrl.searchParams.set("pageSize", "10");
  for (const dt of ["Survey (FNDDS)", "Foundation", "SR Legacy", "Branded"]) {
    searchUrl.searchParams.append("dataType", dt);
  }
  const gRes = await usdaFetch(searchUrl.toString());
  const gRaw = await gRes.text();
  try {
    sJson = JSON.parse(gRaw) as typeof sJson;
  } catch {
    console.error("USDA search (GET): invalid JSON", gRes.status, gRaw.slice(0, 240));
    return [];
  }
  if (!gRes.ok) {
    console.error("USDA search (GET):", gRes.status, gRaw.slice(0, 300));
    return [];
  }
  if (sJson.error) {
    console.error("USDA search (GET):", sJson.error.code, sJson.error.message ?? "");
  }
  return Array.isArray(sJson.foods) ? sJson.foods : [];
}

/** USDA FoodData Central: search + first reasonable hit + per-100g nutrients scaled to inferred portion. */
export async function analyzeLineWithUSDA(userLine: string): Promise<NutritionTotals | null> {
  const key = apiKey();
  const q = userLine.trim().replace(/\s+/g, " ");
  if (!q) return null;

  const searchQuery = foodSearchQuery(q) || q;
  const foods = await searchFdcFoods(searchQuery, key);
  const fdcId = pickFdcId(foods, searchQuery);
  if (!fdcId) return null;

  const foodUrl = new URL(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}`);
  foodUrl.searchParams.set("api_key", key);

  const fRes = await usdaFetch(foodUrl.toString());
  const fRaw = await fRes.text();
  if (!fRes.ok) {
    console.error("USDA food:", fRes.status, fRaw.slice(0, 300));
    return null;
  }

  let food: { foodNutrients?: FoodNutrientRow[] };
  try {
    food = JSON.parse(fRaw) as typeof food;
  } catch {
    console.error("USDA food: invalid JSON");
    return null;
  }

  const rows = food.foodNutrients ?? [];
  const per100 = mapFoodNutrientsToTotalsPer100g(rows);
  const grams = inferGramsForUserLine(q);
  return scaleFrom100g(per100, grams);
}
