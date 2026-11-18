import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawDrops = await prisma.masterDataDropBibitSulam.findMany({
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });

    const [orders, speks] = await Promise.all([
      prisma.masterDataOrderSulam.findMany({
        select: { lokasi: true, spekBibit: true, tanggalOrder: true },
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    const orderMap = new Map<string, { spekBibit: string | null; tanggalOrder: Date | null }>();
    for (const ord of orders) {
      const lok = ord.lokasi.trim().toUpperCase();
      if (!orderMap.has(lok)) {
        orderMap.set(lok, { spekBibit: ord.spekBibit, tanggalOrder: ord.tanggalOrder });
      }
    }

    const spekMap = new Map<string, number>();
    for (const sp of speks) {
      spekMap.set(sp.spekBBSulamBtg.trim().toLowerCase(), sp.cd);
    }

    const exportRows = rawDrops.map((d, idx) => {
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

      return {
        'No.': idx + 1,
        'Lokasi': d.lokasi,
        'Hasil Ha': d.hasilHa ?? 0,
        'Hasil Btg': d.hasilBtg ?? 0,
        'Tanggal': d.tanggal ? d.tanggal.toISOString().slice(0, 10) : '-',
        'Bibit Ordered': bibitOrdered,
        'Std Rit': stdRit !== null ? stdRit : '-',
        'Jumlah Rit': jumlahRit,
        'Jenis Unit': d.jenisUnit || 'CD',
        'Tanggal Order': tanggalOrder ? tanggalOrder.toISOString().slice(0, 10) : '-',
        'Status Drop': statusDrop,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Data Drop Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Master_Data_Drop_Bibit_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master drop sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data master drop sulam.' }, { status: 500 });
  }
}
