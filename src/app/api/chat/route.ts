import { NextResponse } from 'next/server';
import { zhiChat } from '@/ai/flows/zhi-chat-flow';

// ⚠️ NO usar 'force-static' aquí — esta ruta necesita ejecutarse en el servidor (SSR).
// El build estático (para Android) llamará a esta ruta en el servidor de App Hosting vía CORS.
// NOTA: No usamos force-dynamic porque es incompatible con output: export (build:android).

// Headers CORS necesarios para que Android (Capacitor) pueda llamar a esta API.
// Capacitor usa el origen "capacitor://localhost" o "http://localhost" en Android.
// Headers CORS restringidos para producción y desarrollo local Capacitor.
const allowedOrigins = [
  'https://zhi-heart--main-studio-2141942949-c8e1e.us-central1.hosted.app',
  'capacitor://localhost',
  'http://localhost'
];

// Responde al preflight OPTIONS que el navegador/Capacitor envía antes del POST
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
    const body = await req.json();
    const result = await zhiChat(body);
    return NextResponse.json(result, { headers });
  } catch (error: any) {
    console.error("Route Handler Chat Error:", error);
    return NextResponse.json(
      { zhiHeartResponse: "Te escucho... entiendo que puede ser difícil... tómate tu tiempo, no hay prisa... estoy aquí para acompañarte." },
      { headers }
    );
  }
}

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
