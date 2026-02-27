// Genkit AI flow - llamado desde rutas API del servidor, no es un Server Action de Next.js


import { ai, modelName } from '@/ai/genkit';

export interface ExtractInsightsInput {
  messages: Array<{
    role: string;
    text: string;
  }>;
  existingInsights?: string[];
}

export interface ExtractInsightsOutput {
  updatedInsights: string[];
}

export async function extractInsights(input: ExtractInsightsInput): Promise<ExtractInsightsOutput> {
  try {
    const prompt = buildExtractionPrompt(input);
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            updatedInsights: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Lista de insights clave extraídos y actualizados sobre la vida del usuario."
            }
          },
          required: ["updatedInsights"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini for insight extraction");
    }

    const result = JSON.parse(response.text) as ExtractInsightsOutput;
    // Limit to 15 insights to keep it concise
    return {
      updatedInsights: result.updatedInsights.slice(0, 15)
    };

  } catch (error) {
    console.error("ZHI EXTRACTION FLOW ERROR:", error);
    return { updatedInsights: input.existingInsights || [] };
  }
}

function buildExtractionPrompt(input: ExtractInsightsInput): string {
  const parts: string[] = [];
  
  parts.push("Eres un asistente psicológico experto en extraer 'Core Insights' (puntos clave) de conversaciones terapéuticas.");
  parts.push("Tu objetivo es identificar información fundamental sobre la vida del usuario que Zhi debe recordar a largo plazo para ser más efectivo y empático.");
  parts.push("");
  parts.push("Reglas para los Insights:");
  parts.push("1. Deben ser breves (máximo 15 palabras por punto).");
  parts.push("2. Enfócate en: relaciones, trabajo, traumas, metas, valores y patrones emocionales.");
  parts.push("3. NO incluyas detalles triviales de una sola charla (ej: 'Hoy comió pizza').");
  parts.push("4. Mantén la confidencialidad y el tono respetuoso.");
  parts.push("5. Si hay insights existentes, actualízalos o añade nuevos basándote en la nueva conversación. No repitas información.");
  parts.push("");
  
  if (input.existingInsights && input.existingInsights.length > 0) {
    parts.push("Insights actuales del usuario:");
    for (const insight of input.existingInsights) {
      parts.push(`- ${insight}`);
    }
    parts.push("");
  }
  
  parts.push("Nueva conversación:");
  for (const msg of input.messages) {
    parts.push(`- ${msg.role}: ${msg.text}`);
  }
  
  parts.push("");
  parts.push("Genera la lista actualizada de insights en formato JSON estricto.");
  
  return parts.join("\n");
}
