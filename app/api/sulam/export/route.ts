import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const [listSulam, allDrops, allReals] = await Promise.all([
      prisma.listSulam.findMany({
        orderBy: [{ wilayah: 'asc' }, { lokasi: 'asc' }],
      }),
      prisma.masterDataDropBibitSulam.findMany({}),
      prisma.masterDataRealSulam.findMany({}),
    ]);

    const dropByLok = new Map<string, { totalBtg: number; totalRit: number }>();
    for (const d of allDrops) {
      const lok = d.lokasi.trim().toUpperCase();
      if (!dropByLok.has(lok)) dropByLok.set(lok, { totalBtg: 0, totalRit: 0 });
      const ent = dropByLok.get(lok)!;
      ent.totalBtg += d.hasilBtg || 0;
      ent.totalRit += d.jumlahRit || 0;
    }

    const realByLok = new Map<string, { totalHa: number; totalBtg: number; totalRit: number }>();
    for (const r of allReals) {
      const lok = r.lokasi.trim().toUpperCase();
      if (!realByLok.has(lok)) realByLok.set(lok, { totalHa: 0, totalBtg: 0, totalRit: 0 });
      const ent = realByLok.get(lok)!;
      ent.totalHa += r.hasilHa || 0;
      ent.totalBtg += r.hasilBtg || 0;
      ent.totalRit += r.ritPlanted || 0;
    }

    const exportRows = listSulam.map((item, idx) => {
      const cleanLok = item.lokasi.trim().toUpperCase();
      const drp = dropByLok.get(cleanLok) || { totalBtg: 0, totalRit: 0 };
      const rel = realByLok.get(cleanLok) || { totalHa: 0, totalBtg: 0, totalRit: 0 };

      const rencanaBtg = item.permintaanRitaseBtg || 0;
      const rencanaRit = item.permintaanRitaseRit || 0;
      const dropBtg = drp.totalBtg;
      const dropRit = drp.totalRit;
      const realBtg = rel.totalBtg;
      const realRit = rel.totalRit;
      const realHa = rel.totalHa;

      let umurForcing = item.umurForcing;
      if (item.tglFMax) {
        const diffMs = today.getTime() - new Date(item.tglFMax).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        umurForcing = Math.round(diffDays / 30.4);
      }

      const pctDrop = rencanaBtg > 0 ? Math.min(100, Math.round((dropBtg / rencanaBtg) * 100)) : (dropBtg > 0 ? 100 : 0);
      const pctSulam = rencanaBtg > 0 ? Math.min(100, Math.round((realBtg / rencanaBtg) * 100)) : (realBtg > 0 ? 100 : 0);
      const statusPetak = (rencanaBtg > 0 && realBtg >= rencanaBtg) || item.status === 'Close' ? 'Close' : 'Open';

      return {
        'No.': idx + 1,
        'Wilayah': item.wilayah || 'AW01',
        'Lokasi': item.lokasi,
        'Spek BB': item.spekBB || '-',
        'Tgl Rawat': item.tglRawat ? item.tglRawat.toISOString().slice(0, 10) : '-',
        'Tgl Forcing Max': item.tglFMax ? item.tglFMax.toISOString().slice(0, 10) : '-',
        'Tgl Order': item.tglOrder ? item.tglOrder.toISOString().slice(0, 10) : '-',
        'Umur Forcing (Bulan)': umurForcing !== null && umurForcing !== undefined ? umurForcing : '-',
        'Rencana Batang': rencanaBtg,
        'Rencana Rit': rencanaRit,
        'Drop Batang': dropBtg,
        'Drop Rit': dropRit,
        'Real Tanam Batang': realBtg,
        'Real Tanam Rit': realRit,
        'Real Tanam Ha': parseFloat(realHa.toFixed(2)),
        '% Drop': `${pctDrop}%`,
        '% Sulam': `${pctSulam}%`,
        'Status Petak': statusPetak,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monitoring Sulam PG1');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Monitoring_Sulam_PG1_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting monitoring sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data monitoring sulam.' }, { status: 500 });
  }
}

