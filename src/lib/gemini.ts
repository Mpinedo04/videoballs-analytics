import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
  const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
  
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no encontrada");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Usamos el modelo estable de 2026 (gemini-2.5-flash)
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

// Oráculo V2 - Engine: Gemini 2.5 Flash
export async function generateInsights(prompt: string) {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
