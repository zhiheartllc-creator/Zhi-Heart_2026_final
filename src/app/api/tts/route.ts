import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";

// Inicializamos el cliente fuera de la ruta para reutilizar la conexión
const client = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
    }

    console.log(`[API-TTS] Request received for text: "${text.substring(0, 30)}..." with Google Cloud TTS`);

    // Limpiamos entidades HTML para que no rompan el formato SSML
    const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Agregamos una pausa de 600ms en los puntos
    const ssmlText = `<speak>${escapedText.replace(/\. /g, '. <break time="600ms"/> ').replace(/\.$/, '. <break time="600ms"/>')}</speak>`;

    const request = {
      // Usamos text en lugar de ssml porque las voces Studio rechazan el formato SSML manual
      input: { text: text },
      voice: { 
        languageCode: 'es-ES',
        name: 'es-ES-Studio-C',
      },
      audioConfig: { 
        audioEncoding: 'MP3' as const,
        effectsProfileId: ['handset-class-device']
        // Las voces Studio de Google bloquean estrictamente las modificaciones de pitch y velocidad 
        // para no romper su acústica grabada por actores reales.
      },
    };

    const [response] = await client.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error("No audio content returned from Google TTS");
    }

    return new Response(Buffer.from(response.audioContent as Uint8Array), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API-TTS] Google TTS Error:", error);
    return NextResponse.json(
      { error: "Error interno al generar audio" },
      { status: 500 }
    );
  }
}
