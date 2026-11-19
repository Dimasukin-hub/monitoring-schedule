import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Template Master Spek Bibit', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'Spek BB Sulam Btg', key: 'spekBBSulamBtg', width: 26 },
      { header: 'CD', key: 'cd', width: 12 },
      { header: 'Fuso', key: 'fuso', width: 12 },
      { header: 'Spesifikasi', key: 'spesifikasi', width: 28 },
      { header: 'Keterangan', key: 'keterangan', width: 24 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' }, // Teal 700 theme
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
        'Content-Disposition': 'attachment; filename="Template_Master_Data_Spek_Bibit_Sulam.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error downloading template master spek bibit sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengunduh template.' }, { status: 500 });
  }
}
