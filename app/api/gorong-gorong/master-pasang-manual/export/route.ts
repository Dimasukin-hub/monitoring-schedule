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

    const yearParam = searchParams.get('year');
    const startMonthParam = searchParams.get('startMonth');
    const endMonthParam = searchParams.get('endMonth');
    if (yearParam !== null && startMonthParam !== null && endMonthParam !== null) {
      const year = parseInt(yearParam, 10);
      const startMonth = parseInt(startMonthParam, 10);
      const endMonth = parseInt(endMonthParam, 10);
      if (!isNaN(year) && !isNaN(startMonth) && !isNaN(endMonth)) {
        const minM = Math.min(startMonth, endMonth);
        const maxM = Math.max(startMonth, endMonth);
        const startDate = new Date(Date.UTC(year, minM, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, maxM + 1, 0, 23, 59, 59, 999));
        where.tanggalPasangManual = { gte: startDate, lte: endDate };
      }
    }

    const records = await prisma.masterDataPasangManual.findMany({
      where,
      orderBy: [{ wilayah: 'asc' }, { lokasi: 'asc' }, { tanggalPasangManual: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Data Pasang Manual', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
      { header: 'Wilayah', key: 'wilayah', width: 12 },
      { header: 'Tanggal Pasang Manual', key: 'tanggalPasangManual', width: 22 },
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
        fgColor: { argb: 'FF0D9488' }, // Teal theme for Pasang Manual
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

    records.forEach((rec, idx) => {
      let tglStr = '-';
      if (rec.tanggalPasangManual) {
        const d = new Date(rec.tanggalPasangManual);
        if (!isNaN(d.getTime())) {
          tglStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
      }

      const row = worksheet.addRow({
        no: idx + 1,
        lokasi: rec.lokasi,
        wilayah: rec.wilayah || '-',
        tanggalPasangManual: tglStr,
        diameter40: rec.diameter40 || 0,
        diameter60: rec.diameter60 || 0,
        diameter80: rec.diameter80 || 0,
        diameter100: rec.diameter100 || 0,
      });

      row.height = 20;
      row.eachCell((cell, colNum) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 1 || colNum === 2 || colNum === 3 || colNum === 4 ? 'center' : 'right',
        };
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
        'Content-Disposition': `attachment; filename="Master_Data_Pasang_Manual_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master data pasang manual:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunduh Excel Master Data Pasang Manual: ' + error.message },
      { status: 500 }
    );
  }
}
