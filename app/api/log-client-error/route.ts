import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.error('🚨 CLIENT RUNTIME ERROR LOGGED:', body);
    const logPath = path.join(process.cwd(), 'last_client_error.txt');
    fs.writeFileSync(logPath, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
