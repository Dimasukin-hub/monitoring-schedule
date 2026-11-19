import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Template Master Order Sulam', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'Lokasi', key: 'lokasi', width: 14 },
      { header: 'Wilayah', key: 'wilayah', width: 12 },
      { header: 'Tanggal Order', key: 'tanggalOrder', width: 16 },
      { header: 'Jumlah', key: 'jumlah', width: 12 },
      { header: 'Rit', key: 'rit', width: 10 },
      { header: 'Real Rit', key: 'realRit', width: 12 },
      { header: 'Spek Bibit', key: 'spekBibit', width: 22 },
      { header: 'Manual', key: 'manual', width: 10 },
      { header: 'Keterangan Proses', key: 'keteranganProses', width: 22 },
      { header: 'Keterangan Mati', key: 'keteranganMati', width: 20 },
      { header: 'Keterangan Ritase', key: 'keteranganRitase', width: 20 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }, // Emerald theme
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

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Order_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error downloading template master order sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}
