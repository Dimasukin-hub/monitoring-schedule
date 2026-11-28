import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

/**
 * Generate an empty Excel template whose column order and names match
 * the "Tabel Input Real Tanam & Petik Nanas" table 1-to-1.
 */
export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Input Real Tanam&Petik Nanas', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = [
      { header: 'NO', key: 'no', width: 8 },
      { header: 'TANGGAL', key: 'tanggal', width: 15 },
      { header: 'LOKASI', key: 'lokasi', width: 14 },
      { header: 'LUAS NETTO (HA)', key: 'luasNetto', width: 18 },
      { header: 'AKTIVITAS', key: 'aktivitas', width: 16 },
      { header: 'STANDAR', key: 'standar', width: 12 },
      { header: 'BESAR', key: 'besar', width: 12 },
      { header: 'SEDANG', key: 'sedang', width: 12 },
      { header: 'KECIL', key: 'kecil', width: 12 },
      { header: 'EXTRA KECIL', key: 'extraKecil', width: 14 },
      { header: 'TOTAL (HA)', key: 'total', width: 14 },
      { header: 'JENIS BIBIT', key: 'jenisBibit', width: 14 },
      { header: 'WILAYAH', key: 'wilayah', width: 12 },
      { header: 'AWAL TANAM', key: 'awalTanam', width: 15 },
      { header: 'SELESAI TANAM', key: 'selesaiTanam', width: 16 },
      { header: 'AKUM TANAM (HA)', key: 'akumTanam', width: 18 },
      { header: '% TANAM', key: 'persenTanam', width: 12 },
      { header: 'PETIK KE-', key: 'petikKe', width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E79' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
        left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Input_Real_Tanam_Petik_Nanas.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error generating template Input Real Tanam & Petik Nanas:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat template Excel.' },
      { status: 500 }
    );
  }
}

