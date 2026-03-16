import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
  const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
  
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no encontrada");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Usamos el modelo estable y forzamos v1 para evitar fallos de rutas beta
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });
}

// Función para generar insights con el modelo configurado
export async function generateInsights(prompt: string) {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
