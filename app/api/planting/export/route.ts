import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const jenisBibit = searchParams.get('jenisBibit');
    const kelasBibit = searchParams.get('kelasBibit');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'lokasi';
    const sortOrder = (searchParams.get('sortOrder')?.toLowerCase() || 'asc') as 'asc' | 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { jenisBibit: { contains: search, mode: 'insensitive' } },
        { kelasBibit: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (jenisBibit && jenisBibit !== 'ALL') {
      const list = jenisBibit.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        where.jenisBibit = { equals: list[0], mode: 'insensitive' };
      } else if (list.length > 1) {
        where.jenisBibit = { in: list, mode: 'insensitive' };
      }
    }

    if (kelasBibit && kelasBibit !== 'ALL') {
      const list = kelasBibit.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        where.kelasBibit = { equals: list[0], mode: 'insensitive' };
      } else if (list.length > 1) {
        where.kelasBibit = { in: list, mode: 'insensitive' };
      }
    }

    if (status && status !== 'ALL') {
      const list = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        where.status = { equals: list[0], mode: 'insensitive' };
      } else if (list.length > 1) {
        where.status = { in: list, mode: 'insensitive' };
      }
    }

    const items = await prisma.planting.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Real Tanam Nanas', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const columns = [
      { header: 'NO', key: 'no' },
      { header: 'LOKASI', key: 'lokasi' },
      { header: 'JENIS BIBIT', key: 'jenisBibit' },
      { header: 'KELAS BIBIT', key: 'kelasBibit' },
      { header: 'STATUS', key: 'status' },
      { header: 'AWAL TANAM', key: 'awalTanam' },
      { header: 'EST. SELESAI', key: 'estSelesai' },
      { header: 'LEADTIME (HARI)', key: 'leadtime' },
      { header: 'LUAS (HA)', key: 'luas' },
      { header: 'REAL TANAM (HA)', key: 'realTanam' },
      { header: 'SISA (HA)', key: 'sisa' },
      { header: 'PROGRESS (%)', key: 'progress' },
    ];

    worksheet.columns = columns;

    // Header styling: Background Biru Muda (#D9E1F2), Bold, Center Alignment
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }, // Soft Corporate Light Blue
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E79' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
        left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      };
    });

    // Populate data rows with center alignment and clean borders
    items.forEach((item, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        lokasi: item.lokasi,
        jenisBibit: item.jenisBibit || '-',
        kelasBibit: item.kelasBibit || '-',
        status: item.status || 'BELUM TANAM',
        awalTanam: item.awalTanam || '-',
        estSelesai: item.estSelesai || '-',
        leadtime: item.leadtime !== null ? item.leadtime : '-',
        luas: item.luas !== null ? parseFloat(item.luas.toFixed(2)) : 0,
        realTanam: item.realTanam !== null ? parseFloat(item.realTanam.toFixed(2)) : 0,
        sisa: item.sisa !== null ? parseFloat(item.sisa.toFixed(2)) : 0,
        progress: item.progress !== null ? `${item.progress}%` : '0%',
      });
      row.height = 20;

      const isOdd = idx % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (isOdd) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      });
    });

    // Aktifkan Filter Otomatis
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: items.length + 1, column: columns.length },
    };

    // Sesuaikan ukuran lebar kolom dengan isian selnya
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.min(Math.max(maxLen + 3, 9), 24);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Planting_Real_Tanam_Nanas_${dateStr}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting planting data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
