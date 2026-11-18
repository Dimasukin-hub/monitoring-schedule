import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const templateData = [
      {
        'Spek BB Sulam Btg': 'No. 0+ Panjang',
        'CD': 3000,
        'Fuso': 4500,
        'Spesifikasi': 'Panjang > 60cm, Siap Tanam',
        'Keterangan': 'Pangkas Samping Atas',
      },
      {
        'Spek BB Sulam Btg': 'No. 0 Pangkas 60cm',
        'CD': 3000,
        'Fuso': 4500,
        'Spesifikasi': 'Pangkas 60cm',
        'Keterangan': 'Pangkas Produksi',
      },
      {
        'Spek BB Sulam Btg': 'Sucker No. 2',
        'CD': 3000,
        'Fuso': 4500,
        'Spesifikasi': 'Bibit Sucker Ukuran Standar',
        'Keterangan': 'Standar',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Master Spek Bibit');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Spek_Bibit_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}

