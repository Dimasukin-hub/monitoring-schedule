import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const wilayah = searchParams.get('wilayah');
    const status = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { bibit: { contains: search, mode: 'insensitive' } },
        { statusLengkap: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        where.strucPlant = { contains: wList[0], mode: 'insensitive' };
      } else if (wList.length > 1) {
        where.OR = wList.map((w) => ({ strucPlant: { contains: w, mode: 'insensitive' } }));
      }
    }
    if (status && status !== 'ALL') {
      const sList = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (sList.length === 1) {
        where.status = sList[0];
      } else if (sList.length > 1) {
        where.status = { in: sList };
      }
    }

    const records = await prisma.masterStatusLokasi.findMany({
      where,
      orderBy: [{ strucPlant: 'asc' }, { lokasi: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Status Lokasi', {
      views: [{ showGridLines: true }],
    });

    // Definisi Kolom
    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
      { header: 'Wilayah', key: 'strucPlant', width: 12 },
      { header: 'Status Lengkap', key: 'statusLengkap', width: 16 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Luas Bruto', key: 'luasBruto', width: 12 },
      { header: 'Luas Aktif', key: 'luasAktif', width: 12 },
      { header: 'Luas Netto', key: 'luasNetto', width: 12 },
      { header: 'Bibit', key: 'bibit', width: 14 },
      { header: 'Kelas', key: 'kelas', width: 8 },
      { header: 'Jenis', key: 'jenis', width: 8 },
      { header: 'Perubahan Sts', key: 'perubahanSts', width: 14 },
      { header: 'Tgl Rawat', key: 'tglRawat', width: 14 },
      { header: 'Umur Bln', key: 'umurBulan', width: 10 },
      { header: 'Forcing Std', key: 'forcingStd', width: 14 },
      { header: 'Forcing Prod 2026', key: 'forcingProd2026', width: 16 },
      { header: 'Forcing 2027', key: 'forcing2027', width: 14 },
      { header: 'Ket. Forcing', key: 'ketForcing2027', width: 12 },
      { header: 'Fix Forcing', key: 'fixForcing', width: 14 },
      { header: 'Umur F Std', key: 'umurFStd', width: 12 },
      { header: 'Umur F Prod', key: 'umurFProd', width: 12 },
    ];

    // Styling Header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00873D' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'medium', color: { argb: 'FF005522' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    });

    const formatDate = (d: Date | null) => {
      if (!d) return '-';
      return d.toISOString().slice(0, 10);
    };

    records.forEach((r, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        lokasi: r.lokasi,
        strucPlant: r.strucPlant || '-',
        statusLengkap: r.statusLengkap || '-',
        status: r.status || '-',
        luasBruto: r.luasBruto != null ? Number(r.luasBruto.toFixed(2)) : null,
        luasAktif: r.luasAktif != null ? Number(r.luasAktif.toFixed(2)) : null,
        luasNetto: r.luasNetto != null ? Number(r.luasNetto.toFixed(2)) : null,
        bibit: r.bibit || '-',
        kelas: r.kelas || '-',
        jenis: r.jenis || '-',
        perubahanSts: r.perubahanSts || '-',
        tglRawat: formatDate(r.tglRawat),
        umurBulan: r.umurBulan ?? '-',
        forcingStd: formatDate(r.forcingStd),
        forcingProd2026: formatDate(r.forcingProd2026),
        forcing2027: formatDate(r.forcing2027),
        ketForcing2027: r.ketForcing2027 || '-',
        fixForcing: formatDate(r.fixForcing),
        umurFStd: r.umurFStd ?? '-',
        umurFProd: r.umurFProd ?? '-',
      });

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: [1, 2, 3, 5, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21].includes(colNumber)
            ? 'center'
            : [6, 7, 8].includes(colNumber)
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
        'Content-Disposition': `attachment; filename="Master_Status_Lokasi_PG1_${timestamp}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master status lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data master status lokasi', error: error.message },
      { status: 500 }
    );
  }
}

