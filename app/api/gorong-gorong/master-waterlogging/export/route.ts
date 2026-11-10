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
        { dsmbkPlot: { contains: search, mode: 'insensitive' } },
        { dsmPlot: { contains: search, mode: 'insensitive' } },
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

    const records = await prisma.masterWaterlogging.findMany({
      where,
      orderBy: [{ wilayah: 'asc' }, { lokasi: 'asc' }],
    });

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

    records.forEach((r, idx) => {
      const row = worksheet.addRow({
        no: r.no ?? idx + 1,
        pg: r.pg || 'PG1',
        wilayah: r.wilayah || '-',
        lokasi: r.lokasi,
        luasHa: r.luasHa != null ? Number(r.luasHa.toFixed(2)) : null,
        komoditas: r.komoditas || '-',
        bulanDsmBk: r.bulanDsmBk || '-',
        tahunDsmBk: r.tahunDsmBk ?? '-',
        dsmbkPlot: r.dsmbkPlot || '-',
        dryBk: r.dryBk || '-',
        bulanDsmSt: r.bulanDsmSt || '-',
        tahunDsmSt: r.tahunDsmSt ?? '-',
        dsmPlot: r.dsmPlot || '-',
        drySt: r.drySt || '-',
      });

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14].includes(colNumber)
            ? 'center'
            : colNumber === 5
            ? 'right'
            : 'left',
        };
        cell.font = { size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE8E8E8' } },
          bottom: { style: 'thin', color: { argb: 'FFE8E8E8' } },
          left: { style: 'thin', color: { argb: 'FFE8E8E8' } },
          right: { style: 'thin', color: { argb: 'FFE8E8E8' } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const timestamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Master_Waterlogging_PG1_${timestamp}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master waterlogging:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data master waterlogging', error: error.message },
      { status: 500 }
    );
  }
}

