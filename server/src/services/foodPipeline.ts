import type { NutritionTotals } from "../types/nutrition.js";
import { addTotals, emptyNutritionTotals } from "../types/nutrition.js";
import { analyzeIngredientsWithEdamam, totalsHaveEnergyOrMacros } from "./edamam.js";
import { parseMealImageToIngredientsGemini, parseMealTextToIngredientsGemini } from "./geminiVision.js";
import { parseMealImageToIngredients, parseMealTextToIngredients } from "./openaiNutrition.js";
import { analyzeLineWithUSDA } from "./usdaFdc.js";

export type FoodAnalysisMeta = {
  method: "edamam" | "usda" | "edamam+usda";
  ingredient_lines: string[];
};

export class FoodEstimationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "FoodEstimationError";
  }
}

function hasEdamamCreds(): boolean {
  return Boolean(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY);
}

function splitIngredients(text: string): string[] {
  return text
    .split(/\n|;|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

const NON_FOOD_PHRASES = [
  "hi",
  "hey",
  "hello",
  "yo",
  "sup",
  "how are you",
  "what's up",
  "whats up",
  "thank you",
  "thanks",
  "test",
  "asdf",
  "asdfasdf",
];

const COMMON_FOOD_WORDS = new Set([
  "almond",
  "apple",
  "avocado",
  "bacon",
  "banana",
  "bean",
  "beef",
  "berry",
  "bread",
  "broccoli",
  "burger",
  "carrot",
  "cereal",
  "cheese",
  "chicken",
  "coffee",
  "corn",
  "egg",
  "fries",
  "fish",
  "fruit",
  "grape",
  "ham",
  "lettuce",
  "milk",
  "noodle",
  "oat",
  "orange",
  "pancake",
  "pasta",
  "pizza",
  "pork",
  "potato",
  "protein",
  "rice",
  "salad",
  "salmon",
  "sandwich",
  "shrimp",
  "soup",
  "steak",
  "tea",
  "tofu",
  "tomato",
  "tuna",
  "turkey",
  "vegetable",
  "water",
  "yogurt",
]);

const PORTION_OR_UNIT_RE =
  /\b(\d+(?:\.\d+)?|one|two|three|four|five|six|half|quarter|large|medium|small|cup|cups|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce|ounces|g|gram|grams|kg|ml|l|liter|liters|slice|slices|piece|pieces|serving|servings|bowl|plate|can|packet|scoop|scoops)\b/i;

const NON_FOOD_TOKENS = new Set([
  "food",
  "foods",
  "item",
  "items",
  "meal",
  "serving",
  "servings",
  "portion",
  "portions",
  "greeting",
  "message",
  "text",
  "word",
  "hi",
  "hey",
  "hello",
  "sup",
  "test",
  "asdf",
  "asdfasdf"
]);

function normalizeForFoodCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s.\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCommonFoodWord(text: string): boolean {
  const tokens = normalizeForFoodCheck(text)
    .split(/\s+/)
    .map((t) => t.replace(/(?:es|s)$/, ""));
  return tokens.some((t) => COMMON_FOOD_WORDS.has(t));
}

function hasMeaningfulFoodNoun(text: string): boolean {
  return normalizeForFoodCheck(text)
    .split(/\s+/)
    .some((t) => /^[a-z][a-z-]{2,}$/.test(t) && !NON_FOOD_TOKENS.has(t));
}

function looksClearlyNonFood(text: string): boolean {
  const cleaned = normalizeForFoodCheck(text);
  if (!cleaned) return true;
  if (NON_FOOD_PHRASES.includes(cleaned)) return true;
  const hasFoodCue = hasCommonFoodWord(cleaned) || PORTION_OR_UNIT_RE.test(cleaned);
  if (/^(hi|hey|hello|yo|sup)\b/.test(cleaned) && cleaned.split(/\s+/).length <= 4 && !hasFoodCue) return true;
  if (/^(how|what|who|where|when|why|could|would|please|can\s+(you|i|we)\b)/.test(cleaned) && !hasFoodCue) {
    return true;
  }
  if (!/[a-z]/.test(cleaned)) return true;
  if (/^[a-z]{1,2}$/.test(cleaned)) return true;
  return false;
}

function isPlausibleFoodText(text: string): boolean {
  if (looksClearlyNonFood(text)) return false;
  const cleaned = normalizeForFoodCheck(text);
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (hasCommonFoodWord(cleaned)) return true;
  if (PORTION_OR_UNIT_RE.test(cleaned) && hasMeaningfulFoodNoun(cleaned)) return true;
  return words.length >= 2 && words.some((w) => w.length >= 4);
}

function isUsableIngredientLine(line: string): boolean {
  const cleaned = normalizeForFoodCheck(line);
  if (!cleaned || looksClearlyNonFood(cleaned)) return false;
  if (!hasMeaningfulFoodNoun(cleaned)) return false;
  return PORTION_OR_UNIT_RE.test(cleaned) || hasCommonFoodWord(cleaned);
}

function filterIngredientLines(lines: string[]): string[] {
  return lines.map((l) => l.trim()).filter(isUsableIngredientLine);
}

function normalizeIngredientLine(line: string): string {
  return line
    .trim()
    .replace(/^\s*(about|approximately|roughly|around)\s+/i, "")
    .replace(/\bone\b/i, "1")
    .replace(/\btwo\b/i, "2")
    .replace(/\bthree\b/i, "3")
    .replace(/\bfour\b/i, "4")
    .replace(/\bfive\b/i, "5")
    .replace(/\bsix\b/i, "6")
    .replace(/\s+/g, " ");
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const normalized = normalizeIngredientLine(l);
    const k = normalized.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(normalized);
    if (out.length >= 20) break;
  }
  return out;
}

async function resolveIngredientLines(mealText: string): Promise<string[]> {
  if (!isPlausibleFoodText(mealText)) {
    throw new FoodEstimationError("NOT_A_FOOD", "This does not appear to be a valid food item.");
  }

  try {
    const gemini = await parseMealTextToIngredientsGemini(mealText);
    if (gemini !== null) {
      const filtered = filterIngredientLines(gemini);
      if (filtered.length === 0) {
        throw new FoodEstimationError("NOT_A_FOOD", "This does not appear to be a valid food item.");
      }
      return dedupeLines(filtered);
    }
  } catch (err: any) {
    if (err instanceof FoodEstimationError) throw err;
    // If Gemini explicitly threw an error (e.g. Quota Exceeded), bubble it up
    throw new FoodEstimationError("API_ERROR", err.message || "Failed to process text via Gemini");
  }

  const ai = await parseMealTextToIngredients(mealText);
  if (ai?.length) {
    const filtered = filterIngredientLines(ai);
    if (filtered.length) return dedupeLines(filtered);
  }

  const split = splitIngredients(mealText);
  const filtered = filterIngredientLines(split.length ? split : [mealText.trim()]);
  if (!filtered.length) {
    throw new FoodEstimationError("NOT_A_FOOD", "This does not appear to be a valid food item.");
  }
  return dedupeLines(filtered);
}

async function tryUsda(fullText: string): Promise<NutritionTotals | null> {
  const whole = await analyzeLineWithUSDA(fullText);
  if (whole && totalsHaveEnergyOrMacros(whole)) return whole;
  return null;
}

async function analyzeLinesHybrid(lines: string[], hint: string): Promise<{
  totals: NutritionTotals;
  usedLines: string[];
  method: FoodAnalysisMeta["method"];
}> {
  if (hasEdamamCreds()) {
    const ed = await analyzeIngredientsWithEdamam(lines, hint);
    if (ed && totalsHaveEnergyOrMacros(ed)) {
      return { totals: ed, usedLines: lines, method: "edamam" };
    }
  }

  if (lines.length > 1) {
    let sum = emptyNutritionTotals();
    let parts = 0;
    const used: string[] = [];
    for (const line of lines.slice(0, 15)) {
      const t = await tryUsda(line);
      if (t && totalsHaveEnergyOrMacros(t)) {
        sum = addTotals(sum, t);
        used.push(line);
        parts += 1;
      }
    }
    if (parts > 0 && totalsHaveEnergyOrMacros(sum)) {
      return { totals: sum, usedLines: used, method: hasEdamamCreds() ? "edamam+usda" : "usda" };
    }
  }

  const us = await tryUsda(hint);
  if (us && totalsHaveEnergyOrMacros(us)) {
    return { totals: us, usedLines: [hint.trim()], method: hasEdamamCreds() ? "edamam+usda" : "usda" };
  }

  const parts: string[] = [
    "Set USDA_API_KEY in server/.env (free key: https://fdc.nal.usda.gov/api-key-signup), restart the API, and try again.",
    "Edamam is optional; without it this app uses USDA FoodData Central only.",
  ];

  throw new FoodEstimationError(
    "NUTRITION_LOOKUP_FAILED",
    `Could not resolve nutrition for this meal. ${parts.join(" ")} Try clearer portions (e.g. "200 g chicken breast" or "1 cup cooked rice").`
  );
}

export async function estimateManualFood(text: string): Promise<{
  totals: NutritionTotals;
  meta: FoodAnalysisMeta;
  description: string;
}> {
  const cleaned = text.trim();
  if (!cleaned) {
    throw new FoodEstimationError("EMPTY", "Enter a food description.");
  }

  const lines = await resolveIngredientLines(cleaned);
  const { totals, usedLines, method } = await analyzeLinesHybrid(lines, cleaned);

  return {
    totals,
    meta: { method, ingredient_lines: usedLines },
    description: cleaned.slice(0, 500),
  };
}

async function parseMealImageToIngredientLines(
  imageBase64: string,
  mime: string
): Promise<{ ingredients: string[]; description: string } | null> {
  let lastParsed: { ingredients: string[]; description: string } | null = null;
  if (process.env.OPENAI_API_KEY?.trim()) {
    const o = await parseMealImageToIngredients(imageBase64, mime);
    if (o?.ingredients.length) return o;
    if (o?.description) lastParsed = o;
  }
  const g = await parseMealImageToIngredientsGemini(imageBase64, mime);
  if (g?.ingredients.length) return g;
  if (g?.description) lastParsed = g;
  if (lastParsed?.description) {
    const fromDescription = await resolveIngredientLines(lastParsed.description).catch(() => []);
    if (fromDescription.length) return { ...lastParsed, ingredients: fromDescription };
  }
  return lastParsed;
}

export async function estimateImageFood(
  imageBase64: string,
  mime: string
): Promise<{ totals: NutritionTotals; meta: FoodAnalysisMeta; description: string }> {
  if (!process.env.OPENAI_API_KEY?.trim() && !process.env.GEMINI_API_KEY?.trim()) {
    throw new FoodEstimationError(
      "VISION_API_REQUIRED_FOR_PHOTO",
      "Photo logging needs OPENAI_API_KEY or GEMINI_API_KEY on the server to read ingredients from the image (Gemini has a free tier via Google AI Studio). Nutrition is then resolved via USDA and/or Edamam."
    );
  }

  let parsed: { ingredients: string[]; description: string } | null;
  try {
    parsed = await parseMealImageToIngredientLines(imageBase64, mime);
  } catch (err: any) {
    throw new FoodEstimationError("VISION_API_ERROR", err?.message || "Photo analysis failed. Try again or log the meal as text.");
  }
  if (!parsed?.ingredients.length) {
    throw new FoodEstimationError(
      "VISION_PARSE_FAILED",
      "Could not read ingredients from this photo. Try a clearer image or log the meal as text with portions."
    );
  }

  const ingredients = dedupeLines(filterIngredientLines(parsed.ingredients));
  if (!ingredients.length) {
    throw new FoodEstimationError(
      "VISION_PARSE_FAILED",
      "Could not identify valid food items in this photo. Try a clearer image or log the meal as text with portions."
    );
  }

  const hint = ingredients.join(", ");
  const { totals, usedLines, method } = await analyzeLinesHybrid(ingredients, hint);
  return {
    totals,
    meta: { method, ingredient_lines: usedLines },
    description: parsed.description.slice(0, 500),
  };
}
