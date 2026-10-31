import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim() || '';
    const sortField = searchParams.get('sortField')?.trim() || 'tanggalDate';
    const sortOrder = (searchParams.get('sortOrder')?.trim() || 'asc') as 'asc' | 'desc';

    const wilayahList = (searchParams.get('wilayah') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const aktivitasList = (searchParams.get('aktivitas') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const jenisBibitList = (searchParams.get('jenisBibit') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const monthList = (searchParams.get('month') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { lokasi: { contains: search, mode: 'insensitive' } },
          { wilayah: { contains: search, mode: 'insensitive' } },
          { tanggal: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (wilayahList.length > 0) {
      conditions.push({
        wilayah: { in: wilayahList, mode: 'insensitive' },
      });
    }

    if (aktivitasList.length > 0) {
      conditions.push({
        aktivitas: { in: aktivitasList, mode: 'insensitive' },
      });
    }

    if (jenisBibitList.length > 0) {
      conditions.push({
        jenisBibit: { in: jenisBibitList, mode: 'insensitive' },
      });
    }

    if (monthList.length > 0) {
      const monthOr = monthList.map((m) => ({
        tanggal: { contains: `/${m}/`, mode: 'insensitive' },
      }));
      conditions.push({ OR: monthOr });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const items = await prisma.plantingDetail.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Input Real Tanam & Petik', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const columns = [
      { header: 'No', key: 'no' },
      { header: 'Tanggal', key: 'tanggal' },
      { header: 'Lokasi', key: 'lokasi' },
      { header: 'Luas Netto (Ha)', key: 'luasNetto' },
      { header: 'Aktivitas', key: 'aktivitas' },
      { header: 'Standar (Ha)', key: 'standar' },
      { header: 'Besar (Ha)', key: 'besar' },
      { header: 'Sedang (Ha)', key: 'sedang' },
      { header: 'Kecil (Ha)', key: 'kecil' },
      { header: 'Extra Kecil (Ha)', key: 'extraKecil' },
      { header: 'Total (Ha)', key: 'total' },
      { header: 'Jenis Bibit', key: 'jenisBibit' },
      { header: 'Wilayah', key: 'wilayah' },
      { header: 'Awal Tanam', key: 'awalTanam' },
      { header: 'Selesai Tanam', key: 'selesaiTanam' },
      { header: 'Akum Tanam (Ha)', key: 'akumTanam' },
      { header: '% Tanam', key: 'persenTanam' },
      { header: 'Petik Ke', key: 'petikKe' },
    ];

    worksheet.columns = columns;

    // Header styling: Background Biru Muda (#D9E1F2), Bold, Center Alignment
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
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

    items.forEach((item, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        tanggal: item.tanggal || '-',
        lokasi: item.lokasi || '-',
        luasNetto: item.luasNetto !== null ? parseFloat(item.luasNetto.toFixed(2)) : '-',
        aktivitas: item.aktivitas || '-',
        standar: item.standar !== null ? parseFloat(item.standar.toFixed(2)) : 0,
        besar: item.besar !== null ? parseFloat(item.besar.toFixed(2)) : 0,
        sedang: item.sedang !== null ? parseFloat(item.sedang.toFixed(2)) : 0,
        kecil: item.kecil !== null ? parseFloat(item.kecil.toFixed(2)) : 0,
        extraKecil: item.extraKecil !== null ? parseFloat(item.extraKecil.toFixed(2)) : 0,
        total: parseFloat(item.total.toFixed(2)),
        jenisBibit: item.jenisBibit || '-',
        wilayah: item.wilayah || '-',
        awalTanam: item.awalTanam || '-',
        selesaiTanam: item.selesaiTanam || '-',
        akumTanam: item.akumTanam !== null ? parseFloat(item.akumTanam.toFixed(2)) : '-',
        persenTanam: item.persenTanam !== null ? `${(item.persenTanam * 100).toFixed(1)}%` : '-',
        petikKe: item.petikKe || '-',
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
    const filename = `Input_Real_Tanam_Petik_Nanas_${dateStr}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting transactions data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
