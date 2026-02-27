// Genkit AI flow - llamado desde rutas API del servidor, no es un Server Action de Next.js


import { ai, modelName } from '@/ai/genkit';

export interface UserProfileContext {
  name?: string;
  frecuenciaAnimoBajo?: string;
  frecuenciaPocoInteres?: string;
  nivelEnergia?: string;
  objetivoPrincipal?: string;
}

export interface ZhiChatInput {
  userInput: string;
  userProfile?: UserProfileContext;
  chatHistorySummary?: string;
  coreInsights?: string[];
  photoDataUri?: string;
}

export interface ZhiChatOutput {
  zhiHeartResponse: string;
}

export async function zhiChat(input: ZhiChatInput): Promise<ZhiChatOutput> {
  try {
    const prompt = buildZhiPrompt(input);
    const contentParts: any[] = [{ text: prompt }];

    // Handle optional image parsing from Data URI
    if (input.photoDataUri) {
      const match = input.photoDataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentParts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contentParts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            zhiHeartResponse: {
              type: "STRING",
              description: "La respuesta de Zhi.io al usuario."
            }
          },
          required: ["zhiHeartResponse"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Empty response from Gemini.");
    }
    
    const jsonOutput = JSON.parse(response.text) as ZhiChatOutput;
    
    return {
      zhiHeartResponse: jsonOutput.zhiHeartResponse
    };
  } catch (error) {
    console.error("ZHI FLOW ERROR:", error);
    // Simular tiempo de procesamiento de la IA para una respuesta amigable
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      zhiHeartResponse: "Te escucho... entiendo que puede ser difícil... tómate tu tiempo, no hay prisa... estoy aquí para acompañarte."
    };
  }
}

function buildZhiPrompt(input: ZhiChatInput): string {
  const parts: string[] = [];

  parts.push("Identidad y Personalidad:");
  parts.push("Eres ZHI, un hombre joven adulto con formación en psicología clínica. Tu enfoque es humano, cálido y cercano.");
  parts.push("Tu tono es el de un amigo sabio y estable. Hablas en español latino.");
  parts.push("Reglas Estrictas de Comportamiento:");
  parts.push("- PROHIBICIÓN DE SALUDOS: Si hay historial de mensajes (ver 'Contexto de conversaciones recientes'), tienes PROHIBIDO saludar. No digas 'Hola', 'Bienvenido', 'Buen día' o similares. Empieza directamente con la validación emocional.");
  parts.push("- NO REPETICIÓN: No uses el nombre del usuario si ya lo usaste en los últimos mensajes del historial.");
  parts.push("- NATURALIDAD: Habla como si estuvieras en medio de una conversación continua. Ve directo al grano emocional.");
  parts.push("");
  parts.push("Estructura de cada Respuesta (Separa cada bloque con DOS saltos de línea):");
  parts.push("1. Validación emocional profunda: Empieza AQUÍ directamente. Sin introducciones.");
  parts.push("");
  parts.push("2. Una reflexión cercana: Sin tecnicismos.");
  parts.push("");
  parts.push("3. Una acción pequeña o pregunta de cierre (OPCIONAL): No sugerir siempre.");
  parts.push("Límites Éticos:");
  parts.push("- No diagnostiques.");
  parts.push("- No reemplaces a un profesional profesional humano.");
  parts.push("- Si detectas riesgo serio, sugiere buscar ayuda humana con respeto.");
  parts.push("");
  parts.push("Aquí tienes algo de contexto sobre el usuario. Usa esta información para personalizar la conversación y entender mejor su situación.");

  if (input.userProfile) {
    const up = input.userProfile;
    parts.push("");
    parts.push(`- Nombre del usuario: ${up.name || 'Desconocido'}`);
    parts.push(`- Objetivo principal del usuario: ${up.objetivoPrincipal || 'No especificado'}`);
    parts.push(`- Frecuencia de ánimo bajo: ${up.frecuenciaAnimoBajo || 'No especificada'}`);
    parts.push(`- Frecuencia de poco interés: ${up.frecuenciaPocoInteres || 'No especificada'}`);
    parts.push(`- Nivel de energía reciente: ${up.nivelEnergia || 'No especificado'}`);
  }

  if (input.chatHistorySummary) {
    parts.push("");
    parts.push(`Contexto de conversaciones recientes: ${input.chatHistorySummary}`);
  }

  if (input.coreInsights && input.coreInsights.length > 0) {
    parts.push("");
    parts.push("Core Insights (Conocimiento profundo del usuario a largo plazo):");
    for (const insight of input.coreInsights) {
      parts.push(`- ${insight}`);
    }
    parts.push("Usa esta información para darle continuidad a su proceso, recordar personas importantes o situaciones que te ha contado en el pasado.");
  }

  parts.push("");
  parts.push(`Entrada del usuario: ${input.userInput}`);

  if (input.photoDataUri) {
    parts.push("");
    parts.push("El usuario ha adjuntado una imagen de forma nativa. Si la imagen adjunta es relevante para su estado emocional, coméntala de forma empática y no clínica.");
  }

  parts.push("");
  parts.push("Tu respuesta como Zhi:");

  return parts.join("\n");
}