import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiModel() {
  const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim();
  
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no encontrada");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Volvemos a la configuración v1beta que suele ser la más compatible para gemini-1.5-flash en cuentas free
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

// Función para generar insights con el modelo configurado
export async function generateInsights(prompt: string) {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
