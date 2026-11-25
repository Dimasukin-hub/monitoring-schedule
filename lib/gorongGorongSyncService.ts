import { prisma } from '@/lib/prisma';
import { revertTransactionImpact } from '@/app/api/gorong-gorong/order/route';

/**
 * Memastikan semua data transaksi dari tabel induk TransaksiGorongGorong
 * tersinkronisasi 100% ke tabel Master Data masing-masing:
 * 1. PASANG_MANUAL -> MasterDataPasangManual
 * 2. ORDER -> MasterDataOrderGorongGorong
 * 3. DROP (tanpa lokasiAsal) -> MasterDataDropGorongGorong
 * 4. PINDAH_LOKASI / DROP (dengan lokasiAsal) -> MasterDataPindahGorongGorong & MasterDataDropGorongGorong
 */
export async function reconcileAllGorongGorongMasterData() {
  try {
    // 0. Auto-healing data baseline lama yang terlanjur tertumpuk atau orphan (seperti 085C, 85C1, 4I)
    try {
      // Periksa 085C: jika baris baseline (transaksiId: null) bernilai > 105, pulihkan ke 105 dan tanggal 2026-10-01
      const base085C = await prisma.masterDataOrderGorongGorong.findFirst({
        where: { lokasi: '085C', transaksiId: null, diameter40: { gt: 105 } },
      });
      if (base085C) {
        await prisma.masterDataOrderGorongGorong.update({
          where: { id: base085C.id },
          data: {
            diameter40: 105,
            tanggal: new Date('2026-10-01T00:00:00.000Z'),
          },
        });
      }

      // Bersihkan data orphan tidak resmi (85C1, 4I)
      await prisma.masterDataDropGorongGorong.deleteMany({
        where: { lokasi: { in: ['85C1', '4I', '85c1', '4i'] } },
      });
      await prisma.masterDataOrderGorongGorong.deleteMany({
        where: { lokasi: { in: ['85C1', '4I', '85c1', '4i'] } },
      });
      await prisma.lokasiOrderGorongGorong.deleteMany({
        where: { lokasi: { in: ['85C1', '4I', '85c1', '4i'] } },
      });

      // Bersihkan seluruh data master yang semua diameternya bernilai 0 (invalid/sisa revert/baris kosong)
      await prisma.masterDataDropGorongGorong.deleteMany({
        where: { diameter40: 0, diameter60: 0, diameter80: 0, diameter100: 0 },
      });
      await prisma.masterDataOrderGorongGorong.deleteMany({
        where: { diameter40: 0, diameter60: 0, diameter80: 0, diameter100: 0 },
      });
      await prisma.masterDataPasangManual.deleteMany({
        where: { diameter40: 0, diameter60: 0, diameter80: 0, diameter100: 0 },
      });
      await prisma.masterDataPindahGorongGorong.deleteMany({
        where: { diameter40: 0, diameter60: 0, diameter80: 0, diameter100: 0 },
      });
    } catch (eHealing) {
      console.warn('[reconcileMasterData] Warning auto-healing:', eHealing);
    }

    const allTrx = await prisma.transaksiGorongGorong.findMany({
      orderBy: { tanggal: 'asc' },
    });

    if (!allTrx || allTrx.length === 0) return { success: true, count: 0 };

    // 1. Reconcile PASANG_MANUAL -> MasterDataPasangManual (per baris transaksi dengan transaksiId)
    const manualTrx = allTrx.filter((t) => t.jenisTransaksi === 'PASANG_MANUAL');
    for (const t of manualTrx) {
      try {
        const lok = t.lokasi.trim().toUpperCase();

        // 1. Cek apakah sudah ada baris master yang terhubung ke transaksiId ini
        const existingByTrx = await prisma.masterDataPasangManual.findFirst({
          where: { transaksiId: t.id },
        });
        if (existingByTrx) continue;

        // 2. Jika belum terhubung, cari baris unlinked (transaksiId is null) yang cocok
        // Prioritas pertama: cari baris yang tanggal dan kuantitinya sama persis
        let unlinked = null;
        if (t.tanggal) {
          unlinked = await prisma.masterDataPasangManual.findFirst({
            where: {
              transaksiId: null,
              lokasi: lok,
              tanggalPasangManual: new Date(t.tanggal),
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        // Prioritas kedua: jika belum ketemu tanggal persis, cari unlinked dengan kuantiti sama
        if (!unlinked) {
          unlinked = await prisma.masterDataPasangManual.findFirst({
            where: {
              transaksiId: null,
              lokasi: lok,
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        if (unlinked) {
          // Tautkan baris yang sudah ada ke transaksi ini
          await prisma.masterDataPasangManual.update({
            where: { id: unlinked.id },
            data: {
              transaksiId: t.id,
              tanggalPasangManual: t.tanggal || unlinked.tanggalPasangManual,
            },
          });
        } else {
          // Buat baris baru di Master Data Pasang Manual untuk transaksi yang belum ada
          await prisma.masterDataPasangManual.create({
            data: {
              transaksiId: t.id,
              lokasi: lok,
              wilayah: t.wilayah || 'AW01',
              tanggalPasangManual: t.tanggal || new Date(),
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
          });
        }
      } catch (e) {
        console.warn(`[reconcileMasterData] Warning checking pasang manual for ${t.lokasi}:`, e);
      }
    }

    // 2. Reconcile ORDER -> MasterDataOrderGorongGorong (per baris transaksi dengan transaksiId)
    const orderTrx = allTrx.filter((t) => t.jenisTransaksi === 'ORDER');
    for (const t of orderTrx) {
      try {
        const lok = t.lokasi.trim().toUpperCase();

        const existingByTrx = await prisma.masterDataOrderGorongGorong.findFirst({
          where: { transaksiId: t.id },
        });
        if (existingByTrx) continue;

        let unlinked = null;
        if (t.tanggal) {
          unlinked = await prisma.masterDataOrderGorongGorong.findFirst({
            where: {
              transaksiId: null,
              lokasi: lok,
              tanggal: new Date(t.tanggal),
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        if (!unlinked) {
          unlinked = await prisma.masterDataOrderGorongGorong.findFirst({
            where: {
              transaksiId: null,
              lokasi: lok,
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        if (unlinked) {
          await prisma.masterDataOrderGorongGorong.update({
            where: { id: unlinked.id },
            data: {
              transaksiId: t.id,
              tanggal: t.tanggal || unlinked.tanggal,
            },
          });
        } else {
          await prisma.masterDataOrderGorongGorong.create({
            data: {
              transaksiId: t.id,
              lokasi: lok,
              wilayah: t.wilayah || 'AW01',
              tanggal: t.tanggal || new Date(),
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
          });
        }
      } catch (e) {
        console.warn(`[reconcileMasterData] Warning checking order for ${t.lokasi}:`, e);
      }
    }

    // 3. Reconcile DROP (murni) -> MasterDataDropGorongGorong (per baris transaksi dengan transaksiId)
    const dropTrx = allTrx.filter((t) => t.jenisTransaksi === 'DROP' && !t.lokasiAsal);
    for (const t of dropTrx) {
      try {
        const lok = t.lokasi.trim().toUpperCase();

        const existingByTrx = await prisma.masterDataDropGorongGorong.findFirst({
          where: { transaksiId: t.id },
        });
        if (existingByTrx) continue;

        let unlinked = null;
        if (t.tanggal) {
          unlinked = await prisma.masterDataDropGorongGorong.findFirst({
            where: {
              transaksiId: null,
              lokasi: lok,
              tanggal: new Date(t.tanggal),
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        if (!unlinked) {
          unlinked = await prisma.masterDataDropGorongGorong.findFirst({
            where: {
              transaksiId: null,
              lokasi: lok,
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        if (unlinked) {
          await prisma.masterDataDropGorongGorong.update({
            where: { id: unlinked.id },
            data: {
              transaksiId: t.id,
              tanggal: t.tanggal || unlinked.tanggal,
            },
          });
        } else {
          await prisma.masterDataDropGorongGorong.create({
            data: {
              transaksiId: t.id,
              lokasi: lok,
              wilayah: t.wilayah || 'AW01',
              tanggal: t.tanggal || new Date(),
              diameter40: t.qtyD40 || 0,
              diameter60: t.qtyD60 || 0,
              diameter80: t.qtyD80 || 0,
              diameter100: t.qtyD100 || 0,
            },
          });
        }
      } catch (e) {
        console.warn(`[reconcileMasterData] Warning checking drop for ${t.lokasi}:`, e);
      }
    }

    // 4. Reconcile PINDAH LOKASI -> MasterDataPindahGorongGorong (per baris transaksi dengan transaksiId)
    const pindahTrx = allTrx.filter((t) => (t.jenisTransaksi === 'DROP' && !!t.lokasiAsal) || (t.jenisTransaksi as string) === 'PINDAH_LOKASI');
    for (const pt of pindahTrx) {
      try {
        const existingByTrx = await prisma.masterDataPindahGorongGorong.findFirst({
          where: { transaksiId: pt.id },
        });
        if (existingByTrx) continue;

        let unlinked = null;
        if (pt.tanggal) {
          unlinked = await prisma.masterDataPindahGorongGorong.findFirst({
            where: {
              transaksiId: null,
              lokasiPengirim: pt.lokasiAsal!,
              lokasiPenerima: pt.lokasi,
              tanggal: new Date(pt.tanggal),
              diameter40: pt.qtyD40 || 0,
              diameter60: pt.qtyD60 || 0,
              diameter80: pt.qtyD80 || 0,
              diameter100: pt.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        if (!unlinked) {
          unlinked = await prisma.masterDataPindahGorongGorong.findFirst({
            where: {
              transaksiId: null,
              lokasiPengirim: pt.lokasiAsal!,
              lokasiPenerima: pt.lokasi,
              diameter40: pt.qtyD40 || 0,
              diameter60: pt.qtyD60 || 0,
              diameter80: pt.qtyD80 || 0,
              diameter100: pt.qtyD100 || 0,
            },
            orderBy: { id: 'asc' },
          });
        }

        if (unlinked) {
          await prisma.masterDataPindahGorongGorong.update({
            where: { id: unlinked.id },
            data: {
              transaksiId: pt.id,
              tanggal: pt.tanggal || unlinked.tanggal,
            },
          });
        } else {
          const mAsal = await prisma.masterStatusLokasi.findUnique({
            where: { lokasi: pt.lokasiAsal! },
          });
          await prisma.masterDataPindahGorongGorong.create({
            data: {
              transaksiId: pt.id,
              lokasiPengirim: pt.lokasiAsal!,
              wilayahPengirim: mAsal?.strucPlant || 'AW01',
              lokasiPenerima: pt.lokasi,
              wilayahPenerima: pt.wilayah || 'AW01',
              tanggal: pt.tanggal || new Date(),
              diameter40: pt.qtyD40 || 0,
              diameter60: pt.qtyD60 || 0,
              diameter80: pt.qtyD80 || 0,
              diameter100: pt.qtyD100 || 0,
              keterangan: pt.keterangan || null,
            },
          });
        }
      } catch (e) {
        console.warn(`[reconcileMasterData] Warning checking pindah for ${pt.lokasi}:`, e);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.warn('[reconcileAllGorongGorongMasterData] Warning:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Service untuk menyinkronkan tabel database LokasiOrderGorongGorong secara dinamis
 * dari tabel Master:
 * 1. MasterDataOrderGorongGorong (lokasi, tanggal, order 40, 60, 80, 100)
 * 2. MasterDataDropGorongGorong (drop 40, 60, 80, 100, tglDrop 40)
 * 3. MasterDataPasangManual (pasangMan 40, 60, 80, 100)
 * 4. MasterStatusLokasi (strucPlant -> wilayah, luasNetto -> luas, status -> statusTanaman, umurBulan)
 * 5. MasterWaterlogging (dsmbkPlot -> dsmBk, dsmPlot -> dsmSt)
 * 6. Land (aplikasiTerakhir -> aktBk)
 * 7. MasterSapGorongGorong & TransaksiGorongGorong (pasang & transaksi tambahan)
 */
export async function syncLokasiOrderDatabase() {
  try {
    // 1. Rekonsiliasi transaksi riwayat form input ke tabel master terlebih dahulu
    await reconcileAllGorongGorongMasterData();

    const [
      statusLokasiList,
      waterloggingList,
      allLands,
      allTrx,
      allSap,
      masterOrders,
      masterDrops,
      masterPindahs,
      masterPasangManuals,
      existingLokasiOrders,
    ] = await Promise.all([
      prisma.masterStatusLokasi.findMany({}),
      prisma.masterWaterlogging.findMany({}),
      prisma.land.findMany({
        orderBy: { year: 'desc' },
        select: {
          lokasi: true,
          year: true,
          aplikasiTerakhir: true,
          realSelesaiTanam: true,
          realMulaiTanam: true,
          realBajak: true,
          realBkr: true,
          activities: {
            where: { realisasiDate: { not: null } },
            select: { code: true, name: true, stepOrder: true, realisasiDate: true },
          },
        },
      }),
      prisma.transaksiGorongGorong.findMany({ orderBy: { tanggal: 'asc' } }),
      prisma.masterSapGorongGorong.findMany({ orderBy: { tanggalRealisasi: 'asc' } }),
      prisma.masterDataOrderGorongGorong.findMany({ orderBy: { tanggal: 'asc' } }),
      prisma.masterDataDropGorongGorong.findMany({ orderBy: { tanggal: 'asc' } }),
      prisma.masterDataPindahGorongGorong.findMany({ orderBy: { tanggal: 'asc' } }),
      prisma.masterDataPasangManual.findMany({ orderBy: { tanggalPasangManual: 'asc' } }).catch(() => []),
      prisma.lokasiOrderGorongGorong.findMany({}),
    ]);

    const masterLokMap = new Map<string, any>();
    for (const m of statusLokasiList) masterLokMap.set(m.lokasi.trim().toUpperCase(), m);

    const existingLokMap = new Map<string, any>();
    for (const el of (existingLokasiOrders || [])) existingLokMap.set(el.lokasi.trim().toUpperCase(), el);

    const dsmMap = new Map<string, any>();
    for (const w of waterloggingList) dsmMap.set(w.lokasi.trim().toUpperCase(), w);

    // Pemetaan Akt. BK Murni dari Land (aplikasiTerakhir, newest <= today)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    function parseDate(s: string | null | undefined): Date | null {
      if (!s) return null;
      const str = String(s).trim();
      if (!str || str === '-' || str === '0') return null;
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const res = new Date(y, m, d);
          return isNaN(res.getTime()) ? null : res;
        }
      }
      const res = new Date(str);
      return isNaN(res.getTime()) ? null : res;
    }

    const landAktMap = new Map<string, string>();
    const landsByLok = new Map<string, any[]>();
    for (const l of allLands) {
      const lok = l.lokasi.trim().toUpperCase();
      if (!landsByLok.has(lok)) landsByLok.set(lok, []);
      landsByLok.get(lok)!.push(l);
    }

    for (const [lok, landList] of landsByLok.entries()) {
      let chosenLand: any = null;
      let chosenDate: Date | null = null;

      for (const l of landList) {
        const realDates = [
          parseDate(l.realSelesaiTanam),
          parseDate(l.realMulaiTanam),
          parseDate(l.realBajak),
          parseDate(l.realBkr),
          ...(l.activities || []).map((a: any) => parseDate(a.realisasiDate)),
        ].filter((d): d is Date => d !== null && d <= today);

        let maxReal: Date | null = null;
        for (const d of realDates) {
          if (!maxReal || d > maxReal) maxReal = d;
        }

        if (maxReal) {
          if (!chosenDate || maxReal > chosenDate) {
            chosenDate = maxReal;
            chosenLand = l;
          }
        } else if (l.year && l.year <= today.getFullYear()) {
          const fallbackDate = new Date(l.year, 11, 31);
          if (fallbackDate <= today) {
            if (!chosenDate || fallbackDate > chosenDate) {
              chosenDate = fallbackDate;
              chosenLand = l;
            }
          }
        }
      }

      if (chosenLand && chosenLand.aplikasiTerakhir) {
        landAktMap.set(lok, chosenLand.aplikasiTerakhir);
      }
    }

    // Master Orders Map
    const orderMap = new Map<string, { minDate: Date | null; d40: number; d60: number; d80: number; d100: number }>();
    for (const o of masterOrders) {
      const k = o.lokasi.trim().toUpperCase();
      if (!orderMap.has(k)) {
        orderMap.set(k, { minDate: null, d40: 0, d60: 0, d80: 0, d100: 0 });
      }
      const ent = orderMap.get(k)!;
      ent.d40 += o.diameter40 || 0;
      ent.d60 += o.diameter60 || 0;
      ent.d80 += o.diameter80 || 0;
      ent.d100 += o.diameter100 || 0;
      if (o.tanggal) {
        const dt = new Date(o.tanggal);
        if (!ent.minDate || dt < ent.minDate) ent.minDate = dt;
      }
    }

    // Master Drops Map
    const dropMap = new Map<string, { d40: number; d60: number; d80: number; d100: number; tglDrop40: Date | null }>();
    for (const d of masterDrops) {
      const k = d.lokasi.trim().toUpperCase();
      if (!dropMap.has(k)) {
        dropMap.set(k, { d40: 0, d60: 0, d80: 0, d100: 0, tglDrop40: null });
      }
      const ent = dropMap.get(k)!;
      ent.d40 += d.diameter40 || 0;
      ent.d60 += d.diameter60 || 0;
      ent.d80 += d.diameter80 || 0;
      ent.d100 += d.diameter100 || 0;
      if (d.diameter40 > 0 && d.tanggal) {
        const dt = new Date(d.tanggal);
        if (!ent.tglDrop40 || dt > ent.tglDrop40) ent.tglDrop40 = dt;
      }
    }

    // Transaksi Gorong-Gorong Map
    const trxMap = new Map<string, { orders: any[]; drops: any[]; manuals: [] }>();
    for (const t of allTrx) {
      const k = t.lokasi.trim().toUpperCase();
      if (!trxMap.has(k)) trxMap.set(k, { orders: [], drops: [], manuals: [] });
      const ent = trxMap.get(k)!;
      if (t.jenisTransaksi === 'ORDER') ent.orders.push(t);
      else if (t.jenisTransaksi === 'DROP') ent.drops.push(t);
      else if (t.jenisTransaksi === 'PASANG_MANUAL') (ent.manuals as any[]).push(t);
    }

    // SAP Realisasi Map
    const sapMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    for (const s of allSap) {
      const k = s.lokasi.trim().toUpperCase();
      if (!sapMap.has(k)) sapMap.set(k, { d40: 0, d60: 0, d80: 0, d100: 0 });
      const ent = sapMap.get(k)!;
      if (s.diameter === 40) ent.d40 += s.qty;
      else if (s.diameter === 60) ent.d60 += s.qty;
      else if (s.diameter === 80) ent.d80 += s.qty;
      else if (s.diameter === 100) ent.d100 += s.qty;
    }

    // Pindah Map (Murni dari Master Data Pindah Gorong-Gorong)
    const pindahMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    const getPindahEnt = (lok: string) => {
      if (!pindahMap.has(lok)) {
        pindahMap.set(lok, { d40: 0, d60: 0, d80: 0, d100: 0 });
      }
      return pindahMap.get(lok)!;
    };

    for (const p of masterPindahs) {
      if (p.lokasiPengirim) {
        const kAsal = p.lokasiPengirim.trim().toUpperCase();
        const entAsal = getPindahEnt(kAsal);
        entAsal.d40 -= (p.diameter40 || 0);
        entAsal.d60 -= (p.diameter60 || 0);
        entAsal.d80 -= (p.diameter80 || 0);
        entAsal.d100 -= (p.diameter100 || 0);
      }
      if (p.lokasiPenerima) {
        const kDest = p.lokasiPenerima.trim().toUpperCase();
        const entDest = getPindahEnt(kDest);
        entDest.d40 += (p.diameter40 || 0);
        entDest.d60 += (p.diameter60 || 0);
        entDest.d80 += (p.diameter80 || 0);
        entDest.d100 += (p.diameter100 || 0);
      }
    }

    // Fallback jika belum ada di masterPindahs namun ada transaksi pindah di allTrx
    if (masterPindahs.length === 0) {
      for (const t of allTrx) {
        if (t.jenisTransaksi === 'DROP' && t.lokasiAsal) {
          const kAsal = t.lokasiAsal.trim().toUpperCase();
          const kDest = t.lokasi.trim().toUpperCase();
          const entAsal = getPindahEnt(kAsal);
          entAsal.d40 -= (t.qtyD40 || 0);
          entAsal.d60 -= (t.qtyD60 || 0);
          entAsal.d80 -= (t.qtyD80 || 0);
          entAsal.d100 -= (t.qtyD100 || 0);

          const entDest = getPindahEnt(kDest);
          entDest.d40 += (t.qtyD40 || 0);
          entDest.d60 += (t.qtyD60 || 0);
          entDest.d80 += (t.qtyD80 || 0);
          entDest.d100 += (t.qtyD100 || 0);
        }
      }
    }

    // Pasang Manual Map (dari MasterDataPasangManual)
    const pasangManualMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    for (const pm of masterPasangManuals) {
      const k = pm.lokasi.trim().toUpperCase();
      if (!pasangManualMap.has(k)) pasangManualMap.set(k, { d40: 0, d60: 0, d80: 0, d100: 0 });
      const ent = pasangManualMap.get(k)!;
      ent.d40 += pm.diameter40 || 0;
      ent.d60 += pm.diameter60 || 0;
      ent.d80 += pm.diameter80 || 0;
      ent.d100 += pm.diameter100 || 0;
    }

    // Daftar lokasi resmi yang memiliki order/drop/pindah/pasang manual dari Master Data atau Transaksi
    const allCandidateLokasi = new Set<string>([
      ...orderMap.keys(),
      ...dropMap.keys(),
      ...pindahMap.keys(),
      ...pasangManualMap.keys(),
      ...trxMap.keys(),
    ]);

    const upsertPromises: any[] = [];

    for (const lok of allCandidateLokasi) {
      const m = masterLokMap.get(lok);
      const wl = dsmMap.get(lok);
      const ord = orderMap.get(lok) || { minDate: null, d40: 0, d60: 0, d80: 0, d100: 0 };
      const drp = dropMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0, tglDrop40: null };
      const sp = sapMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0 };
      const trx = trxMap.get(lok) || { orders: [], drops: [], manuals: [] };

      let lastDrop40Date: Date | null = drp.tglDrop40;
      for (const d of trx.drops) {
        if (d.qtyD40 > 0 && d.tanggal) {
          const dt = new Date(d.tanggal);
          if (!lastDrop40Date || dt > lastDrop40Date) lastDrop40Date = dt;
        }
      }

      let trxMan40 = 0, trxMan60 = 0, trxMan80 = 0, trxMan100 = 0;
      for (const p of trx.manuals as any[]) {
        trxMan40 += p.qtyD40 || 0;
        trxMan60 += p.qtyD60 || 0;
        trxMan80 += p.qtyD80 || 0;
        trxMan100 += p.qtyD100 || 0;
      }

      // Hitung net pindah lokasi untuk petak ini dari master pindah map
      const pnd = pindahMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0 };
      const pindahD40 = pnd.d40;
      const pindahD60 = pnd.d60;
      const pindahD80 = pnd.d80;
      const pindahD100 = pnd.d100;

      // Kuantiti Order & Drop MURNI dari Master Data (karena Form Input langsung memperbarui Master Data)
      const orderD40 = ord.d40;
      const orderD60 = ord.d60;
      const orderD80 = ord.d80;
      const orderD100 = ord.d100;

      const dropD40 = drp.d40;
      const dropD60 = drp.d60;
      const dropD80 = drp.d80;
      const dropD100 = drp.d100;

      const pasangSapD40 = sp.d40;
      const pasangSapD60 = sp.d60;
      const pasangSapD80 = sp.d80;
      const pasangSapD100 = sp.d100;

      const pm = pasangManualMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0 };
      const totMan40 = Math.max(trxMan40, pm.d40);
      const totMan60 = Math.max(trxMan60, pm.d60);
      const totMan80 = Math.max(trxMan80, pm.d80);
      const totMan100 = Math.max(trxMan100, pm.d100);

      const existing = existingLokMap.get(lok);

      // Status per Diameter: Utamakan status Close / Cek yang tersimpan jika ada
      const calcDiaStatus = (ordQ: number, drpQ: number, manQ: number, sapQ: number, existingStatus?: string | null) => {
        if (existingStatus && (existingStatus.trim() === 'Close' || existingStatus.trim() === 'Cek')) {
          return existingStatus.trim();
        }
        const totPasang = Math.max(manQ, sapQ);
        const saldo = drpQ - totPasang;
        if (ordQ > 0 || drpQ > 0 || totPasang > 0) {
          if (drpQ >= ordQ && saldo <= 0 && totPasang > 0) return 'Close';
          return 'Open';
        }
        return '-';
      };

      const statusD40 = calcDiaStatus(orderD40, dropD40, totMan40, pasangSapD40, existing?.statusD40);
      const statusD60 = calcDiaStatus(orderD60, dropD60, totMan60, pasangSapD60, existing?.statusD60);
      const statusD80 = calcDiaStatus(orderD80, dropD80, totMan80, pasangSapD80, existing?.statusD80);
      const statusD100 = calcDiaStatus(orderD100, dropD100, totMan100, pasangSapD100, existing?.statusD100);

      // Status All mengikuti status per diameter
      const diaStatuses = [statusD40, statusD60, statusD80, statusD100];
      const hasAnyOpen = diaStatuses.some((st) => st === 'Open');
      const hasAnyClose = diaStatuses.some((st) => st === 'Close');
      const statusAll = hasAnyOpen ? 'Open' : (hasAnyClose ? 'Close' : (existing?.statusAll || '-'));

      const luas = m?.luasNetto || 0;
      const ratioPerHa = (luas > 0 && orderD40 > 0) ? Math.round(orderD40 / luas) : null;
      const formatToISO = (d: Date | null | undefined): string | null => {
        if (!d) return null;
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${year}-${month}-${day}`;
      };
      const tglDropD40Str = lastDrop40Date ? formatToISO(lastDrop40Date) : null;
      const tglOrderStr = ord.minDate ? (formatToISO(ord.minDate) || '-') : (trx.orders[0]?.tanggal ? (formatToISO(new Date(trx.orders[0].tanggal)) || '-') : '-');

      // Evaluasi Prioritas Otomatis
      let prioritas = '';
      const totalDropNow = dropD40 + dropD60 + dropD80 + dropD100;
      const totalOrderNow = orderD40 + orderD60 + orderD80 + orderD100;
      const hasDropAny = totalDropNow > 0 || dropD40 > 0;
      const pctDropTotal = totalOrderNow > 0 ? (totalDropNow / totalOrderNow) * 100 : (totalDropNow > 0 ? 100 : 0);
      const isDropAbove50 = pctDropTotal > 50;

      const isFC = m?.status === 'FC' || m?.status?.endsWith('FC');
      const landAktStr = landAktMap.get(lok) || '-';
      const isSchedule1 = landAktStr.includes('24.Sls Tanam') || landAktStr.toLowerCase().includes('selesai tanam') || landAktStr.includes('23.Proses Tanam');
      const isSchedule2 = landAktStr.includes('22.Jalan & Saluran') || landAktStr.includes('22.JALAN & SAL') || landAktStr.includes('Jln&Sal') || landAktStr.includes('Exmini') || landAktStr.includes('SS1') || landAktStr.includes('Subsoiler') || landAktStr.includes('Ridger');

      if (statusAll !== 'Close') {
        if (isFC || isSchedule1) {
          prioritas = isDropAbove50 ? '4' : '1';
        } else if (isSchedule2) {
          prioritas = hasDropAny ? '3' : '2';
        } else if (orderD40 === 0) {
          prioritas = '-';
        } else {
          prioritas = '5';
        }
      } else {
        prioritas = '-';
      }

      // Cek apakah petak ini sudah di-Close secara administratif (tidak boleh di-override oleh auto-sync)
      const isAdminClosed =
        existing?.isClosedExcel === true ||
        (existing?.statusAll ?? '').trim().toLowerCase() === 'close';

      // Data kuantitas selalu diperbarui (order, drop, pasang, dll.)
      const quantityData = {
        wilayah: m?.strucPlant || 'AW01',
        luas: luas,
        statusTanaman: m?.status || '-',
        umurBulan: m?.umurBulan ?? (m?.umurRawat ?? 0),
        tanggalOrder: tglOrderStr,
        aktBk: landAktStr,
        dsmBk: wl?.dsmbkPlot || '-',
        dsmSt: wl?.dsmPlot || '-',
        ratioPerHa,

        orderD40,
        dropD40,
        tglDropD40: tglDropD40Str,
        pindahD40,
        pasangManD40: totMan40,
        pasangSapD40,

        orderD60,
        dropD60,
        pindahD60,
        pasangManD60: totMan60,
        pasangSapD60,

        orderD80,
        dropD80,
        pindahD80,
        pasangManD80: totMan80,
        pasangSapD80,

        orderD100,
        dropD100,
        pindahD100,
        pasangManD100: totMan100,
        pasangSapD100,
      };

      // Data status: jika petak sudah Close secara admin → pertahankan status lama, prioritas wajib '-'
      const statusData = isAdminClosed
        ? {
            prioritas: '-',
            statusAll: existing?.statusAll ?? 'Close',
            isClosedExcel: existing?.isClosedExcel ?? true,
            statusD40: existing?.statusD40 ?? statusD40,
            statusD60: existing?.statusD60 ?? statusD60,
            statusD80: existing?.statusD80 ?? statusD80,
            statusD100: existing?.statusD100 ?? statusD100,
          }
        : {
            prioritas,
            statusAll,
            isClosedExcel: statusAll === 'Close',
            statusD40,
            statusD60,
            statusD80,
            statusD100,
          };

      const rowData = { ...quantityData, ...statusData };

      upsertPromises.push(
        prisma.lokasiOrderGorongGorong.upsert({
          where: { lokasi: lok },
          create: {
            lokasi: lok,
            ...rowData,
          },
          update: rowData,
        })
      );
    }

    // Eksekusi batch upsert
    await prisma.$transaction(upsertPromises);

    // Hapus lokasi yang tidak ada lagi di Master Order
    await prisma.lokasiOrderGorongGorong.deleteMany({
      where: {
        lokasi: {
          notIn: Array.from(allCandidateLokasi),
        },
      },
    });

    console.log(`[syncLokasiOrderDatabase] Berhasil sinkronisasi ${upsertPromises.length} lokasi order.`);
    return { success: true, count: upsertPromises.length };
  } catch (error: any) {
    console.error('[syncLokasiOrderDatabase] Error syncing:', error);
    return { success: false, error: error.message };
  }
}
