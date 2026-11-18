import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '100', 10)));
    const skip = (page - 1) * limit;

    const whereLoc: any = {};
    if (search) {
      whereLoc.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { jenis: { contains: search, mode: 'insensitive' } },
        { kelas: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      whereLoc.strucPlant = { in: wilList };
    }

    const today = new Date();

    // 1. Ambil data master status lokasi sebagai basis baris petak
    const [total, masterLocations, allOrders, allDrops, allReals] = await Promise.all([
      prisma.masterStatusLokasi.count({ where: whereLoc }),
      prisma.masterStatusLokasi.findMany({
        where: whereLoc,
        orderBy: [{ strucPlant: 'asc' }, { lokasi: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.masterDataOrderSulam.findMany({
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterDataDropBibitSulam.findMany({
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterDataRealSulam.findMany({
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
      }),
    ]);

    // Map Order per Lokasi (ambil order pertama / terbaru)
    const orderMap = new Map<string, any>();
    for (const ord of allOrders) {
      const lok = ord.lokasi.trim().toUpperCase();
      if (!orderMap.has(lok)) {
        orderMap.set(lok, ord);
      }
    }

    // Map Drop per Lokasi (filter statusDrop === "V" dan jumlahkan jumlahRit)
    const dropMap = new Map<string, number>();
    for (const drp of allDrops) {
      const lok = drp.lokasi.trim().toUpperCase();
      if (drp.statusDrop === 'V') {
        const cur = dropMap.get(lok) || 0;
        dropMap.set(lok, cur + (drp.jumlahRit || 0));
      }
    }

    // Map Real Sulam per Lokasi (jumlahkan ritPlanted dan cari MAX tanggal)
    const realMap = new Map<string, { totalRitPlanted: number; lastDate: Date | null }>();
    for (const rel of allReals) {
      const lok = rel.lokasi.trim().toUpperCase();
      if (!realMap.has(lok)) {
        realMap.set(lok, { totalRitPlanted: 0, lastDate: null });
      }
      const ent = realMap.get(lok)!;
      ent.totalRitPlanted += (rel.ritPlanted || 0);
      if (rel.tanggal && (!ent.lastDate || rel.tanggal > ent.lastDate)) {
        ent.lastDate = rel.tanggal;
      }
    }

    // KPI Aggregations
    let totalPermintaanRit = 0;
    let totalDropRit = 0;
    let totalRealSulamRit = 0;

    // Kalkulasi 17 kolom summary List Sulam
    const rows = masterLocations.map((mLoc) => {
      const cleanLok = mLoc.lokasi.trim().toUpperCase();
      const ord = orderMap.get(cleanLok);
      const drpRealRit = dropMap.get(cleanLok) || 0;
      const relData = realMap.get(cleanLok) || { totalRitPlanted: 0, lastDate: null };

      // 1. Wilayah
      const wil = mLoc.strucPlant || ord?.wilayah || 'AW01';

      // 2. Lokasi
      const lok = mLoc.lokasi;

      // 3. Jenis Bibit
      const jenisBibit = mLoc.jenis || '-';

      // 4. Kelas Bibit
      const kelasBibit = mLoc.kelas || '-';

      // 5. Tanggal Rawat
      const tglRawatStr = mLoc.tglRawat ? mLoc.tglRawat.toISOString().slice(0, 10) : '-';

      // 6. Tanggal STD Forcing
      const tglStdForcingStr = mLoc.forcingStd ? mLoc.forcingStd.toISOString().slice(0, 10) : '-';

      // 7. Tanggal F Prod (Forcing Prod 26)
      const tglFProdStr = mLoc.forcingProd2026 ? mLoc.forcingProd2026.toISOString().slice(0, 10) : '-';

      // 8. Tanggal F Max: MAX(forcingStd, forcingProd2026)
      let tglFMaxDate: Date | null = null;
      if (mLoc.forcingStd && mLoc.forcingProd2026) {
        tglFMaxDate = mLoc.forcingStd.getTime() >= mLoc.forcingProd2026.getTime() ? mLoc.forcingStd : mLoc.forcingProd2026;
      } else if (mLoc.forcingStd) {
        tglFMaxDate = mLoc.forcingStd;
      } else if (mLoc.forcingProd2026) {
        tglFMaxDate = mLoc.forcingProd2026;
      }
      const tglFMaxStr = tglFMaxDate ? tglFMaxDate.toISOString().slice(0, 10) : '-';

      // 9. Tanggal Order
      const tglOrderStr = ord?.tanggalOrder ? new Date(ord.tanggalOrder).toISOString().slice(0, 10) : '-';

      // 10. Umur Forcing: Math.round((today - tglFMax) / 30.4)
      let umurForcing: number | string = '-';
      if (tglFMaxDate) {
        const diffDays = (today.getTime() - tglFMaxDate.getTime()) / (1000 * 60 * 60 * 24);
        umurForcing = Math.round(diffDays / 30.4);
      }

      // 11. Permintaan Ritase (Jumlah, Rit, Real Rit)
      const permintaanJumlah = ord?.jumlah ?? 0;
      const permintaanRit = ord?.rit ?? 0;
      const permintaanRealRit = ord?.realRit ?? 0;

      // 12. Monitor Drop (Real, Total, Dev, %Drop)
      const dropReal = drpRealRit;
      const dropTotal = permintaanRealRit + dropReal;
      const dropDev = permintaanRit - permintaanRealRit - dropReal;
      const dropPct = permintaanRit > 0 ? Number((((permintaanRealRit + dropReal) / permintaanRit) * 100).toFixed(1)) : 0;

      // 13. Monitor Sulam (Real, Manual, Saldo, %Sulam, Last Sulam)
      const sulamReal = relData.totalRitPlanted;
      const sulamManual = ord?.manual ?? 0;
      const sulamSaldo = (permintaanRealRit + dropReal) - sulamReal - sulamManual;

      const pembagiSulam = dropReal + permintaanRealRit;
      let sulamPct: number | string = '-';
      if (pembagiSulam > 0) {
        sulamPct = Number((((sulamReal + sulamManual) / pembagiSulam) * 100).toFixed(1));
      }

      const sulamLastDateStr = relData.lastDate ? relData.lastDate.toISOString().slice(0, 10) : '-';

      // 14. Spek Bibit
      const spekBibit = ord?.spekBibit || '-';

      // 15. Keterangan Proses
      const keteranganProses = ord?.keteranganProses || '-';

      // 16. Keterangan Mati
      const keteranganMati = ord?.keteranganMati || '-';

      // 17. Keterangan Ritase
      const keteranganRitase = ord?.keteranganRitase || '-';

      // Akumulasi KPI
      totalPermintaanRit += permintaanRit;
      totalDropRit += dropReal;
      totalRealSulamRit += sulamReal;

      return {
        wilayah: wil,
        lokasi: lok,
        jenisBibit,
        kelasBibit,
        tglRawat: tglRawatStr,
        tglStdForcing: tglStdForcingStr,
        tglFProd: tglFProdStr,
        tglFMax: tglFMaxStr,
        tglOrder: tglOrderStr,
        umurForcing,
        permintaanJumlah,
        permintaanRit,
        permintaanRealRit,
        dropReal,
        dropTotal,
        dropDev,
        dropPct,
        sulamReal,
        sulamManual,
        sulamSaldo,
        sulamPct,
        sulamLastDate: sulamLastDateStr,
        spekBibit,
        keteranganProses,
        keteranganMati,
        keteranganRitase,
      };
    });

    const kpi = {
      totalLokasi: total,
      totalPermintaanRit,
      totalDropRit,
      totalRealSulamRit,
      overallPctDrop: totalPermintaanRit > 0 ? Math.round((totalDropRit / totalPermintaanRit) * 100) : 0,
      overallPctSulam: totalDropRit > 0 ? Math.round((totalRealSulamRit / totalDropRit) * 100) : 0,
    };

    return NextResponse.json({
      success: true,
      kpi,
      rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/monitoring:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat monitoring sulam.' },
      { status: 500 }
    );
  }
}
