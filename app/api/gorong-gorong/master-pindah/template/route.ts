import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Data Pindah Lokasi', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi Pengirim', key: 'lokasiPengirim', width: 16 },
      { header: 'Wilayah Pengirim', key: 'wilayahPengirim', width: 16 },
      { header: 'Lokasi Penerima', key: 'lokasiPenerima', width: 16 },
      { header: 'Wilayah Penerima', key: 'wilayahPenerima', width: 16 },
      { header: 'Tanggal Pindah Lokasi', key: 'tanggal', width: 20 },
      { header: 'Ø40 (pcs)', key: 'diameter40', width: 12 },
      { header: 'Ø60 (pcs)', key: 'diameter60', width: 12 },
      { header: 'Ø80 (pcs)', key: 'diameter80', width: 12 },
      { header: 'Ø100 (pcs)', key: 'diameter100', width: 12 },
      { header: 'Keterangan', key: 'keterangan', width: 25 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8B5CF6' }, // Purple theme for Pindah Lokasi
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF9CA3AF' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });

    // Baris contoh agar pengguna mudah memahami cara pengisian
    const sampleRow = worksheet.addRow({
      no: 1,
      lokasiPengirim: '001A',
      wilayahPengirim: 'AW01',
      lokasiPenerima: '002B',
      wilayahPenerima: 'AW01',
      tanggal: '2026-03-15',
      diameter40: 10,
      diameter60: 0,
      diameter80: 0,
      diameter100: 0,
      keterangan: 'Mutasi gorong-gorong antar petak',
    });
    sampleRow.font = { italic: true, color: { argb: 'FF6B7280' }, size: 9 };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Pindah_Lokasi.xlsx"',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating template master pindah:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat template Master Data Pindah Lokasi: ' + error.message },
      { status: 500 }
    );
  }
}

