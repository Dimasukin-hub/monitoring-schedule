import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const candidates = [
      path.join(process.cwd(), 'Template_Upload_Monitor_Gorong_Gorong_Aktual.xlsx'),
      path.join(process.cwd(), 'public', 'Template_Upload_Monitor_Gorong_Gorong_Aktual.xlsx'),
      path.join(process.cwd(), 'Template_Upload_Monitor_Gorong_Gorong_Aktual_V2.xlsx'),
    ];

    let foundPath: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      const fileBuffer = fs.readFileSync(foundPath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="Template_Upload_Monitor_Gorong_Gorong_Aktual.xlsx"',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Berkas template master belum tersedia di server.' },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('Error serving template:', err);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunduh berkas template', error: err.message },
      { status: 500 }
    );
  }
}
