import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Log the request body for debugging
    const body = await req.json();
    console.log('Webhook received:', body);

    // Return a success response
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true }, { status: 200 }); 
}
