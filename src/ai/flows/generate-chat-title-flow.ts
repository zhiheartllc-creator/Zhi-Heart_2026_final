// Genkit AI flow - llamado desde rutas API del servidor, no es un Server Action de Next.js


import { ai, modelName } from '@/ai/genkit';

export interface GenerateChatTitleInput {
  messages: Array<{
    role: string;
    text: string;
  }>;
}

export interface GenerateChatTitleOutput {
  title: string;
}

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  try {
    const prompt = buildTitlePrompt(input);
    
    // Configuramos Gemini para darnos el título en JSON, asegurando un formato más consistente
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: {
              type: "STRING",
              description: "El título generado para la conversación."
            }
          },
          required: ["title"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini for title generation");
    }

    const result = JSON.parse(response.text) as GenerateChatTitleOutput;
    return result;

  } catch (error) {
    console.error("ZHI TITLE FLOW ERROR:", error);
    return { title: "Nueva conversación" };
  }
}

function buildTitlePrompt(input: GenerateChatTitleInput): string {
  const parts: string[] = [];
  
  parts.push("Analiza los siguientes mensajes de una conversación y genera un título corto (3-5 palabras) que resuma el tema principal. El título debe ser conciso y relevante.");
  parts.push("");
  parts.push("Ejemplos:");
  parts.push("- \"Manejando la ansiedad laboral\"");
  parts.push("- \"Problemas para dormir\"");
  parts.push("- \"Reflexionando sobre el día\"");
  parts.push("");
  parts.push("Mensajes de la conversación:");
  
  for (const msg of input.messages) {
    parts.push(`- ${msg.role}: ${msg.text}`);
  }
  
  parts.push("");
  parts.push("Genera solo el título en formato JSON estricto.");
  
  return parts.join("\n");
}