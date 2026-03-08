import { NextResponse } from 'next/server';
import { extractInsights } from '@/ai/flows/extract-insights-flow';

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
    const result = await extractInsights(body);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Route Handler Insight Extraction Error:", error);
    return NextResponse.json({ updatedInsights: [] }, { status: 500, headers: corsHeaders });
  }
}
