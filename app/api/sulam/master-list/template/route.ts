import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templateData = [
      {
        'Wilayah': 'AW01',
        'Lokasi': '002G',
        'Jenis BB': 'Sucker',
        'Kelas BB': 'No. 2',
        'Spek BB': 'No. 0 Pangkas 60cm',
        'Tgl Rawat': '2025-10-15',
        'Tgl Std Forcing': '2026-08-15',
        'Tgl F Prod': '2026-09-01',
        'Tgl F Max': '2026-09-15',
        'Tgl Order': '2026-09-15',
        'Permintaan Batang': 10000,
        'Permintaan Rit': 5,
        'Keterangan': 'Pangkas Produksi',
        'Status': 'Open',
      },
      {
        'Wilayah': 'AW06',
        'Lokasi': '076J',
        'Jenis BB': 'Crown',
        'Kelas BB': 'No. 2',
        'Spek BB': 'Sucker No. 2',
        'Tgl Rawat': '2025-11-20',
        'Tgl Std Forcing': '2026-09-10',
        'Tgl F Prod': '2026-09-25',
        'Tgl F Max': '2026-10-05',
        'Tgl Order': '2026-09-16',
        'Permintaan Batang': 6000,
        'Permintaan Rit': 2,
        'Keterangan': 'Pangkas Samping',
        'Status': 'Open',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template List Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_List_Prioritas_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}

