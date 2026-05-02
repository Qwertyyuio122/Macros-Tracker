import { config } from "dotenv";
config({ path: "./server/.env" });
import { parseMealTextToIngredientsGemini } from "./server/src/services/geminiVision.js";

async function test() {
  const result = await parseMealTextToIngredientsGemini("hi");
  console.log("Result for 'hi':", result);
  const result2 = await parseMealTextToIngredientsGemini("asdfasdf");
  console.log("Result for 'asdfasdf':", result2);
}

test();
