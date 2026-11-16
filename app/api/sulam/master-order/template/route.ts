import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templateData = [
      {
        'Lokasi': '002G',
        'Wilayah': 'AW01',
        'Tanggal Order': '2026-09-15',
        'Spek BB': 'No. 0 Pangkas 60cm',
        'Jumlah Batang': 10000,
        'Jumlah Rit': 5,
        'Keterangan': 'Pangkas Produksi',
      },
      {
        'Lokasi': '076J',
        'Wilayah': 'AW06',
        'Tanggal Order': '2026-09-16',
        'Spek BB': 'Sucker No. 2',
        'Jumlah Batang': 6000,
        'Jumlah Rit': 2,
        'Keterangan': 'Pangkas Samping',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master Order Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Order_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}

