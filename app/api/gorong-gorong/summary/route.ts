import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadSnapshotFromFile, isExcludedGorongGorongLocation, isLocationWithoutWilayah, ensureMasterSapLoaded } from '@/lib/lokasiOrderSnapshot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await ensureMasterSapLoaded();
    const { searchParams } = new URL(request.url);
    const wilayah = searchParams.get('wilayah');
    const diameterParam = searchParams.get('diameter');
    const yearParam = searchParams.get('year') || searchParams.get('tahun');
    const targetYears = yearParam
      ? yearParam.split(',').map((y) => parseInt(y.trim(), 10)).filter((y) => !isNaN(y))
      : [2026];
    const isYearMatching = (yr: number) => targetYears.includes(yr);
    const targetYear = targetYears[0] || 2026;

    const statusParam = searchParams.get('status');
    const prioritasParam = searchParams.get('prioritas');
    const searchParam = searchParams.get('search')?.trim().toUpperCase();

    const selectedDia = diameterParam && diameterParam !== 'ALL' ? parseInt(diameterParam, 10) : null;

    // Filter transaksi berdasarkan wilayah jika ada
    const trxWhere: any = {};
    const sapWhere: any = {};

    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        trxWhere.wilayah = { contains: wList[0], mode: 'insensitive' };
        sapWhere.penanggungJawab = { contains: wList[0], mode: 'insensitive' };
      } else if (wList.length > 1) {
        trxWhere.OR = wList.map((w) => ({ wilayah: { contains: w, mode: 'insensitive' } }));
        sapWhere.OR = wList.map((w) => ({ penanggungJawab: { contains: w, mode: 'insensitive' } }));
      }
    }
    if (selectedDia) {
      sapWhere.diameter = selectedDia;
    }

    const [allTrx, allSap, masterStatusList, dbLokasiOrder, allMasterDataOrder, allMasterDataDrop] = await Promise.all([
      prisma.transaksiGorongGorong.findMany({
        where: trxWhere,
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterSapGorongGorong.findMany({
        orderBy: { tanggalRealisasi: 'asc' },
      }),
      prisma.masterStatusLokasi.findMany({
        select: { lokasi: true, strucPlant: true },
      }),
      prisma.lokasiOrderGorongGorong.findMany({}),
      prisma.masterDataOrderGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterDataDropGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
    ]);

    const wilMap = new Map<string, string>();
    for (const m of masterStatusList) {
      if (m.strucPlant) wilMap.set(m.lokasi.trim().toUpperCase(), m.strucPlant.trim().toUpperCase());
    }

    const snapshot: Record<string, any> = {};
    if (dbLokasiOrder && dbLokasiOrder.length > 0) {
      for (const row of dbLokasiOrder) {
        snapshot[row.lokasi] = row;
      }
    } else {
      const fileSnap = loadSnapshotFromFile();
      for (const [k, v] of Object.entries(fileSnap)) {
        snapshot[k] = v;
      }
    }

    const diameters = selectedDia ? [selectedDia] : [40, 60, 80, 100];
    const allDiameters = [40, 60, 80, 100];

    const lokDiaMap = new Map<string, {
      lokasi: string;
      wilayah: string;
      dia: number;
      orderYearly: number;
      dropYearly: number;
      manualYearly: number;
      sapYearly: number;
      orderAll: number;
      dropAll: number;
      manualAll: number;
      sapAll: number;
    }>();

    const getLokDia = (lok: string, dia: number, wil?: string) => {
      const cleanLok = lok.trim().toUpperCase();
      const key = `${cleanLok}__${dia}`;
      if (!lokDiaMap.has(key)) {
        lokDiaMap.set(key, {
          lokasi: cleanLok,
          wilayah: wil || '',
          dia,
          orderYearly: 0,
          dropYearly: 0,
          manualYearly: 0,
          sapYearly: 0,
          orderAll: 0,
          dropAll: 0,
          manualAll: 0,
          sapAll: 0,
        });
      }
      const entry = lokDiaMap.get(key)!;
      if (wil && !entry.wilayah) entry.wilayah = wil;
      return entry;
    };

    // Kumpulkan lokasi yang sudah memiliki transaksi di allTrx agar snapshot tidak didouble-count
    const trxOrderLok = new Set<string>();
    const trxDropLok = new Set<string>();
    const trxManLok = new Set<string>();

    for (const trx of allTrx) {
      const l = trx.lokasi.trim().toUpperCase();
      if (trx.jenisTransaksi === 'ORDER') trxOrderLok.add(l);
      if (trx.jenisTransaksi === 'DROP') trxDropLok.add(l);
      if (trx.jenisTransaksi === 'PASANG_MANUAL') trxManLok.add(l);
    }

    // Masukkan baseline dari snapshot HANYA jika lokasi belum ada di allTrx
    for (const [lok, snap] of Object.entries(snapshot)) {
      const cleanLok = lok.trim().toUpperCase();
      if (isExcludedGorongGorongLocation(cleanLok)) continue;
      const wil = isLocationWithoutWilayah(cleanLok) ? '' : (snap.wilayah ? snap.wilayah.trim().toUpperCase() : (wilMap.get(cleanLok) || ''));
      const snapYear = snap.tanggalOrder ? new Date(snap.tanggalOrder).getFullYear() : 2026;
      const is2026 = snapYear === 2026;

      const pairs: [number, number, number][] = [
        [40, snap.orderD40 || 0, snap.dropD40 || 0],
        [60, snap.orderD60 || 0, snap.dropD60 || 0],
        [80, snap.orderD80 || 0, snap.dropD80 || 0],
        [100, snap.orderD100 || 0, snap.dropD100 || 0],
      ];

      for (const [dia, ord, drp] of pairs) {
        if (selectedDia && dia !== selectedDia) continue;
        const e = getLokDia(cleanLok, dia, wil);
        e.orderAll += ord;
        if (is2026) e.orderYearly += ord;
        e.dropAll += drp;
        if (is2026) e.dropYearly += drp;
      }
    }

    // Proses allTrx
    for (const trx of allTrx) {
      const lok = trx.lokasi.trim().toUpperCase();
      if (isExcludedGorongGorongLocation(lok)) continue;
      const trxYear = new Date(trx.tanggal).getFullYear();
      const is2026 = trxYear === 2026;
      const wil = isLocationWithoutWilayah(lok) ? '' : (trx.wilayah ? trx.wilayah.trim().toUpperCase() : (wilMap.get(lok) || ''));

      const qMap: Record<number, number> = {
        40: trx.qtyD40,
        60: trx.qtyD60,
        80: trx.qtyD80,
        100: trx.qtyD100,
      };

      for (const dia of diameters) {
        const q = qMap[dia] || 0;
        if (q === 0 && trx.jenisTransaksi !== 'ORDER') continue;
        const e = getLokDia(lok, dia, wil);

        if (trx.jenisTransaksi === 'ORDER') {
          e.orderAll += q;
          if (is2026) e.orderYearly += q;
        } else if (trx.jenisTransaksi === 'DROP') {
          e.dropAll += q;
          if (is2026) e.dropYearly += q;
        } else if (trx.jenisTransaksi === 'PASANG_MANUAL') {
          e.manualAll += q;
          if (is2026) e.manualYearly += q;
        }
      }
    }

    // Proses allSap murni dari kolom qty (Realisasi SAP)
    for (const s of allSap) {
      const lok = s.lokasi.trim().toUpperCase();
      if (isExcludedGorongGorongLocation(lok)) continue;
      const sapYear = new Date(s.tanggalRealisasi).getFullYear();
      const is2026 = sapYear === 2026;
      const dia = s.diameter;
      if (selectedDia && dia !== selectedDia) continue;
      const wil = isLocationWithoutWilayah(lok) ? '' : (wilMap.get(lok) || (s.wilayahSap?.startsWith('AW') ? s.wilayahSap.trim().toUpperCase() : '') || (s.penanggungJawab ? 'AW0' + s.penanggungJawab.replace(/\D/g, '') : ''));

      const e = getLokDia(lok, dia, wil);
      e.sapAll += s.qty;
      if (is2026) e.sapYearly += s.qty;
    }

    // Kumpulkan lokasi-lokasi resmi yang masuk ke Tabel List Lokasi Order (261 petak resmi + transaksi order/drop/manual)
    const orderedLokSet = new Set<string>();
    for (const lok of Object.keys(snapshot)) {
      if (!isExcludedGorongGorongLocation(lok)) {
        orderedLokSet.add(lok.trim().toUpperCase());
      }
    }
    for (const trx of allTrx) {
      if (trx.jenisTransaksi === 'ORDER' || trx.jenisTransaksi === 'DROP' || trx.jenisTransaksi === 'PASANG_MANUAL') {
        const l = trx.lokasi.trim().toUpperCase();
        if (!isExcludedGorongGorongLocation(l)) {
          orderedLokSet.add(l);
        }
      }
    }

    // Filter orderedLokSet berdasarkan filter opsional (status, prioritas, search)
    if (statusParam || prioritasParam || searchParam) {
      const statusList = statusParam ? statusParam.split(',').map((s) => s.trim().toUpperCase()) : [];
      const prioList = prioritasParam ? prioritasParam.split(',').map((p) => p.trim()) : [];
      const searchTerms = searchParam ? searchParam.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean) : [];

      for (const lok of Array.from(orderedLokSet)) {
        const snap = snapshot[lok];
        const wil = wilMap.get(lok) || snap?.wilayah?.toUpperCase() || '';

        // Cek search
        if (searchTerms.length > 0) {
          const matchSearch = searchTerms.some((term) => lok.includes(term) || wil.includes(term));
          if (!matchSearch) {
            orderedLokSet.delete(lok);
            continue;
          }
        }

        // Cek prioritas
        if (prioList.length > 0) {
          const p = String(snap?.prioritas || '').trim();
          if (!prioList.includes(p)) {
            orderedLokSet.delete(lok);
            continue;
          }
        }

        // Cek status Open / Close
        if (statusList.length > 0) {
          let isClose = snap?.isClosedExcel === true;
          if (!isClose) {
            let totalOrd = 0;
            let totalDrp = 0;
            let totalPsg = 0;
            for (const dia of [40, 60, 80, 100]) {
              const e = lokDiaMap.get(`${lok}__${dia}`);
              if (e) {
                totalOrd += e.orderAll;
                totalDrp += e.dropAll;
                totalPsg += Math.max(e.manualAll, e.sapAll);
              }
            }
            const sld = totalDrp - totalPsg;
            if (totalDrp >= totalOrd && sld <= 0 && totalPsg > 0) {
              isClose = true;
            }
          }

          const hasOpen = statusList.includes('OPEN') || statusList.includes('-');
          const hasClose = statusList.includes('CLOSE');

          if (hasOpen && !hasClose && isClose) {
            orderedLokSet.delete(lok);
            continue;
          }
          if (hasClose && !hasOpen && !isClose) {
            orderedLokSet.delete(lok);
            continue;
          }
        }
      }
    }

    // =========================================================================
    // HITUNG 5 KARTU KPI SESUAI INSTRUKSI RESMI USER:
    // 1. Total Order: Diambil dari MasterDataOrderGorongGorong khusus Tahun 2026
    // 2. Total Terpasang: Diambil dari MasterSapGorongGorong kolom qty khusus Tahun 2026
    // 3. Saldo di Lokasi: Status Open per Diameter pada Tahun 2025 dan 2026
    // 4. % Kedatangan: Status Open per Diameter
    // 5. % Pemasangan: Status Open per Diameter
    // =========================================================================

    // 1. Card Total Order (Dinamis dari Master Data Order sesuai Tahun & Diameter aktif)
    let orderYearly = 0;
    let totalOrderAllMaster = 0;
    for (const o of allMasterDataOrder) {
      if (wilayah && wilayah !== 'ALL') {
        const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        const oWil = (o.wilayah || '').toUpperCase();
        if (!wList.some((w) => oWil.includes(w))) continue;
      }
      const d = o.tanggal ? new Date(o.tanggal) : null;
      const yr = d ? d.getFullYear() : 2026;
      const qty = selectedDia
        ? (selectedDia === 40 ? o.diameter40 : selectedDia === 60 ? o.diameter60 : selectedDia === 80 ? o.diameter80 : o.diameter100)
        : (o.diameter40 + o.diameter60 + o.diameter80 + o.diameter100);
      totalOrderAllMaster += qty;
      if (isYearMatching(yr)) {
        orderYearly += qty;
      }
    }

    // Tambahkan transaksi ORDER dinamis dari form input (allTrx)
    for (const trx of allTrx) {
      if (trx.jenisTransaksi !== 'ORDER') continue;
      if (wilayah && wilayah !== 'ALL') {
        const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        const tWil = (trx.wilayah || '').toUpperCase();
        if (!wList.some((w) => tWil.includes(w))) continue;
      }
      const d = trx.tanggal ? new Date(trx.tanggal) : null;
      const yr = d ? d.getFullYear() : 2026;
      const qty = selectedDia
        ? (selectedDia === 40 ? trx.qtyD40 : selectedDia === 60 ? trx.qtyD60 : selectedDia === 80 ? trx.qtyD80 : trx.qtyD100)
        : (trx.qtyD40 + trx.qtyD60 + trx.qtyD80 + trx.qtyD100);
      totalOrderAllMaster += qty;
      if (isYearMatching(yr)) {
        orderYearly += qty;
      }
    }
    // Fallback jika MasterDataOrderGorongGorong belum terisi
    if (orderYearly === 0) {
      for (const r of dbLokasiOrder) {
        if (wilayah && wilayah !== 'ALL') {
          const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
          const rWil = (r.wilayah || '').toUpperCase();
          if (!wList.some((w) => rWil.includes(w))) continue;
        }
        const d = r.tanggalOrder ? new Date(r.tanggalOrder) : null;
        const yr = d ? d.getFullYear() : 2026;
        if (isYearMatching(yr)) {
          const qty = selectedDia
            ? (selectedDia === 40 ? (r.orderD40 || 0) : selectedDia === 60 ? (r.orderD60 || 0) : selectedDia === 80 ? (r.orderD80 || 0) : (r.orderD100 || 0))
            : ((r.orderD40 || 0) + (r.orderD60 || 0) + (r.orderD80 || 0) + (r.orderD100 || 0));
          orderYearly += qty;
        }
      }
    }

    // 2. Card Total Terpasang (Tahun aktif dari MasterSapGorongGorong kolom qty via referensiLokasi)
    let terpasangSapYearly = 0;
    let terpasangSapAll = 0;
    for (const s of allSap) {
      if (selectedDia && s.diameter !== selectedDia) continue;
      const d = s.tanggalRealisasi ? new Date(s.tanggalRealisasi) : null;
      const yr = d ? d.getFullYear() : 2026;
      terpasangSapAll += s.qty;
      if (isYearMatching(yr)) {
        terpasangSapYearly += s.qty;
      }
    }

    // Kumpulkan transaksi form input (Order, Drop, Pasang Manual) per lokasi
    const trxByLok: Record<string, { orders: any[]; drops: any[]; manuals: any[] }> = {};
    for (const trx of allTrx) {
      const l = trx.lokasi.trim().toUpperCase();
      if (!trxByLok[l]) trxByLok[l] = { orders: [], drops: [], manuals: [] };
      if (trx.jenisTransaksi === 'ORDER') trxByLok[l].orders.push(trx);
      else if (trx.jenisTransaksi === 'DROP') trxByLok[l].drops.push(trx);
      else if (trx.jenisTransaksi === 'PASANG_MANUAL') trxByLok[l].manuals.push(trx);
    }

    const getTrxSum = (arr: any[] | undefined, dia: number) => {
      if (!arr || arr.length === 0) return 0;
      return arr.reduce(
        (acc, it) => acc + (dia === 40 ? (it.qtyD40 || 0) : dia === 60 ? (it.qtyD60 || 0) : dia === 80 ? (it.qtyD80 || 0) : (it.qtyD100 || 0)),
        0
      );
    };

    // 3. Card Saldo di Lokasi (Status OPEN per Diameter khusus Tahun 2025 & 2026)
    let saldoOpen2025_2026 = 0;
    // 4 & 5. % Kedatangan & % Pemasangan (Status OPEN per Diameter)
    let openOrderSum = 0;
    let openDropSum = 0;
    let openPasangSum = 0;

    for (const row of dbLokasiOrder) {
      const lok = row.lokasi.trim().toUpperCase();
      if (isExcludedGorongGorongLocation(lok)) continue;

      if (wilayah && wilayah !== 'ALL') {
        const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        const rowWil = (row.wilayah || '').toUpperCase();
        if (!wList.some((w) => rowWil.includes(w))) continue;
      }

      const rowYear = row.tanggalOrder ? new Date(row.tanggalOrder).getFullYear() : 2026;
      const is2025or2026 = rowYear === 2025 || rowYear === 2026;

      const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
      if (isPetakClosed) continue;

      const tData = trxByLok[lok] || { orders: [], drops: [], manuals: [] };

      const diaList = [
        {
          dia: 40,
          ord: (row.orderD40 || 0) + getTrxSum(tData.orders, 40),
          drop: (row.dropD40 || 0) + getTrxSum(tData.drops, 40),
          pman: (row.pasangManD40 || 0) + getTrxSum(tData.manuals, 40),
          psap: row.pasangSapD40 || 0,
          status: row.statusD40,
        },
        {
          dia: 60,
          ord: (row.orderD60 || 0) + getTrxSum(tData.orders, 60),
          drop: (row.dropD60 || 0) + getTrxSum(tData.drops, 60),
          pman: (row.pasangManD60 || 0) + getTrxSum(tData.manuals, 60),
          psap: row.pasangSapD60 || 0,
          status: row.statusD60,
        },
        {
          dia: 80,
          ord: (row.orderD80 || 0) + getTrxSum(tData.orders, 80),
          drop: (row.dropD80 || 0) + getTrxSum(tData.drops, 80),
          pman: (row.pasangManD80 || 0) + getTrxSum(tData.manuals, 80),
          psap: row.pasangSapD80 || 0,
          status: row.statusD80,
        },
        {
          dia: 100,
          ord: (row.orderD100 || 0) + getTrxSum(tData.orders, 100),
          drop: (row.dropD100 || 0) + getTrxSum(tData.drops, 100),
          pman: (row.pasangManD100 || 0) + getTrxSum(tData.manuals, 100),
          psap: row.pasangSapD100 || 0,
          status: row.statusD100,
        },
      ];

      for (const d of diaList) {
        if (selectedDia && d.dia !== selectedDia) continue;
        const st = (d.status || '-').trim().toLowerCase();
        const isOpen = st === 'open' || st === '-';
        if (isOpen) {
          // Di Excel: Terpasang Maksimal = MAX(Pasang Manual, Pasang SAP)
          const bestPasang = Math.max(d.pman, d.psap);
          const sld = d.drop - bestPasang;

          // Saldo khusus tahun 2025 & 2026
          if (is2025or2026) {
            saldoOpen2025_2026 += sld;
          }

          // Akumulasi rasio open
          openOrderSum += d.ord;
          openDropSum += d.drop;
          openPasangSum += bestPasang; // Terpasang Maksimal untuk Card % Pemasangan
        }
      }
    }

    // Tangani transaksi dinamis form input untuk lokasi yang belum terdaftar di dbLokasiOrder
    const dbLokasiSet = new Set(dbLokasiOrder.map((r) => r.lokasi.trim().toUpperCase()));
    for (const trx of allTrx) {
      const l = trx.lokasi.trim().toUpperCase();
      if (dbLokasiSet.has(l) || isExcludedGorongGorongLocation(l)) continue;
      if (wilayah && wilayah !== 'ALL') {
        const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        const tWil = (trx.wilayah || '').toUpperCase();
        if (!wList.some((w) => tWil.includes(w))) continue;
      }
      const tYear = trx.tanggal ? new Date(trx.tanggal).getFullYear() : 2026;
      const is2025or2026 = tYear === 2025 || tYear === 2026;

      for (const dia of [40, 60, 80, 100]) {
        if (selectedDia && dia !== selectedDia) continue;
        const q = dia === 40 ? trx.qtyD40 : dia === 60 ? trx.qtyD60 : dia === 80 ? trx.qtyD80 : trx.qtyD100;
        if (q <= 0) continue;

        if (trx.jenisTransaksi === 'DROP') {
          if (is2025or2026) saldoOpen2025_2026 += q;
          openDropSum += q;
        } else if (trx.jenisTransaksi === 'PASANG_MANUAL') {
          if (is2025or2026) saldoOpen2025_2026 -= q;
          openPasangSum += q;
        } else if (trx.jenisTransaksi === 'ORDER') {
          openOrderSum += q;
        }
      }
    }

    // 4 & 5. % Kedatangan Murni Fisik (Drop / Order) & % Pemasangan (Pasang / Drop)
    const pctKedatanganOpen = openOrderSum > 0 ? parseFloat(((openDropSum / openOrderSum) * 100).toFixed(1)) : 0;
    const pctPemasanganOpen = openDropSum > 0 ? parseFloat(((openPasangSum / openDropSum) * 100).toFixed(1)) : 0;

    // 2. Data Tren Bulanan untuk Grafik (Murni dari Tahun yang dipilih: targetYear 2026 atau 2025)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyData = months.map((m, idx) => ({
      month: m,
      monthIndex: idx + 1,
      order: 0,
      drop: 0,
      pasangManual: 0,
      pasangSap: 0,
      totalPasang: 0,
      saldo: 0,
      pctKedatangan: 0,
      pctPasang: 0,
    }));

    // Diambil dari dbLokasiOrder berdasarkan targetYear
    for (const row of dbLokasiOrder) {
      const lok = row.lokasi.trim().toUpperCase();
      if (isExcludedGorongGorongLocation(lok)) continue;
      if (!row.tanggalOrder) continue;
      const d = new Date(row.tanggalOrder);
      if (isNaN(d.getTime()) || d.getFullYear() !== targetYear) continue;

      if (wilayah && wilayah !== 'ALL') {
        const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        const rowWil = (row.wilayah || '').toUpperCase();
        if (!wList.some((w) => rowWil.includes(w))) continue;
      }

      const mIdx = d.getMonth();
      if (mIdx < 0 || mIdx >= 12) continue;

      const diaList = [
        { dia: 40, ord: row.orderD40 || 0, drop: row.dropD40 || 0, pman: row.pasangManD40 || 0, psap: row.pasangSapD40 || 0, status: row.statusD40 },
        { dia: 60, ord: row.orderD60 || 0, drop: row.dropD60 || 0, pman: row.pasangManD60 || 0, psap: row.pasangSapD60 || 0, status: row.statusD60 },
        { dia: 80, ord: row.orderD80 || 0, drop: row.dropD80 || 0, pman: row.pasangManD80 || 0, psap: row.pasangSapD80 || 0, status: row.statusD80 },
        { dia: 100, ord: row.orderD100 || 0, drop: row.dropD100 || 0, pman: row.pasangManD100 || 0, psap: row.pasangSapD100 || 0, status: row.statusD100 },
      ];

      for (const diaItem of diaList) {
        if (selectedDia && diaItem.dia !== selectedDia) continue;
        monthlyData[mIdx].order += diaItem.ord;
        monthlyData[mIdx].drop += diaItem.drop;
        monthlyData[mIdx].pasangSap += diaItem.psap;
        monthlyData[mIdx].pasangManual += diaItem.pman;
      }
    }

    // Tambahkan transaksi dinamis dari form input (allTrx) ke grafik bulanan
    const trxManualByMonth: number[] = new Array(12).fill(0);
    for (const trx of allTrx) {
      const lok = trx.lokasi.trim().toUpperCase();
      if (isExcludedGorongGorongLocation(lok)) continue;
      if (!trx.tanggal) continue;
      const d = new Date(trx.tanggal);
      if (isNaN(d.getTime()) || d.getFullYear() !== targetYear) continue;

      if (wilayah && wilayah !== 'ALL') {
        const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        const tWil = (trx.wilayah || '').toUpperCase();
        if (!wList.some((w) => tWil.includes(w))) continue;
      }

      const mIdx = d.getMonth();
      if (mIdx < 0 || mIdx >= 12) continue;

      const qty = selectedDia
        ? (selectedDia === 40 ? trx.qtyD40 : selectedDia === 60 ? trx.qtyD60 : selectedDia === 80 ? trx.qtyD80 : trx.qtyD100)
        : (trx.qtyD40 + trx.qtyD60 + trx.qtyD80 + trx.qtyD100);

      if (qty <= 0) continue;

      if (trx.jenisTransaksi === 'ORDER') {
        monthlyData[mIdx].order += qty;
      } else if (trx.jenisTransaksi === 'DROP') {
        monthlyData[mIdx].drop += qty;
      } else if (trx.jenisTransaksi === 'PASANG_MANUAL') {
        monthlyData[mIdx].pasangManual += qty;
        trxManualByMonth[mIdx] += qty;
      }
    }

    let runningDrop = 0;
    let runningPasang = 0;
    for (let i = 0; i < monthlyData.length; i++) {
      const m = monthlyData[i];
      // Terpasang bulanan: baseline pasangSap + transaksi manual form baru di bulan tersebut
      m.totalPasang = m.pasangSap + trxManualByMonth[i];
      runningDrop += m.drop;
      runningPasang += m.totalPasang;
      m.saldo = Math.max(0, runningDrop - runningPasang);
      // % Kedatangan Murni Fisik (Drop / Order)
      m.pctKedatangan = m.order > 0 ? parseFloat(((m.drop / m.order) * 100).toFixed(1)) : 0;
      // % Pasang Murni Fisik (Total Pasang / Drop)
      m.pctPasang = m.drop > 0 ? parseFloat(((m.totalPasang / m.drop) * 100).toFixed(1)) : 0;
    }

    // 3. Breakdown per Wilayah (AW01 s/d AW07) - Murni dari Tahun yang dipilih & status OPEN
    const wilayahList = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];
    const wilayahBreakdown = wilayahList.map((w) => {
      let wOrder = 0;
      let wDrop = 0;
      let wPasangSap = 0;
      let wTotalPasang = 0;
      let wSaldo = 0;

      for (const row of dbLokasiOrder) {
        const lok = row.lokasi.trim().toUpperCase();
        if (isExcludedGorongGorongLocation(lok)) continue;
        const rowWil = (row.wilayah || '').toUpperCase();
        const matchesWil = rowWil.includes(w) || rowWil.includes(w.replace('AW0', 'Wilayah '));
        if (!matchesWil) continue;

        const rowYear = row.tanggalOrder ? new Date(row.tanggalOrder).getFullYear() : 2026;
        const is2025or2026 = rowYear === 2025 || rowYear === 2026;
        if (!is2025or2026) continue;

        const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
        if (isPetakClosed) continue;

        const tData = trxByLok[lok] || { orders: [], drops: [], manuals: [] };

        const diaList = [
          {
            dia: 40,
            ord: (row.orderD40 || 0) + getTrxSum(tData.orders, 40),
            drop: (row.dropD40 || 0) + getTrxSum(tData.drops, 40),
            pman: (row.pasangManD40 || 0) + getTrxSum(tData.manuals, 40),
            psap: row.pasangSapD40 || 0,
            status: row.statusD40,
          },
          {
            dia: 60,
            ord: (row.orderD60 || 0) + getTrxSum(tData.orders, 60),
            drop: (row.dropD60 || 0) + getTrxSum(tData.drops, 60),
            pman: (row.pasangManD60 || 0) + getTrxSum(tData.manuals, 60),
            psap: row.pasangSapD60 || 0,
            status: row.statusD60,
          },
          {
            dia: 80,
            ord: (row.orderD80 || 0) + getTrxSum(tData.orders, 80),
            drop: (row.dropD80 || 0) + getTrxSum(tData.drops, 80),
            pman: (row.pasangManD80 || 0) + getTrxSum(tData.manuals, 80),
            psap: row.pasangSapD80 || 0,
            status: row.statusD80,
          },
          {
            dia: 100,
            ord: (row.orderD100 || 0) + getTrxSum(tData.orders, 100),
            drop: (row.dropD100 || 0) + getTrxSum(tData.drops, 100),
            pman: (row.pasangManD100 || 0) + getTrxSum(tData.manuals, 100),
            psap: row.pasangSapD100 || 0,
            status: row.statusD100,
          },
        ];

        for (const d of diaList) {
          if (selectedDia && d.dia !== selectedDia) continue;
          const st = (d.status || '-').trim().toLowerCase();
          const isOpen = st === 'open' || st === '-';
          if (isOpen) {
            wOrder += d.ord;
            wDrop += d.drop;
            const bestPasang = Math.max(d.pman, d.psap);
            wTotalPasang += bestPasang;
            wPasangSap += d.psap;
            wSaldo += (d.drop - bestPasang);
          }
        }
      }

      // Periksa apakah ada transaksi form input untuk lokasi baru di wilayah w yang belum ada di dbLokasiOrder
      for (const trx of allTrx) {
        const l = trx.lokasi.trim().toUpperCase();
        if (dbLokasiSet.has(l) || isExcludedGorongGorongLocation(l)) continue;
        const tWil = (trx.wilayah || '').toUpperCase();
        const matchesWil = tWil.includes(w) || tWil.includes(w.replace('AW0', 'Wilayah '));
        if (!matchesWil) continue;

        for (const dia of [40, 60, 80, 100]) {
          if (selectedDia && dia !== selectedDia) continue;
          const q = dia === 40 ? trx.qtyD40 : dia === 60 ? trx.qtyD60 : dia === 80 ? trx.qtyD80 : trx.qtyD100;
          if (q <= 0) continue;
          if (trx.jenisTransaksi === 'ORDER') wOrder += q;
          else if (trx.jenisTransaksi === 'DROP') {
            wDrop += q;
            wSaldo += q;
          } else if (trx.jenisTransaksi === 'PASANG_MANUAL') {
            wTotalPasang += q;
            wSaldo -= q;
          }
        }
      }

      const wPctKedatangan = wOrder > 0 ? (wDrop / wOrder) * 100 : 0;
      const wPctPasang = wDrop > 0 ? (wTotalPasang / wDrop) * 100 : 0;

      return {
        wilayah: w,
        order: wOrder,
        drop: wDrop,
        pasang: wTotalPasang, // TERPASANG MAKSIMAL
        totalPasang: wTotalPasang, // TERPASANG MAKSIMAL
        saldo: wSaldo,
        pctKedatangan: parseFloat(wPctKedatangan.toFixed(1)),
        pctPasang: parseFloat(wPctPasang.toFixed(1)),
      };
    });

    // 4. Breakdown per Diameter (Ø40, Ø60, Ø80, Ø100)
    const diameterBreakdown = allDiameters.map((dia) => {
      let dOrder = 0;
      let dDrop = 0;
      let dPasangMan = 0;
      let dPasangSap = 0;
      let dTotalPasang = 0;
      let dSaldo = 0;

      for (const row of dbLokasiOrder) {
        const lok = row.lokasi.trim().toUpperCase();
        if (isExcludedGorongGorongLocation(lok)) continue;

        if (wilayah && wilayah !== 'ALL') {
          const wList = wilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
          const rowWil = (row.wilayah || '').toUpperCase();
          if (!wList.some((w) => rowWil.includes(w))) continue;
        }

        const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
        if (isPetakClosed) continue;

        const tData = trxByLok[lok] || { orders: [], drops: [], manuals: [] };

        const ord = (dia === 40 ? (row.orderD40 || 0) : dia === 60 ? (row.orderD60 || 0) : dia === 80 ? (row.orderD80 || 0) : (row.orderD100 || 0)) + getTrxSum(tData.orders, dia);
        const drp = (dia === 40 ? (row.dropD40 || 0) : dia === 60 ? (row.dropD60 || 0) : dia === 80 ? (row.dropD80 || 0) : (row.dropD100 || 0)) + getTrxSum(tData.drops, dia);
        const pman = (dia === 40 ? (row.pasangManD40 || 0) : dia === 60 ? (row.pasangManD60 || 0) : dia === 80 ? (row.pasangManD80 || 0) : (row.pasangManD100 || 0)) + getTrxSum(tData.manuals, dia);
        const psap = dia === 40 ? (row.pasangSapD40 || 0) : dia === 60 ? (row.pasangSapD60 || 0) : dia === 80 ? (row.pasangSapD80 || 0) : (row.pasangSapD100 || 0);
        const status = dia === 40 ? row.statusD40 : dia === 60 ? row.statusD60 : dia === 80 ? row.statusD80 : row.statusD100;
        const st = (status || '-').trim().toLowerCase();
        const isOpen = st === 'open' || st === '-';
        if (isOpen) {
          dOrder += ord;
          dDrop += drp;
          dPasangMan += pman;
          dPasangSap += psap;
          const pasang = psap;
          dTotalPasang += pasang;
          const bestPasang = Math.max(pman, psap);
          dSaldo += (drp - bestPasang);
        }
      }

      return {
        diameter: `Ø${dia}CM`,
        diameterInt: dia,
        order: dOrder,
        drop: dDrop,
        pasangManual: dPasangMan,
        pasangSap: dPasangSap,
        totalPasang: dPasangSap, // SAP Saja
        saldo: dSaldo,
        pctKedatangan: dOrder > 0 ? parseFloat(((dDrop / dOrder) * 100).toFixed(1)) : 0,
        pctPasang: dDrop > 0 ? parseFloat(((dPasangSap / dDrop) * 100).toFixed(1)) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          orderYearly: orderYearly,
          terpasangYearly: terpasangSapYearly, // JUMLAH DATA PASANG YANG SAP SAJA (Tahun aktif)
          saldoCurrent: saldoOpen2025_2026,    // Saldo Open khusus tahun 2025 & 2026
          pctKedatangan: parseFloat(pctKedatanganOpen.toFixed(1)),
          pctPemasangan: parseFloat(pctPemasanganOpen.toFixed(1)),
          totalOrderAll: totalOrderAllMaster > 0 ? totalOrderAllMaster : orderYearly,
          totalDropAll: openDropSum,
          totalTerpasangAll: terpasangSapAll,
        },
        monthlyData,
        wilayahBreakdown,
        diameterBreakdown,
      },
    });
  } catch (error: any) {
    console.error('Error fetching gorong-gorong summary:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat data ringkasan gorong-gorong', error: error.message },
      { status: 500 }
    );
  }
}
