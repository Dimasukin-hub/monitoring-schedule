import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templateData = [
      {
        'Lokasi': '002G',
        'Hasil Ha': 1.5,
        'Hasil Btg': 110000,
        'Tanggal': '2026-09-20',
        'Bibit Ordered': 'No. 0 Pangkas 60cm',
        'Std Rit': 3000,
        'Jumlah Rit': 37,
        'Jenis Unit': 'CD',
        'Tanggal Order': '2026-09-15',
        'Status Drop': 'V',
      },
      {
        'Lokasi': '076J',
        'Hasil Ha': 0.8,
        'Hasil Btg': 58000,
        'Tanggal': '2026-09-22',
        'Bibit Ordered': 'Sucker No. 2',
        'Std Rit': 3000,
        'Jumlah Rit': 20,
        'Jenis Unit': 'CD',
        'Tanggal Order': '2026-09-16',
        'Status Drop': 'V',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master Drop Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Drop_Bibit.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}
