import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templateData = [
      {
        'Lokasi': '092F',
        'Hasil Ha': 0.07,
        'Hasil Btg': 1400,
        'Tanggal': '2026-09-20',
        'Bibit Ordered': 'No. 0 Pangkas 60cm',
        'Std Rit': 2000,
        'Rit Planted': 1,
      },
      {
        'Lokasi': '002G',
        'Hasil Ha': 0.15,
        'Hasil Btg': 2000,
        'Tanggal': '2026-09-21',
        'Bibit Ordered': 'No. 0 Pangkas 60cm',
        'Std Rit': 2000,
        'Rit Planted': 1,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master Real Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Real_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}

