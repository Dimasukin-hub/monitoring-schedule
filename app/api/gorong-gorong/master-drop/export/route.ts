import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const wilayah = searchParams.get('wilayah');

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        where.wilayah = { contains: wList[0], mode: 'insensitive' };
      } else if (wList.length > 1) {
        where.OR = wList.map((w) => ({ wilayah: { contains: w, mode: 'insensitive' } }));
      }
    }

    const records = await prisma.masterDataDropGorongGorong.findMany({
      where,
      orderBy: [{ wilayah: 'asc' }, { lokasi: 'asc' }, { tanggal: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Data Drop', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
      { header: 'Wilayah', key: 'wilayah', width: 12 },
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Ø40 (pcs)', key: 'diameter40', width: 12 },
      { header: 'Ø60 (pcs)', key: 'diameter60', width: 12 },
      { header: 'Ø80 (pcs)', key: 'diameter80', width: 12 },
      { header: 'Ø100 (pcs)', key: 'diameter100', width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00873D' }, // Green theme for Drop
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

    records.forEach((row, idx) => {
      const tglStr = row.tanggal ? row.tanggal.toISOString().slice(0, 10) : '-';
      const r = worksheet.addRow({
        no: idx + 1,
        lokasi: row.lokasi,
        wilayah: row.wilayah || '-',
        tanggal: tglStr,
        diameter40: row.diameter40,
        diameter60: row.diameter60,
        diameter80: row.diameter80,
        diameter100: row.diameter100,
      });
      r.height = 20;
      r.eachCell((cell, colNum) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: [1, 2, 3, 4].includes(colNum) ? 'center' : 'right',
        };
        cell.font = { size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Master_Data_Drop_PG1_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master data drop:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor master data drop', error: error.message },
      { status: 500 }
    );
  }
}

