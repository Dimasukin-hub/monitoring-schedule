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
        { lokasi: { contains: search, mode: 'insensitive' } },
        { bibitOrdered: { contains: search, mode: 'insensitive' } },
      ];
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
        where.tanggal = { gte: startDate, lte: endDate };
      }
    }

    const [rawData, listSulam, allSpek] = await Promise.all([
      prisma.masterDataRealSulam.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
      }),
      prisma.listSulam.findMany({ select: { lokasi: true, spekBibit: true } }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    const listSulamMap = new Map<string, string>();
    for (const l of listSulam) {
      if (l.spekBibit) listSulamMap.set(l.lokasi.trim().toUpperCase(), l.spekBibit.trim());
    }

    const spekMap = new Map<string, number>();
    for (const s of allSpek) {
      spekMap.set(s.spekBBSulamBtg.toLowerCase().trim(), s.cd);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Master Real Sulam', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
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

    rawData.forEach((d, idx) => {
      const cleanLok = d.lokasi.trim().toUpperCase();
      let bibitOrdered = d.bibitOrdered;
      if (!bibitOrdered || bibitOrdered === '-' || bibitOrdered === '0') {
        bibitOrdered = listSulamMap.get(cleanLok) || '-';
      }

      let stdRit = d.stdRit;
      if (!stdRit || stdRit === 0) {
        if (bibitOrdered && bibitOrdered !== '-') {
          stdRit = spekMap.get(bibitOrdered.toLowerCase().trim()) || null;
        }
      }

      let ritPlanted = d.ritPlanted;
      if (ritPlanted === null || ritPlanted === undefined) {
        if (stdRit && stdRit > 0 && d.hasilBtg > 0) {
          ritPlanted = Math.ceil(d.hasilBtg / stdRit);
        }
      }

      let tglStr = '-';
      if (d.tanggal) {
        const dt = new Date(d.tanggal);
        if (!isNaN(dt.getTime())) {
          tglStr = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
        }
      }

      const row = worksheet.addRow({
        no: idx + 1,
        lokasi: d.lokasi,
        hasilHa: d.hasilHa ?? 0,
        hasilBtg: d.hasilBtg || 0,
        tanggal: tglStr,
        bibitOrdered: bibitOrdered || '-',
        stdRit: stdRit !== null && stdRit !== undefined ? stdRit : '-',
        ritPlanted: ritPlanted !== null && ritPlanted !== undefined ? ritPlanted : '-',
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
        'Content-Disposition': `attachment; filename="Master_Data_Real_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master real sulam:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data master real sulam: ' + error.message },
      { status: 500 }
    );
  }
}
