import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Template Master Real Sulam', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'Lokasi', key: 'lokasi', width: 14 },
      { header: 'Hasil Ha', key: 'hasilHa', width: 12 },
      { header: 'Hasil Btg', key: 'hasilBtg', width: 14 },
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Bibit Ordered', key: 'bibitOrdered', width: 22 },
      { header: 'Std Rit (CD)', key: 'stdRit', width: 14 },
      { header: 'Rit Planted', key: 'ritPlanted', width: 14 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D9488' }, // Teal theme
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
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Real_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error downloading template master real sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}
