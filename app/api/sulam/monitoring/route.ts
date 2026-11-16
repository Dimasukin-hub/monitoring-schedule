import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah')?.trim() || '';

    const whereList: any = {};
    if (search) {
      whereList.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { spekBB: { contains: search, mode: 'insensitive' } },
        { keterangan: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      whereList.wilayah = { in: wilList };
    }

    const today = new Date();
    const [listSulam, allOrders, allDrops, allReals] = await Promise.all([
      prisma.listSulam.findMany({
        where: whereList,
        orderBy: [{ wilayah: 'asc' }, { lokasi: 'asc' }],
      }),
      prisma.masterDataOrderSulam.findMany({}),
      prisma.masterDataDropBibitSulam.findMany({}),
      prisma.masterDataRealSulam.findMany({}),
    ]);

    // Grouping per lokasi
    const dropByLok = new Map<string, { totalBtg: number; totalRit: number; lastDate: Date | null }>();
    for (const d of allDrops) {
      const lok = d.lokasi.trim().toUpperCase();
      if (!dropByLok.has(lok)) dropByLok.set(lok, { totalBtg: 0, totalRit: 0, lastDate: null });
      const ent = dropByLok.get(lok)!;
      ent.totalBtg += d.hasilBtg || 0;
      ent.totalRit += d.jumlahRit || 0;
      if (d.tanggalDrop && (!ent.lastDate || d.tanggalDrop > ent.lastDate)) {
        ent.lastDate = d.tanggalDrop;
      }
    }

    const realByLok = new Map<string, { totalHa: number; totalBtg: number; totalRit: number; lastDate: Date | null }>();
    for (const r of allReals) {
      const lok = r.lokasi.trim().toUpperCase();
      if (!realByLok.has(lok)) realByLok.set(lok, { totalHa: 0, totalBtg: 0, totalRit: 0, lastDate: null });
      const ent = realByLok.get(lok)!;
      ent.totalHa += r.hasilHa || 0;
      ent.totalBtg += r.hasilBtg || 0;
      ent.totalRit += r.ritPlanted || 0;
      if (r.tanggal && (!ent.lastDate || r.tanggal > ent.lastDate)) {
        ent.lastDate = r.tanggal;
      }
    }

    let totalRencanaBtg = 0;
    let totalRencanaRit = 0;
    let totalDropBtg = 0;
    let totalDropRit = 0;
    let totalRealBtg = 0;
    let totalRealRit = 0;
    let totalRealHa = 0;

    const rows = listSulam.map((item) => {
      const cleanLok = item.lokasi.trim().toUpperCase();
      const drp = dropByLok.get(cleanLok) || { totalBtg: 0, totalRit: 0, lastDate: null };
      const rel = realByLok.get(cleanLok) || { totalHa: 0, totalBtg: 0, totalRit: 0, lastDate: null };

      const rencanaBtg = item.permintaanRitaseBtg || 0;
      const rencanaRit = item.permintaanRitaseRit || 0;
      const dropBtg = drp.totalBtg;
      const dropRit = drp.totalRit;
      const realBtg = rel.totalBtg;
      const realRit = rel.totalRit;
      const realHa = rel.totalHa;

      totalRencanaBtg += rencanaBtg;
      totalRencanaRit += rencanaRit;
      totalDropBtg += dropBtg;
      totalDropRit += dropRit;
      totalRealBtg += realBtg;
      totalRealRit += realRit;
      totalRealHa += realHa;

      // Umur forcing
      let umurForcing = item.umurForcing;
      if (item.tglFMax) {
        const diffMs = today.getTime() - new Date(item.tglFMax).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        umurForcing = Math.round(diffDays / 30.4);
      }

      // Status Sulam: Close jika real btg >= rencana btg & rencana btg > 0, else Open
      const pctDrop = rencanaBtg > 0 ? Math.min(100, Math.round((dropBtg / rencanaBtg) * 100)) : (dropBtg > 0 ? 100 : 0);
      const pctSulam = rencanaBtg > 0 ? Math.min(100, Math.round((realBtg / rencanaBtg) * 100)) : (realBtg > 0 ? 100 : 0);
      const statusPetak = (rencanaBtg > 0 && realBtg >= rencanaBtg) || item.status === 'Close' ? 'Close' : 'Open';

      return {
        id: item.id,
        wilayah: item.wilayah || 'AW01',
        lokasi: item.lokasi,
        spekBB: item.spekBB || '-',
        tglRawat: item.tglRawat ? item.tglRawat.toISOString().slice(0, 10) : '-',
        tglFMax: item.tglFMax ? item.tglFMax.toISOString().slice(0, 10) : '-',
        tglOrder: item.tglOrder ? item.tglOrder.toISOString().slice(0, 10) : '-',
        umurForcing: umurForcing !== null && umurForcing !== undefined ? `${umurForcing} Bulan` : '-',
        rencanaBtg,
        rencanaRit,
        dropBtg,
        dropRit,
        realBtg,
        realRit,
        realHa: parseFloat(realHa.toFixed(2)),
        pctDrop,
        pctSulam,
        statusPetak,
      };
    });

    const kpi = {
      totalLokasi: listSulam.length,
      totalRencanaBtg,
      totalRencanaRit,
      totalDropBtg,
      totalDropRit,
      totalRealBtg,
      totalRealRit,
      totalRealHa: parseFloat(totalRealHa.toFixed(2)),
      overallPctDrop: totalRencanaBtg > 0 ? Math.round((totalDropBtg / totalRencanaBtg) * 100) : 0,
      overallPctSulam: totalRencanaBtg > 0 ? Math.round((totalRealBtg / totalRencanaBtg) * 100) : 0,
    };

    return NextResponse.json({
      success: true,
      kpi,
      rows,
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/monitoring:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat monitoring sulam.' },
      { status: 500 }
    );
  }
}

