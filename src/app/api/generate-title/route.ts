import { NextResponse } from 'next/server';
import { generateChatTitle } from '@/ai/flows/generate-chat-title-flow';

// Incompatible con output: export — no usar force-dynamic aquí.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await generateChatTitle(body);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Route Handler Title Error:", error);
    return NextResponse.json({ title: "Nueva conversación" }, { headers: corsHeaders });
  }
}
