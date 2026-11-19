import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah')?.trim() || '';

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { bibitOrdered: { contains: search, mode: 'insensitive' } },
        { jenisUnit: { contains: search, mode: 'insensitive' } },
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

    const [rawDrops, orders, speks] = await Promise.all([
      prisma.masterDataDropBibitSulam.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterDataOrderSulam.findMany({
        select: { lokasi: true, wilayah: true, spekBibit: true, tanggalOrder: true },
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    const orderMap = new Map<string, { spekBibit: string | null; tanggalOrder: Date | null; wilayah: string | null }>();
    for (const ord of orders) {
      const lok = ord.lokasi.trim().toUpperCase();
      if (!orderMap.has(lok)) {
        orderMap.set(lok, { spekBibit: ord.spekBibit, tanggalOrder: ord.tanggalOrder, wilayah: ord.wilayah });
      }
    }

    const spekMap = new Map<string, number>();
    for (const sp of speks) {
      spekMap.set(sp.spekBBSulamBtg.trim().toLowerCase(), sp.cd);
    }

    // Filter wilayah bila diminta
    let filteredDrops = rawDrops;
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      filteredDrops = rawDrops.filter((d) => {
        const lok = d.lokasi.trim().toUpperCase();
        const matched = orderMap.get(lok);
        return matched?.wilayah && wilList.includes(matched.wilayah.toUpperCase());
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Master Drop Sulam', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
      { header: 'Hasil Ha', key: 'hasilHa', width: 12 },
      { header: 'Hasil Btg', key: 'hasilBtg', width: 14 },
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Bibit Ordered', key: 'bibitOrdered', width: 22 },
      { header: 'Std Rit', key: 'stdRit', width: 12 },
      { header: 'Jumlah Rit', key: 'jumlahRit', width: 12 },
      { header: 'Jenis Unit', key: 'jenisUnit', width: 12 },
      { header: 'Tanggal Order', key: 'tanggalOrder', width: 14 },
      { header: 'Status Drop', key: 'statusDrop', width: 14 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD97706' }, // Amber theme
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

    filteredDrops.forEach((d, idx) => {
      const cleanLok = d.lokasi.trim().toUpperCase();
      const matchedOrder = orderMap.get(cleanLok);
      const bibitOrdered = matchedOrder?.spekBibit || d.bibitOrdered || '-';

      let stdRit: number | null = null;
      if (bibitOrdered && bibitOrdered !== '-') {
        const found = spekMap.get(bibitOrdered.trim().toLowerCase());
        if (found !== undefined && found !== null) stdRit = found;
      }
      if (stdRit === null && d.stdRit) stdRit = d.stdRit;

      let jumlahRit: number | string = '-';
      if (d.hasilHa && d.hasilHa > 0 && stdRit && stdRit > 0) {
        jumlahRit = Math.round((d.hasilHa * 73423) / stdRit);
      } else if (d.jumlahRit !== null && d.jumlahRit !== undefined) {
        jumlahRit = d.jumlahRit;
      }

      const tanggalOrder = matchedOrder?.tanggalOrder || d.tanggalOrder || null;
      let statusDrop = '-';
      if (tanggalOrder && d.tanggal) {
        if (new Date(d.tanggal).getTime() > new Date(tanggalOrder).getTime()) {
          statusDrop = 'V';
        }
      } else if (d.statusDrop) {
        statusDrop = d.statusDrop;
      }

      let tglStr = '-';
      if (d.tanggal) {
        const dt = new Date(d.tanggal);
        if (!isNaN(dt.getTime())) {
          tglStr = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
        }
      }

      let tglOrderStr = '-';
      if (tanggalOrder) {
        const dto = new Date(tanggalOrder);
        if (!isNaN(dto.getTime())) {
          tglOrderStr = `${String(dto.getDate()).padStart(2, '0')}/${String(dto.getMonth() + 1).padStart(2, '0')}/${dto.getFullYear()}`;
        }
      }

      const row = worksheet.addRow({
        no: idx + 1,
        lokasi: d.lokasi,
        hasilHa: d.hasilHa ?? 0,
        hasilBtg: d.hasilBtg ?? 0,
        tanggal: tglStr,
        bibitOrdered: bibitOrdered,
        stdRit: stdRit !== null ? stdRit : '-',
        jumlahRit: jumlahRit,
        jenisUnit: d.jenisUnit || 'CD',
        tanggalOrder: tglOrderStr,
        statusDrop: statusDrop,
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
        'Content-Disposition': `attachment; filename="Master_Data_Drop_Bibit_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master drop sulam:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data master drop sulam: ' + error.message },
      { status: 500 }
    );
  }
}
