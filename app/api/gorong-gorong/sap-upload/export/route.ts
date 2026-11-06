import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const diameter = searchParams.get('diameter');
    const bulan = searchParams.get('bulan');

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { spkId: { contains: search, mode: 'insensitive' } },
        { pasDocument: { contains: search, mode: 'insensitive' } },
        { penanggungJawab: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (diameter && diameter !== 'ALL') {
      const dList = diameter.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => !isNaN(n));
      if (dList.length === 1) {
        where.diameter = dList[0];
      } else if (dList.length > 1) {
        where.diameter = { in: dList };
      }
    }

    if (bulan && bulan !== 'ALL') {
      const bList = bulan.split(',').map((b) => b.trim()).filter(Boolean);
      const dateFilters: any[] = [];
      const curYear = new Date().getFullYear();

      for (const b of bList) {
        if (b.includes('-')) {
          const [yStr, mStr] = b.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          if (!isNaN(y) && !isNaN(m)) {
            const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
            const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
            dateFilters.push({
              tanggalRealisasi: { gte: startDate, lte: endDate },
            });
          }
        } else {
          const m = parseInt(b, 10);
          if (!isNaN(m) && m >= 1 && m <= 12) {
            const startDate = new Date(Date.UTC(curYear, m - 1, 1, 0, 0, 0));
            const endDate = new Date(Date.UTC(curYear, m, 0, 23, 59, 59, 999));
            dateFilters.push({
              tanggalRealisasi: { gte: startDate, lte: endDate },
            });
          }
        }
      }

      if (dateFilters.length === 1) {
        where.tanggalRealisasi = dateFilters[0].tanggalRealisasi;
      } else if (dateFilters.length > 1) {
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: dateFilters }];
          delete where.OR;
        } else {
          where.OR = dateFilters;
        }
      }
    }

    // Ambil data SAP dari database
    const records = await prisma.masterSapGorongGorong.findMany({
      where,
      orderBy: { tanggalRealisasi: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring Schedule Gorong-Gorong PG1';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Data Realisasi SAP', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Wilayah', key: 'wilayah', width: 14 },
      { header: 'Lokasi', key: 'lokasi', width: 14 },
      { header: 'Status tanaman', key: 'statusTanaman', width: 16 },
      { header: 'SPK ID', key: 'spkId', width: 18 },
      { header: 'PAS Document', key: 'pasDocument', width: 18 },
      { header: 'Tanggal Realisasi', key: 'tanggalRealisasi', width: 18 },
      { header: 'Deskripsi', key: 'deskripsi', width: 28 },
      { header: 'Deskripsi Bahan/Alat/Lainlain', key: 'deskripsiBahan', width: 42 },
      { header: 'Jenis Data', key: 'jenisData', width: 14 },
      { header: 'Kode Bahan/Alat/Lainlain', key: 'kodeBahan', width: 20 },
      { header: 'Resource Bahan/Alat', key: 'qty', width: 20 },
      { header: 'Hasil Efektif', key: 'hasilEfektif', width: 15 },
      { header: 'Total Realisasi Biaya', key: 'totalBiaya', width: 22 },
      { header: 'Penanggung Jawab', key: 'penanggungJawab', width: 20 },
      { header: 'Time', key: 'time', width: 14 },
      { header: 'Air', key: 'air', width: 10 },
      { header: 'Jumlah Air', key: 'jumlahAir', width: 14 },
      { header: 'Referensi Lokasi', key: 'referensiLokasi', width: 18 },
    ];

    ws.columns = columns;

    // Header styling: Soft Light Blue Corporate
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF1E293B' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
        left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      };
    });

    // Helper format waktu
    const formatTimeStr = (val: number | string | null) => {
      if (val == null || val === '') return '-';
      if (typeof val === 'string' && val.includes(':')) return val.trim();
      const num = Number(val);
      if (isNaN(num)) return String(val);
      const fraction = num % 1;
      const totalSeconds = Math.round((fraction >= 0 ? fraction : fraction + 1) * 86400);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    records.forEach((r, idx) => {
      const tglStr = r.tanggalRealisasi ? new Date(r.tanggalRealisasi).toISOString().slice(0, 10) : '-';
      const row = ws.addRow({
        no: idx + 1,
        wilayah: r.wilayahSap || '-',
        lokasi: r.plantCostCenter || r.lokasi || '-',
        statusTanaman: r.statusTanaman || '-',
        spkId: r.spkId || '-',
        pasDocument: r.pasDocument || '-',
        tanggalRealisasi: tglStr,
        deskripsi: r.deskripsiKegiatan || '-',
        deskripsiBahan: r.deskripsiBahan || '-',
        jenisData: r.jenisData || '-',
        kodeBahan: r.kodeBahan || '-',
        qty: r.qty ?? 0,
        hasilEfektif: r.hasilEfektif ?? 0,
        totalBiaya: r.totalBiaya ?? 0,
        penanggungJawab: r.penanggungJawab || '-',
        time: formatTimeStr(r.waktuPelaksanaan),
        air: r.air ?? 0,
        jumlahAir: r.jumlahAir ?? 0,
        referensiLokasi: r.referensiLokasi || '-',
      });

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
        // Center alignment untuk No, Wilayah, Lokasi, Status tanaman, SPK, PAS Doc, Tanggal, Jenis, Kode, Qty, Hasil, PJ, Time, Air, Jml Air, Ref
        if ([1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 15, 16, 17, 18, 19].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 14) {
          // Total Realisasi Biaya rata kanan currency
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0';
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Data_Realisasi_SAP_Form630_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating SAP export excel:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor data realisasi SAP.', error: error.message },
      { status: 500 }
    );
  }
}
