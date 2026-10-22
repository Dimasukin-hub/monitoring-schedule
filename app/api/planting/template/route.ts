import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const templateHeaders = [
      [
        'Tanggal',
        'Lokasi',
        'Luas Netto (Ha)',
        'Aktivitas',
        'Standar',
        'Besar',
        'Sedang',
        'Kecil',
        'Total Ha',
        'Total Btg',
        'Jenis Bibit',
        'Wilayah',
        'Awal Tanam',
        'Selesai Tanam',
        'Akum Tanam',
        '% Tanam',
        'Petik Ke-',
      ],
      // Contoh Baris 1: Tanam Bibit
      [
        '14/10/2026',
        '013F',
        7.64,
        'Tanam Bibit',
        '',
        '',
        '',
        0.53,
        0.53,
        '',
        'Crown',
        'W01',
        '07/10/2026',
        '',
        7.64,
        1.0,
        '',
      ],
      // Contoh Baris 2: Petik Bibit
      [
        '19/10/2026',
        '073A1',
        6.38,
        'Petik Bibit',
        '',
        0.05,
        0.29,
        '',
        0.34,
        24650,
        'Sucker',
        'W07',
        '22/04/2022',
        '',
        0,
        0,
        2,
      ],
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(templateHeaders);

    ws['!cols'] = [
      { wch: 14 }, // Tanggal
      { wch: 12 }, // Lokasi
      { wch: 16 }, // Luas Netto
      { wch: 16 }, // Aktivitas
      { wch: 10 }, // Standar
      { wch: 10 }, // Besar
      { wch: 10 }, // Sedang
      { wch: 10 }, // Kecil
      { wch: 12 }, // Total Ha
      { wch: 12 }, // Total Btg
      { wch: 14 }, // Jenis Bibit
      { wch: 12 }, // Wilayah
      { wch: 14 }, // Awal Tanam
      { wch: 14 }, // Selesai Tanam
      { wch: 14 }, // Akum Tanam
      { wch: 12 }, // % Tanam
      { wch: 12 }, // Petik Ke-
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Input Real Tanam&Petik Nanas');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Upload_Real_Tanam.xlsx"',
      },
    });
  } catch (err: any) {
    console.error('Error generating template:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
