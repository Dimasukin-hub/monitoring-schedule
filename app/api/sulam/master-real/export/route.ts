import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [rawData, listSulam, allSpek] = await Promise.all([
      prisma.masterDataRealSulam.findMany({
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
      }),
      prisma.listSulam.findMany({ select: { lokasi: true, spekBibit: true } }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    const listSulamMap = new Map<string, string>();
    for (const l of listSulam) {
      if (l.spekBibit) listSulamMap.set(l.lokasi.trim().toUpperCase(), l.spekBibit.trim());
    }

    const spekMap = new Map<string, number>();
    for (const s of allSpek) {
      spekMap.set(s.spekBBSulamBtg.toLowerCase().trim(), s.cd);
    }

    const exportRows = rawData.map((d, idx) => {
      const cleanLok = d.lokasi.trim().toUpperCase();
      let bibitOrdered = d.bibitOrdered;
      if (!bibitOrdered || bibitOrdered === '-' || bibitOrdered === '0') {
        bibitOrdered = listSulamMap.get(cleanLok) || '-';
      }

      let stdRit = d.stdRit;
      if (!stdRit || stdRit === 0) {
        if (bibitOrdered && bibitOrdered !== '-') {
          stdRit = spekMap.get(bibitOrdered.toLowerCase().trim()) || null;
        }
      }

      let ritPlanted = d.ritPlanted;
      if (ritPlanted === null || ritPlanted === undefined) {
        if (stdRit && stdRit > 0 && d.hasilBtg > 0) {
          ritPlanted = Math.ceil(d.hasilBtg / stdRit);
        }
      }

      return {
        'No.': idx + 1,
        'Lokasi': d.lokasi,
        'Hasil Ha': d.hasilHa ?? '-',
        'Hasil Btg': d.hasilBtg || 0,
        'Tanggal': d.tanggal ? d.tanggal.toISOString().slice(0, 10) : '-',
        'Bibit Ordered': bibitOrdered || '-',
        'Std Rit': stdRit !== null && stdRit !== undefined ? stdRit : '-',
        'Rit Planted': ritPlanted !== null && ritPlanted !== undefined ? ritPlanted : '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Real Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Master_Data_Real_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master real sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data real sulam.' }, { status: 500 });
  }
}

