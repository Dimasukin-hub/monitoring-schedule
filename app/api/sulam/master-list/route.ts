import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Sub menu Master List Sulam telah dipindahkan ke Monitoring Sulam
  return NextResponse.redirect(new URL('/api/sulam/monitoring', request.url));
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Tabel List Sulam sekarang berfungsi sebagai summary otomatis dari Master Data di menu Monitoring Sulam.',
  });
}
