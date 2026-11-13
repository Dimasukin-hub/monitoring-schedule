import { prisma } from '@/lib/prisma';

/**
 * Service untuk menyinkronkan tabel database LokasiOrderGorongGorong secara dinamis
 * dari tabel Master:
 * 1. MasterDataOrderGorongGorong (lokasi, tanggal, order 40, 60, 80, 100)
 * 2. MasterDataDropGorongGorong (drop 40, 60, 80, 100, tglDrop 40)
 * 3. MasterStatusLokasi (strucPlant -> wilayah, luasNetto -> luas, status -> statusTanaman, umurBulan)
 * 4. MasterWaterlogging (dsmbkPlot -> dsmBk, dsmPlot -> dsmSt)
 * 5. Land (aplikasiTerakhir -> aktBk)
 * 6. MasterSapGorongGorong & TransaksiGorongGorong (pasang & transaksi tambahan)
 */
export async function syncLokasiOrderDatabase() {
  try {
    const [
      statusLokasiList,
      waterloggingList,
      allLands,
      allTrx,
      allSap,
      masterOrders,
      masterDrops,
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
    ]);

    const masterLokMap = new Map<string, any>();
    for (const m of statusLokasiList) masterLokMap.set(m.lokasi.trim().toUpperCase(), m);

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

    // Daftar lokasi resmi yang memiliki order/drop dari Master Data
    const allCandidateLokasi = new Set<string>([
      ...orderMap.keys(),
      ...dropMap.keys(),
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

      // Hitung net pindah lokasi untuk petak ini dari allTrx (drops with lokasiAsal)
      let pindahD40 = 0, pindahD60 = 0, pindahD80 = 0, pindahD100 = 0;
      for (const t of allTrx) {
        if (t.jenisTransaksi === 'DROP' && t.lokasiAsal) {
          const asalUpper = t.lokasiAsal.trim().toUpperCase();
          const destUpper = t.lokasi.trim().toUpperCase();
          if (asalUpper === lok) {
            pindahD40 -= (t.qtyD40 || 0);
            pindahD60 -= (t.qtyD60 || 0);
            pindahD80 -= (t.qtyD80 || 0);
            pindahD100 -= (t.qtyD100 || 0);
          }
          if (destUpper === lok) {
            pindahD40 += (t.qtyD40 || 0);
            pindahD60 += (t.qtyD60 || 0);
            pindahD80 += (t.qtyD80 || 0);
            pindahD100 += (t.qtyD100 || 0);
          }
        }
      }

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

      // Status per Diameter
      const calcDiaStatus = (ordQ: number, drpQ: number, manQ: number, sapQ: number) => {
        const totPasang = Math.max(manQ, sapQ);
        const saldo = drpQ - totPasang;
        if (ordQ > 0 || drpQ > 0 || totPasang > 0) {
          if (drpQ >= ordQ && saldo <= 0 && totPasang > 0) return 'Close';
          return 'Open';
        }
        return '-';
      };

      const statusD40 = calcDiaStatus(orderD40, dropD40, trxMan40, pasangSapD40);
      const statusD60 = calcDiaStatus(orderD60, dropD60, trxMan60, pasangSapD60);
      const statusD80 = calcDiaStatus(orderD80, dropD80, trxMan80, pasangSapD80);
      const statusD100 = calcDiaStatus(orderD100, dropD100, trxMan100, pasangSapD100);

      // Status All mengikuti status per diameter
      const diaStatuses = [statusD40, statusD60, statusD80, statusD100];
      const hasAnyOpen = diaStatuses.some((st) => st === 'Open');
      const hasAnyClose = diaStatuses.some((st) => st === 'Close');
      const statusAll = hasAnyOpen ? 'Open' : (hasAnyClose ? 'Close' : '-');

      const luas = m?.luasNetto || 0;
      const ratioPerHa = (luas > 0 && orderD40 > 0) ? Math.round(orderD40 / luas) : null;
      const tglDropD40Str = lastDrop40Date ? lastDrop40Date.toISOString().slice(0, 10) : null;
      const tglOrderStr = ord.minDate ? ord.minDate.toISOString().slice(0, 10) : (trx.orders[0]?.tanggal ? new Date(trx.orders[0].tanggal).toISOString().slice(0, 10) : '-');

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
        prioritas = '';
      }

      const rowData = {
        wilayah: m?.strucPlant || 'AW01',
        luas: luas,
        statusTanaman: m?.status || '-',
        umurBulan: m?.umurBulan ?? (m?.umurRawat ?? 0),
        tanggalOrder: tglOrderStr,
        aktBk: landAktStr,
        dsmBk: wl?.dsmbkPlot || '-',
        dsmSt: wl?.dsmPlot || '-',
        prioritas,
        statusAll,
        isClosedExcel: statusAll === 'Close',
        ratioPerHa,

        orderD40,
        dropD40,
        tglDropD40: tglDropD40Str,
        pindahD40,
        pasangManD40: trxMan40,
        pasangSapD40,
        statusD40,

        orderD60,
        dropD60,
        pindahD60,
        pasangManD60: trxMan60,
        pasangSapD60,
        statusD60,

        orderD80,
        dropD80,
        pindahD80,
        pasangManD80: trxMan80,
        pasangSapD80,
        statusD80,

        orderD100,
        dropD100,
        pindahD100,
        pasangManD100: trxMan100,
        pasangSapD100,
        statusD100,
      };

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
