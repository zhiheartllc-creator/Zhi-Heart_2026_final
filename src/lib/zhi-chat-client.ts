'use client';

/**
 * Cliente de chat Zhi que llama directamente a la API de Gemini desde el navegador/WebView.
 * Se usa en Android (Capacitor) para evitar depender del servidor de App Hosting.
 * En PWA, se sigue usando la ruta del servidor (/api/chat) por seguridad.
 */

import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = 'gemini-2.5-flash';

interface UserProfileContext {
  name?: string;
  frecuenciaAnimoBajo?: string;
  frecuenciaPocoInteres?: string;
  nivelEnergia?: string;
  objetivoPrincipal?: string;
}

interface ZhiChatInput {
  userInput: string;
  userProfile?: UserProfileContext;
  chatHistorySummary?: string;
  coreInsights?: string[];
}

interface ZhiChatOutput {
  zhiHeartResponse: string;
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
  parts.push("");
  parts.push("Tu respuesta como Zhi:");

  return parts.join("\n");
}

/**
 * Llama directamente a la API de Gemini desde el cliente.
 * Ideal para plataformas nativas (Android) donde no hay servidor Next.js disponible.
 */
export async function zhiChatClient(input: ZhiChatInput): Promise<ZhiChatOutput> {
  if (!GEMINI_API_KEY) {
    console.error('[ZHI-CLIENT] No se encontró NEXT_PUBLIC_GEMINI_API_KEY');
    return {
      zhiHeartResponse: "Lo siento, hay un problema de configuración. No se pudo conectar con la IA."
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildZhiPrompt(input);

    console.log('[ZHI-CLIENT] Llamando a Gemini directamente...');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
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
    console.log('[ZHI-CLIENT] Respuesta recibida exitosamente');

    return {
      zhiHeartResponse: jsonOutput.zhiHeartResponse
    };
  } catch (error) {
    console.error("[ZHI-CLIENT] Error:", error);
    return {
      zhiHeartResponse: "Te escucho... entiendo que puede ser difícil... tómate tu tiempo, no hay prisa... estoy aquí para acompañarte."
    };
  }
}

/**
 * Genera un título corto para una conversación llamando directamente a Gemini.
 * Se usa en Android donde la ruta /api/generate-title no está disponible.
 */
export async function generateTitleClient(messages: {role: string, text: string}[]): Promise<string> {
  if (!GEMINI_API_KEY) return 'Conversación con Zhi';

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const conversation = messages.map(m =>
      `${m.role === 'user' ? 'Usuario' : 'Zhi'}: ${m.text}`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{
        text: `Genera un título muy corto (máximo 6 palabras) que resuma esta conversación emocional. Solo responde con el título, sin comillas ni explicación.\n\nConversación:\n${conversation}`
      }],
    });

    const title = response.text?.trim();
    return title || 'Conversación con Zhi';
  } catch (error) {
    console.error('[ZHI-CLIENT] Error generating title:', error);
    return 'Conversación con Zhi';
  }
}

/**
 * Extrae insights clave del usuario a partir de los mensajes.
 * Se usa en Android donde la ruta /api/extract-insights no está disponible.
 */
export async function extractInsightsClient(
  messages: {role: string, text: string}[],
  existingInsights: string[] = []
): Promise<string[]> {
  if (!GEMINI_API_KEY) return existingInsights;

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const conversation = messages.map(m =>
      `${m.role === 'user' ? 'Usuario' : 'Zhi'}: ${m.text}`
    ).join('\n');

    const existingStr = existingInsights.length > 0
      ? `\nInsights existentes:\n${existingInsights.map(i => `- ${i}`).join('\n')}`
      : '';

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{
        text: `Analiza esta conversación emocional y extrae los insights clave sobre el usuario (situaciones importantes, personas mencionadas, emociones recurrentes, metas, preocupaciones). Devuelve un JSON con un array "updatedInsights" que combine los insights existentes con los nuevos. Máximo 10 insights, cada uno en una frase corta.${existingStr}\n\nConversación:\n${conversation}`
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            updatedInsights: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Lista actualizada de insights sobre el usuario"
            }
          },
          required: ["updatedInsights"]
        }
      }
    });

    if (!response.text) return existingInsights;
    const parsed = JSON.parse(response.text);
    return parsed.updatedInsights || existingInsights;
  } catch (error) {
    console.error('[ZHI-CLIENT] Error extracting insights:', error);
    return existingInsights;
  }
}
