/**
 * Optional Google Gemini (AI Studio) vision — turns a meal photo into ingredient lines.
 * Free tier: https://aistudio.google.com/apikey — nutrition still comes from USDA / Edamam.
 */

function extractJsonObject(text: string): string | null {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const inner = fence[1].trim();
    const o = inner.match(/\{[\s\S]*\}/);
    if (o) return o[0];
  }
  const o = t.match(/\{[\s\S]*\}/);
  return o ? o[0] : null;
}

export async function parseMealImageToIngredientsGemini(
  imageBase64: string,
  mime: string
): Promise<{ ingredients: string[]; description: string } | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.GEMINI_VISION_MODEL?.trim() || "gemini-1.5-flash";
  const prompt = `Look at the meal photo. Return STRICT JSON only: {"description": string, "ingredients": string[]}.
description: short neutral summary of what is visible. If no food is clearly visible, or if it is just a random non-food image, set description to empty string and return empty ingredients array.
ingredients: each string ONE visible food with numeric portion and unit (g, oz, ml, cup, tbsp, piece, slice, plate, bowl, etc.) so a nutrition database can look it up. If the exact weight is unknown, estimate a reasonable visible serving such as "1 medium apple", "1 slice pizza", "1 plate pasta", or "1 cup rice". Do not include utensils, packaging, decorations, calorie numbers, or macro numbers. Max 20 items.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mime && mime.length < 80 ? mime : "image/jpeg",
              data: imageBase64.replace(/\s/g, ""),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("Gemini vision:", res.status, t.slice(0, 500));
    if (res.status === 429) {
      throw new Error("Gemini vision quota exceeded. Try again later, set GEMINI_VISION_MODEL to a model with quota, or configure OPENAI_API_KEY.");
    }
    return null;
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string; code?: number };
  };

  if (data.error?.message) {
    console.error("Gemini vision:", data.error.message);
    return null;
  }

  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  let parsed: { ingredients?: unknown; description?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    const extracted = extractJsonObject(raw);
    if (!extracted) return null;
    try {
      parsed = JSON.parse(extracted) as typeof parsed;
    } catch {
      return null;
    }
  }

  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  if (!Array.isArray(parsed.ingredients)) return null;
  const ingredients = parsed.ingredients
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
  if (!ingredients.length) return null;
  return { ingredients, description: description || "Meal (photo)" };
}

export async function parseMealTextToIngredientsGemini(mealDescription: string): Promise<string[] | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.GEMINI_TEXT_MODEL?.trim() || process.env.GEMINI_VISION_MODEL?.trim() || "gemini-1.5-flash";
  const prompt = `You are a strict food parsing assistant. 
User text: "${mealDescription}"

Task: Extract all legitimate food items from the text. 
Return STRICT JSON: {"ingredients": string[]}

Rules:
- Each string must be ONE food item with a numeric portion and unit (g, oz, ml, cup, tbsp, tsp, piece, etc.).
- If the user omitted amounts, infer typical single-serving portions and include it in the string.
- If the text is conversational (e.g., "hi", "hey", "hello", "how are you"), a random word (e.g., "test", "asdf"), or does NOT clearly describe a food item, you MUST return an empty array for ingredients: {"ingredients": []}. DO NOT hallucinate a serving size for greetings or random words (e.g., NEVER output "1 serving hi").
- No calorie or macro numbers in the strings. Max 20 items.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string; code?: number };
  };

  if (data.error?.message) {
    throw new Error(`Gemini API Error: ${data.error.message}`);
  }

  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: { ingredients?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    const extracted = extractJsonObject(raw);
    if (!extracted) return null;
    try {
      parsed = JSON.parse(extracted) as typeof parsed;
    } catch {
      return null;
    }
  }

  if (!Array.isArray(parsed.ingredients)) return null;
  const ingredients = parsed.ingredients
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
    
  return ingredients;
}
