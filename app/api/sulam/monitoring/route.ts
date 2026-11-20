import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const WILAYAH_DEFAULT = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah')?.trim() || '';
    const proses = searchParams.get('proses')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '50', 10)));

    const today = new Date();

    // 1. Ambil seluruh master status lokasi & transaksi terkait untuk summary akurat
    const [masterLocations, allOrders, allDrops, allReals] = await Promise.all([
      prisma.masterStatusLokasi.findMany({
        orderBy: [{ strucPlant: 'asc' }, { lokasi: 'asc' }],
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

    // Map Order per Lokasi (ambil record order pertama / terbaru)
    const orderMap = new Map<string, any>();
    const allProsesSet = new Set<string>();
    for (const ord of allOrders) {
      const lok = ord.lokasi.trim().toUpperCase();
      if (!orderMap.has(lok)) {
        orderMap.set(lok, ord);
      }
      if (ord.keteranganProses && ord.keteranganProses.trim()) {
        allProsesSet.add(ord.keteranganProses.trim());
      }
    }

    // Map Drop per Lokasi (filter statusDrop === 'V' dan jumlahkan jumlahRit)
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

    // 2. Kalkulasi seluruh baris List Sulam lengkap
    const allCalculatedRows = masterLocations.map((mLoc) => {
      const cleanLok = mLoc.lokasi.trim().toUpperCase();
      const ord = orderMap.get(cleanLok);
      const drpRealRit = dropMap.get(cleanLok) || 0;
      const relData = realMap.get(cleanLok) || { totalRitPlanted: 0, lastDate: null };

      // Wilayah
      const wil = mLoc.strucPlant || ord?.wilayah || 'AW01';

      // Format Tanggal
      const tglRawatStr = mLoc.tglRawat ? mLoc.tglRawat.toISOString().slice(0, 10) : '-';
      const tglStdForcingStr = mLoc.forcingStd ? mLoc.forcingStd.toISOString().slice(0, 10) : '-';
      const tglFProdStr = mLoc.forcingProd2026 ? mLoc.forcingProd2026.toISOString().slice(0, 10) : '-';

      // Tanggal F Max: MAX(forcingStd, forcingProd2026)
      let tglFMaxDate: Date | null = null;
      if (mLoc.forcingStd && mLoc.forcingProd2026) {
        tglFMaxDate = mLoc.forcingStd.getTime() >= mLoc.forcingProd2026.getTime() ? mLoc.forcingStd : mLoc.forcingProd2026;
      } else if (mLoc.forcingStd) {
        tglFMaxDate = mLoc.forcingStd;
      } else if (mLoc.forcingProd2026) {
        tglFMaxDate = mLoc.forcingProd2026;
      }
      const tglFMaxStr = tglFMaxDate ? tglFMaxDate.toISOString().slice(0, 10) : '-';

      // Tanggal Order
      const tglOrderStr = ord?.tanggalOrder ? new Date(ord.tanggalOrder).toISOString().slice(0, 10) : '-';

      // Umur Forcing: Math.round((today - tglFMax) / 30.4)
      let umurForcingNum: number | null = null;
      let umurForcingStr = '-';
      if (tglFMaxDate) {
        const diffDays = (today.getTime() - tglFMaxDate.getTime()) / (1000 * 60 * 60 * 24);
        umurForcingNum = Math.round(diffDays / 30.4);
        umurForcingStr = umurForcingNum.toString();
      }

      // Permintaan Ritase
      const permintaanJumlah = ord?.jumlah ?? 0;
      const permintaanRit = ord?.rit ?? 0;
      const permintaanRealRit = ord?.realRit ?? 0;

      // Monitor Drop
      const dropReal = drpRealRit;
      const dropTotal = permintaanRealRit + dropReal;
      const dropDev = permintaanRit - dropTotal;
      const dropPct = permintaanRit > 0 ? Number(((dropTotal / permintaanRit) * 100).toFixed(1)) : 0;

      // Monitor Sulam
      const sulamReal = relData.totalRitPlanted;
      const sulamManual = ord?.manual ?? 0;
      const sulamSaldo = dropTotal - sulamReal - sulamManual;

      const pembagiSulam = dropTotal;
      let sulamPct: number | string = '-';
      let sulamPctNum = 0;
      if (pembagiSulam > 0) {
        sulamPctNum = Number((((sulamReal + sulamManual) / pembagiSulam) * 100).toFixed(1));
        sulamPct = sulamPctNum;
      }

      const sulamLastDateStr = relData.lastDate ? relData.lastDate.toISOString().slice(0, 10) : '-';

      return {
        wilayah: wil,
        lokasi: mLoc.lokasi,
        jenisBibit: mLoc.jenis || '-',
        kelasBibit: mLoc.kelas || '-',
        tglRawat: tglRawatStr,
        tglStdForcing: tglStdForcingStr,
        tglFProd: tglFProdStr,
        tglFMax: tglFMaxStr,
        tglOrder: tglOrderStr,
        umurForcing: umurForcingStr,
        umurForcingNum,
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
        sulamPctNum,
        sulamLastDate: sulamLastDateStr,
        spekBibit: ord?.spekBibit || '-',
        keteranganProses: ord?.keteranganProses || '-',
        keteranganMati: ord?.keteranganMati || '-',
        keteranganRitase: ord?.keteranganRitase || '-',
      };
    });

    // 3. Filter data berdasarkan proses jika dipilih
    const filteredByProsesRows = proses && proses !== 'ALL'
      ? allCalculatedRows.filter((r) => r.keteranganProses === proses)
      : allCalculatedRows;

    // 4. Kalkulasi Summary Monitor Sulam Per Wilayah (AW01 s/d AW07)
    // Sesuai rumus:
    // 1) Order: Total permintaanRit
    // 2) Drop: Total dropTotal
    // 3) Deviasi: Order - Drop
    // 4) Sulam: Total sulamReal
    // 5) %Drop: (Drop / Order) * 100
    // 6) %Sulam: (Sulam / Drop) * 100
    // 7) Total Card: Jumlah masing-masing, untuk %drop dan %sulam dijumlahkan lalu dibagi 7
    let sumTotalOrder = 0;
    let sumTotalDrop = 0;
    let sumTotalSulam = 0;
    let sumPctDrop = 0;
    let sumPctSulam = 0;

    const wilayahSummary = WILAYAH_DEFAULT.map((wil) => {
      const wilRows = filteredByProsesRows.filter((r) => r.wilayah.toUpperCase() === wil);
      let order = 0;
      let drop = 0;
      let sulam = 0;

      for (const r of wilRows) {
        order += r.permintaanRit;
        drop += r.dropTotal;
        sulam += r.sulamReal;
      }

      order = parseFloat(order.toFixed(1));
      drop = parseFloat(drop.toFixed(1));
      sulam = parseFloat(sulam.toFixed(1));
      const deviasi = parseFloat((order - drop).toFixed(1));

      const pctDrop = order > 0 ? parseFloat(((drop / order) * 100).toFixed(1)) : 0;
      const pctSulam = drop > 0 ? parseFloat(((sulam / drop) * 100).toFixed(1)) : 0;

      sumTotalOrder += order;
      sumTotalDrop += drop;
      sumTotalSulam += sulam;
      sumPctDrop += pctDrop;
      sumPctSulam += pctSulam;

      return {
        wilayah: wil,
        order,
        drop,
        deviasi,
        sulam,
        pctDrop,
        pctSulam,
      };
    });

    sumTotalOrder = parseFloat(sumTotalOrder.toFixed(1));
    sumTotalDrop = parseFloat(sumTotalDrop.toFixed(1));
    sumTotalSulam = parseFloat(sumTotalSulam.toFixed(1));
    const totalDeviasi = parseFloat((sumTotalOrder - sumTotalDrop).toFixed(1));
    const avgPctDrop = parseFloat((sumPctDrop / 7).toFixed(1));
    const avgPctSulam = parseFloat((sumPctSulam / 7).toFixed(1));

    const summaryCards = {
      order: sumTotalOrder,
      drop: sumTotalDrop,
      deviasi: totalDeviasi,
      sulam: sumTotalSulam,
      pctDrop: avgPctDrop,
      pctSulam: avgPctSulam,
    };

    // 5. Grafik Batang Proses Sulam berdasarkan Umur Forcing
    // Kategori: < 5 Bulan, 5 Bulan, 6 Bulan, 7 Bulan, > 7 Bulan
    const umurForcingCategories = [
      { id: '< 5 Bulan', label: '< 5 Bulan', match: (u: number | null) => u !== null && u < 5 },
      { id: '5 Bulan', label: '5 Bulan', match: (u: number | null) => u === 5 },
      { id: '6 Bulan', label: '6 Bulan', match: (u: number | null) => u === 6 },
      { id: '7 Bulan', label: '7 Bulan', match: (u: number | null) => u === 7 },
      { id: '> 7 Bulan', label: '> 7 Bulan', match: (u: number | null) => u !== null && u > 7 },
    ];

    const umurForcingChart = umurForcingCategories.map((cat) => {
      const catRows = filteredByProsesRows.filter((r) => cat.match(r.umurForcingNum));
      let catOrder = 0;
      let catDrop = 0;
      let catSulam = 0;

      for (const r of catRows) {
        catOrder += r.permintaanRit;
        catDrop += r.dropTotal;
        catSulam += r.sulamReal;
      }

      const pctDrop = catOrder > 0 ? parseFloat(((catDrop / catOrder) * 100).toFixed(1)) : 0;
      const pctSulam = catDrop > 0 ? parseFloat(((catSulam / catDrop) * 100).toFixed(1)) : 0;

      return {
        kategori: cat.label,
        order: parseFloat(catOrder.toFixed(1)),
        drop: parseFloat(catDrop.toFixed(1)),
        sulam: parseFloat(catSulam.toFixed(1)),
        pctDrop,
        pctSulam,
      };
    });

    // 6. Grafik Batang %Drop vs %Sulam (Perbandingan Keseluruhan)
    const overallDropVsSulam = [
      { name: '% Drop', value: avgPctDrop, fill: '#0ea5e9' },
      { name: '% Sulam', value: avgPctSulam, fill: '#10b981' },
    ];

    // 7. Grafik Donat Sebaran Kebutuhan Bibit / Kelas (Proporsi Ritase Order)
    const bibitMap = new Map<string, number>();
    for (const r of filteredByProsesRows) {
      if (r.permintaanRit > 0) {
        const key = r.jenisBibit !== '-' ? r.jenisBibit : (r.kelasBibit !== '-' ? r.kelasBibit : 'Lainnya');
        bibitMap.set(key, (bibitMap.get(key) || 0) + r.permintaanRit);
      }
    }
    // Jika tidak ada data order rit, gunakan count jenis bibit
    if (bibitMap.size === 0) {
      for (const r of filteredByProsesRows) {
        const key = r.jenisBibit !== '-' ? r.jenisBibit : 'Lainnya';
        bibitMap.set(key, (bibitMap.get(key) || 0) + 1);
      }
    }

    const DONUT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const sebaranBibitChart = Array.from(bibitMap.entries())
      .map(([name, value], idx) => ({
        name,
        value: parseFloat(value.toFixed(1)),
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);

    // 8. Filter Tabel List Sulam (Search & Selected Wilayah)
    let filteredListRows = filteredByProsesRows;
    if (search) {
      const s = search.toLowerCase();
      filteredListRows = filteredListRows.filter(
        (r) =>
          r.lokasi.toLowerCase().includes(s) ||
          r.jenisBibit.toLowerCase().includes(s) ||
          r.kelasBibit.toLowerCase().includes(s) ||
          r.wilayah.toLowerCase().includes(s) ||
          r.keteranganProses.toLowerCase().includes(s)
      );
    }
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      filteredListRows = filteredListRows.filter((r) => wilList.includes(r.wilayah.toUpperCase()));
    }

    const totalCount = filteredListRows.length;
    const skip = (page - 1) * limit;
    const paginatedRows = filteredListRows.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      summaryCards,
      wilayahSummary,
      wilayahChart: wilayahSummary, // Same structure has order, drop, sulam, pctDrop, pctSulam
      umurForcingChart,
      overallDropVsSulam,
      sebaranBibitChart,
      prosesList: Array.from(allProsesSet).sort(),
      rows: paginatedRows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/monitoring:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat monitoring sulam.', error: error.message },
      { status: 500 }
    );
  }
}
