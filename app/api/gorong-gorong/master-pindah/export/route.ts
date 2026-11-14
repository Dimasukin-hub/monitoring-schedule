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
        { lokasiPengirim: { contains: search, mode: 'insensitive' } },
        { lokasiPenerima: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { wilayahPengirim: { contains: wList[0], mode: 'insensitive' } },
              { wilayahPenerima: { contains: wList[0], mode: 'insensitive' } },
            ],
          },
        ];
      } else if (wList.length > 1) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              ...wList.map((w) => ({ wilayahPengirim: { contains: w, mode: 'insensitive' } })),
              ...wList.map((w) => ({ wilayahPenerima: { contains: w, mode: 'insensitive' } })),
            ],
          },
        ];
      }
    }

    const records = await prisma.masterDataPindahGorongGorong.findMany({
      where,
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Data Pindah Lokasi', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi Pengirim', key: 'lokasiPengirim', width: 16 },
      { header: 'Wilayah Pengirim', key: 'wilayahPengirim', width: 16 },
      { header: 'Lokasi Penerima', key: 'lokasiPenerima', width: 16 },
      { header: 'Wilayah Penerima', key: 'wilayahPenerima', width: 16 },
      { header: 'Tanggal Pindah Lokasi', key: 'tanggal', width: 20 },
      { header: 'Ø40 (pcs)', key: 'diameter40', width: 12 },
      { header: 'Ø60 (pcs)', key: 'diameter60', width: 12 },
      { header: 'Ø80 (pcs)', key: 'diameter80', width: 12 },
      { header: 'Ø100 (pcs)', key: 'diameter100', width: 12 },
      { header: 'Keterangan', key: 'keterangan', width: 25 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8B5CF6' }, // Purple theme for Pindah Lokasi
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
        lokasiPengirim: row.lokasiPengirim,
        wilayahPengirim: row.wilayahPengirim || '-',
        lokasiPenerima: row.lokasiPenerima,
        wilayahPenerima: row.wilayahPenerima || '-',
        tanggal: tglStr,
        diameter40: row.diameter40,
        diameter60: row.diameter60,
        diameter80: row.diameter80,
        diameter100: row.diameter100,
        keterangan: row.keterangan || '-',
      });

      r.height = 20;
      r.eachCell((cell, colNumber) => {
        cell.font = { size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        // Center alignment for No, Lokasi, Wilayah, Tanggal, Qty
        if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 4 || colNumber === 5 || colNumber === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber >= 7 && colNumber <= 10) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Master_Data_Pindah_Lokasi_${new Date().toISOString().slice(0, 10)}.xlsx"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error exporting master data pindah:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data master pindah lokasi: ' + error.message },
      { status: 500 }
    );
  }
}

