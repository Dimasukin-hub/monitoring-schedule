import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Waterlogging', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'PG', key: 'pg', width: 8 },
      { header: 'Wilayah', key: 'wilayah', width: 12 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
      { header: 'Luas (Ha)', key: 'luasHa', width: 12 },
      { header: 'Komoditas', key: 'komoditas', width: 14 },
      { header: 'Bulan DSM BK', key: 'bulanDsmBk', width: 14 },
      { header: 'Tahun DSM BK', key: 'tahunDsmBk', width: 14 },
      { header: 'DSM BK Plot', key: 'dsmbkPlot', width: 14 },
      { header: 'Dry BK', key: 'dryBk', width: 12 },
      { header: 'Bulan DSM ST', key: 'bulanDsmSt', width: 14 },
      { header: 'Tahun DSM ST', key: 'tahunDsmSt', width: 14 },
      { header: 'DSM ST Plot', key: 'dsmPlot', width: 14 },
      { header: 'Dry ST', key: 'drySt', width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'medium', color: { argb: 'FF0369A1' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Waterlogging.xlsx"',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating template master waterlogging:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat template Master Waterlogging: ' + error.message },
      { status: 500 }
    );
  }
}

