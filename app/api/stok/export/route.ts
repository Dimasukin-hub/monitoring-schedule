import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';
import { getLandStokCategory } from '@/lib/landClassification';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category')?.toUpperCase() || 'ALL';
    const wilayah = searchParams.get('wilayah') || 'ALL';
    const status = searchParams.get('status') || 'ALL';

    const andConditions: any[] = [];

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

    const allLands = await prisma.land.findMany({
      where,
      select: {
        id: true,
        lokasi: true,
        wilayah: true,
        luasBruto: true,
        luasNetto: true,
        status: true,
        eks: true,
        sejarah: true,
        phBk: true,
        phSn: true,
        aplikasiTerakhir: true,
        statusAplikasi: true,
        realBajak: true,
        realBkr: true,
        realMulaiTanam: true,
        realSelesaiTanam: true,
        progressTanam: true,
        activities: {
          select: { code: true, status: true, realisasiDate: true },
        },
      },
      orderBy: { lokasi: 'asc' },
    });

    const rows: any[] = [];

    for (const l of allLands) {
      const cat = getLandStokCategory(l);

      if (category !== 'ALL' && cat !== category) {
        continue;
      }

      const catLabelMap: Record<string, string> = {
        BK: 'BK (Bongkar & Sanitasi)',
        BJK: 'BJK (Bajak & Olah Tanah)',
        SN: 'SN (Siap Tanam)',
        PROSES: 'Proses Tanam',
        SELESAI: 'Selesai Tanam',
      };

      rows.push({
        'Wilayah': l.wilayah,
        'Lokasi': l.lokasi,
        'Luas Bruto (Ha)': l.luasBruto ? Number(l.luasBruto.toFixed(2)) : 0,
        'Luas Netto (Ha)': l.luasNetto ? Number(l.luasNetto.toFixed(2)) : 0,
        'Status': l.status ? l.status.replace(/\d+/g, '').trim() : '',
        'Eks': l.eks || '',
        'Sejarah': l.sejarah || '',
        'pH BK': l.phBk ?? '',
        'pH SN': l.phSn ?? '',
        'Aktivitas Terakhir': l.aplikasiTerakhir || '',
        'Kategori Stok': catLabelMap[cat] || cat,
      });
    }

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, `Stok Lahan ${category}`);

    // Auto column widths
    const colWidths = [
      { wch: 10 }, // Wilayah
      { wch: 12 }, // Lokasi
      { wch: 16 }, // Luas Bruto
      { wch: 16 }, // Luas Netto
      { wch: 12 }, // Status
      { wch: 10 }, // Eks
      { wch: 22 }, // Sejarah
      { wch: 10 }, // pH BK
      { wch: 10 }, // pH SN
      { wch: 22 }, // Aktivitas Terakhir
      { wch: 26 }, // Kategori Stok
    ];
    worksheet['!cols'] = colWidths;

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `Stok_Lahan_${category}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
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
