import { NextResponse } from 'next/server';
import { generateChatTitle } from '@/ai/flows/generate-chat-title-flow';

const isStaticExport = process.env.NEXT_OUTPUT === 'export';
export const dynamic = isStaticExport ? 'force-static' : 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await generateChatTitle(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Route Handler Title Error:", error);
    return NextResponse.json({ title: "Nueva conversación" });
  }
}
