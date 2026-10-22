import { NextResponse } from 'next/server';
import masterLookup from '@/lib/masterLand2017_2020.json';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: masterLookup,
    });
  } catch (error: any) {
    console.error('Error serving master lookup:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
