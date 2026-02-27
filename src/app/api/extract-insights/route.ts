import { NextResponse } from 'next/server';
import { extractInsights } from '@/ai/flows/extract-insights-flow';



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await extractInsights(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Route Handler Insight Extraction Error:", error);
    return NextResponse.json({ updatedInsights: [] }, { status: 500 });
  }
}
