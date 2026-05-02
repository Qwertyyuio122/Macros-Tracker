import "./env.js";

async function listModels() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    console.error("Missing GEMINI_API_KEY");
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(data);
}

listModels();
