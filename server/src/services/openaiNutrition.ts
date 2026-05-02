/**
 * OpenAI is used only to turn free-form meal descriptions or photos into
 * ingredient lines suitable for Edamam — not to invent nutrition numbers.
 */

const INGREDIENT_LIST_SCHEMA = `{"ingredients": string[]}`;

export async function parseMealTextToIngredients(mealDescription: string): Promise<string[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const body = {
    model: process.env.OPENAI_MODEL_PARSE ?? "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "system" as const,
        content: `You convert a meal description into a JSON object ${INGREDIENT_LIST_SCHEMA}. Rules:
- Each string must be ONE food item with a numeric portion and unit (g, oz, ml, cup, tbsp, tsp, slice, piece, large/medium/small egg, etc.) so a nutrition database can parse it.
- Do not include calories, macros, or micronutrients.
- Use common retail/restaurant portion language; if a clear food is present but the user omitted amounts, infer a typical single-serving portion and say so implicitly in the string (still include a number).
- If the text is conversational, random, a greeting, or does not clearly describe food, return {"ingredients":[]}. Never turn non-food words into food.
- Max 20 items. Output ONLY valid JSON.`,
      },
      { role: "user" as const, content: mealDescription },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { ingredients?: unknown };
    if (!Array.isArray(parsed.ingredients)) return null;
    const out = parsed.ingredients
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .slice(0, 20);
    return out.length ? out : null;
  } catch {
    return null;
  }
}

export async function parseMealImageToIngredients(
  imageBase64: string,
  mime: string
): Promise<{ ingredients: string[]; description: string } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const body = {
    model: process.env.OPENAI_MODEL_VISION ?? "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `Look at the meal photo. Return STRICT JSON: {"description": string, "ingredients": string[]}.
description: short neutral summary of what is visible.
ingredients: each item ONE visible food with numeric portion + unit (same rules as text parsing). If the exact weight is unknown, estimate a reasonable visible serving such as "1 medium apple", "1 slice pizza", "1 plate pasta", or "1 cup rice". Do not include utensils, packaging, decorations, calories, macros, or micronutrients. Max 20 items.`,
          },
          {
            type: "image_url" as const,
            image_url: { url: `data:${mime};base64,${imageBase64}` },
          },
        ],
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { ingredients?: unknown; description?: unknown };
    const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
    if (!Array.isArray(parsed.ingredients)) return null;
    const ingredients = parsed.ingredients
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .slice(0, 20);
    if (!ingredients.length) return null;
    return { ingredients, description: description || "Meal (photo)" };
  } catch {
    return null;
  }
}
