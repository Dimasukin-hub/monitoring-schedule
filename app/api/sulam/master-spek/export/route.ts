import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { spekBBSulamBtg: { contains: search, mode: 'insensitive' } },
        { spesifikasi: { contains: search, mode: 'insensitive' } },
        { keterangan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.masterSpekBibitSulam.findMany({
      where,
      orderBy: [{ spekBBSulamBtg: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Master Spek Bibit', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Spek BB Sulam Btg', key: 'spekBBSulamBtg', width: 24 },
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

    records.forEach((d, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        spekBBSulamBtg: d.spekBBSulamBtg,
        cd: d.cd ?? 0,
        fuso: d.fuso ?? 0,
        spesifikasi: d.spesifikasi || '-',
        keterangan: d.keterangan || '-',
      });

      row.height = 20;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        cell.font = { size: 9 };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Master_Data_Spek_Bibit_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master spek bibit sulam:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data master spek bibit sulam: ' + error.message },
      { status: 500 }
    );
  }
}
