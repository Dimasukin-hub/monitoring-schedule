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
        'Jumlah': 10000,
        'Rit': 5,
        'Real Rit': 0,
        'Spek Bibit': 'No. 0 Pangkas 60cm',
        'Manual': 0,
        'Keterangan Proses': 'Pangkas Produksi',
        'Keterangan Mati': '-',
        'Keterangan Ritase': 'Normal',
      },
      {
        'Lokasi': '076J',
        'Wilayah': 'AW06',
        'Tanggal Order': '2026-09-16',
        'Jumlah': 6000,
        'Rit': 2,
        'Real Rit': 1,
        'Spek Bibit': 'Sucker No. 2',
        'Manual': 0,
        'Keterangan Proses': 'Pangkas Samping',
        'Keterangan Mati': '-',
        'Keterangan Ritase': 'Prioritas',
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
