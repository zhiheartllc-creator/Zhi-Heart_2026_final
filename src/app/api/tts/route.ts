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

const allowedOrigins = [
  'https://zhi-heart--main-studio-2141942949-c8e1e.us-central1.hosted.app',
  'capacitor://localhost',
  'http://localhost'
];

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const headers = {
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  };

  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400, headers });
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
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[API-TTS] Google TTS Error:", error);
    return NextResponse.json(
      { error: "Error interno al generar audio" },
      { status: 500, headers }
    );
  }
}
