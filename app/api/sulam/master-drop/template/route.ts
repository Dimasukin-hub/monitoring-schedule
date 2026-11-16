import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templateData = [
      {
        'Lokasi': '002G',
        'Wilayah': 'AW01',
        'Tanggal Drop': '2026-09-18',
        'Tanggal Order': '2026-09-15',
        'Hasil Ha': 0.15,
        'Hasil Btg': 2000,
        'Spek BB': 'No. 0 Pangkas 60cm',
        'Std Rit': 2000,
        'Jumlah Rit': 1,
        'Jenis Unit': 'CD',
        'Status Drop': 'V',
      },
      {
        'Lokasi': '076J',
        'Wilayah': 'AW06',
        'Tanggal Drop': '2026-09-19',
        'Tanggal Order': '2026-09-16',
        'Hasil Ha': 0.25,
        'Hasil Btg': 3000,
        'Spek BB': 'Sucker No. 2',
        'Std Rit': 3000,
        'Jumlah Rit': 1,
        'Jenis Unit': 'CD',
        'Status Drop': 'V',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master Drop Bibit');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Drop_Bibit_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}

