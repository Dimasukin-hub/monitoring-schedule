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
        { spekBibit: { contains: search, mode: 'insensitive' } },
        { keteranganProses: { contains: search, mode: 'insensitive' } },
        { keteranganMati: { contains: search, mode: 'insensitive' } },
        { keteranganRitase: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      where.wilayah = { in: wilList };
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
        where.tanggalOrder = { gte: startDate, lte: endDate };
      }
    }

    const records = await prisma.masterDataOrderSulam.findMany({
      where,
      orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Master Order Sulam', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
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

    records.forEach((rec, idx) => {
      let tglStr = '-';
      if (rec.tanggalOrder) {
        const d = new Date(rec.tanggalOrder);
        if (!isNaN(d.getTime())) {
          tglStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }
      }

      const row = worksheet.addRow({
        no: idx + 1,
        lokasi: rec.lokasi,
        wilayah: rec.wilayah || '-',
        tanggalOrder: tglStr,
        jumlah: rec.jumlah ?? 0,
        rit: rec.rit ?? 0,
        realRit: rec.realRit ?? 0,
        spekBibit: rec.spekBibit || '-',
        manual: rec.manual ?? 0,
        keteranganProses: rec.keteranganProses || '-',
        keteranganMati: rec.keteranganMati || '-',
        keteranganRitase: rec.keteranganRitase || '-',
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
        'Content-Disposition': `attachment; filename="Master_Data_Order_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master order sulam:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data master order sulam: ' + error.message },
      { status: 500 }
    );
  }
}
