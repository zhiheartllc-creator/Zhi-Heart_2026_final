import { NextResponse } from 'next/server';
import { zhiChat } from '@/ai/flows/zhi-chat-flow';


export const dynamic = 'force-static';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await zhiChat(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Route Handler Chat Error:", error);
    return NextResponse.json({
      zhiHeartResponse: "Te escucho... entiendo que puede ser difícil... tómate tu tiempo, no hay prisa... estoy aquí para acompañarte."
    });
  }
}
