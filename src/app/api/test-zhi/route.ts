import { NextResponse } from 'next/server';




export async function GET() {
  try {
    const { zhiChat } = await import('@/ai/flows/zhi-chat-flow');
    const res = await zhiChat({ 
      userInput: "hola, probando el test", 
      userProfile: { 
        name: "TestUser", 
        email: "test@example.com", 
        createdAt: "2026-02-22",
        frecuenciaAnimoBajo: 2 
      } as any
    });
    return NextResponse.json({ success: true, res });
  } catch (e: any) {
    const errorProto = Object.getPrototypeOf(e);
    return NextResponse.json({ 
        success: false, 
        errorName: e?.name || "Unknown", 
        errorMessage: e?.message || String(e), 
        stack: e?.stack,
        protoType: errorProto && errorProto.constructor ? errorProto.constructor.name : 'Unknown'
    });
  }
}
