import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category')?.toUpperCase() || 'ALL';
    const wilayah = searchParams.get('wilayah') || 'ALL';
    const status = searchParams.get('status') || 'ALL';

    const andConditions: any[] = [];

    if (category && category !== 'ALL') {
      andConditions.push({ category });
    }

    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        andConditions.push({ wilayah: wList[0] });
      } else if (wList.length > 1) {
        andConditions.push({ wilayah: { in: wList } });
      }
    }

    if (status && status !== 'ALL') {
      const sList = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (sList.length === 1) {
        andConditions.push({ status: { contains: sList[0], mode: 'insensitive' } });
      } else if (sList.length > 1) {
        andConditions.push({
          OR: sList.map((s) => ({ status: { contains: s, mode: 'insensitive' } })),
        });
      }
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const allLands = await prisma.stokLahanMaster.findMany({
      where,
      orderBy: { lokasi: 'asc' },
    });

    const catLabelMap: Record<string, string> = {
      BK: 'BK (Bongkar & Sanitasi)',
      BJK: 'BJK (Bajak & Olah Tanah)',
      SN: 'SN (Siap Tanam)',
      PROSES: 'Proses Tanam',
      SELESAI: 'Selesai Tanam',
    };

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Stok Lahan ${category}`, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const columns = [
      { header: 'No', key: 'no' },
      { header: 'Wilayah', key: 'wilayah' },
      { header: 'Lokasi', key: 'lokasi' },
      { header: 'Luas Bruto (Ha)', key: 'luasBruto' },
      { header: 'Luas Netto (Ha)', key: 'luasNetto' },
      { header: 'Status', key: 'status' },
      { header: 'Eks', key: 'eks' },
      { header: 'Sejarah', key: 'sejarah' },
      { header: 'pH BK', key: 'phBk' },
      { header: 'pH SN', key: 'phSn' },
      { header: 'Aktivitas Terakhir', key: 'aplikasiTerakhir' },
      { header: 'Kategori Stok', key: 'category' },
    ];

    worksheet.columns = columns;

    // Header styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }, // Soft Corporate Light Blue
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E79' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
        left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      };
    });

    // Populate data rows
    allLands.forEach((l, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        wilayah: l.wilayah,
        lokasi: l.lokasi,
        luasBruto: l.luasBruto ? parseFloat(l.luasBruto.toFixed(2)) : 0,
        luasNetto: l.luasNetto ? parseFloat(l.luasNetto.toFixed(2)) : 0,
        status: l.status ? l.status.replace(/\d+/g, '').trim() : '',
        eks: l.eks || '-',
        sejarah: l.sejarah || '-',
        phBk: l.phBk ?? '-',
        phSn: l.phSn ?? '-',
        aplikasiTerakhir: l.aplikasiTerakhir || 'Tahap Bongkar',
        category: catLabelMap[l.category || 'BK'] || l.category || 'BK',
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

    // AutoFilter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: allLands.length + 1, column: columns.length },
    };

    // Auto-fit column width
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value ? String(cell.value) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.min(Math.max(maxLen + 3, 9), 28);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Stok_Lahan_${category}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting stok lands:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
