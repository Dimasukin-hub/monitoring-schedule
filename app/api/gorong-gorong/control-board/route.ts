import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasMenuAccess } from '@/lib/menuAccess';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Validasi otorisasi: mengikuti default 6 role atau kustomisasi akses menu Control Board dari Super Admin
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    if (match) {
      try {
        const user = JSON.parse(decodeURIComponent(match[1]));
        if (user && user.role && !hasMenuAccess(user, 'gorong_gorong', 'control_board')) {
          return NextResponse.json(
            { success: false, message: 'Akses ditolak: Anda tidak memiliki hak akses ke Control Board.' },
            { status: 403 }
          );
        }
      } catch (eAuth) {
        // Abaikan parse error jika sesi corrupt
      }
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const startMonthParam = searchParams.get('startMonth');
    const endMonthParam = searchParams.get('endMonth');
    const singleMonthParam = searchParams.get('month');

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let isFilterActive = false;

    if (yearParam !== null && startMonthParam !== null && endMonthParam !== null) {
      const year = parseInt(yearParam, 10);
      const startMonth = parseInt(startMonthParam, 10);
      const endMonth = parseInt(endMonthParam, 10);
      if (!isNaN(year) && !isNaN(startMonth) && !isNaN(endMonth)) {
        const minM = Math.min(startMonth, endMonth);
        const maxM = Math.max(startMonth, endMonth);
        startDate = new Date(Date.UTC(year, minM, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, maxM + 1, 0, 23, 59, 59, 999));
        isFilterActive = true;
      }
    } else if (singleMonthParam !== null) {
      const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
      const monthIdx = parseInt(singleMonthParam, 10) - 1; // 1-indexed to 0-indexed
      if (!isNaN(year) && !isNaN(monthIdx)) {
        startDate = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, monthIdx + 1, 0, 23, 59, 59, 999));
        isFilterActive = true;
      }
    }

    const inRange = (d: Date | string | null): boolean => {
      if (!isFilterActive) return true;
      if (!d || !startDate || !endDate) return false;
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return false;
      return dateObj >= startDate && dateObj <= endDate;
    };

    // Filter master agar tidak memasukkan record yang seluruh diameternya 0
    const nonZeroWhere = {
      NOT: {
        AND: [
          { diameter40: 0 },
          { diameter60: 0 },
          { diameter80: 0 },
          { diameter100: 0 },
        ],
      },
    };

    // Ambil data dari tabel terkait (termasuk transaksiGorongGorong dari Form Input)
    const [allSap, allManual, allDrops, allOrders, dbLokasiOrder, allFormTrx] = await Promise.all([
      prisma.masterSapGorongGorong.findMany({
        where: { qty: { gt: 0 } },
        orderBy: { tanggalRealisasi: 'asc' },
      }),
      prisma.masterDataPasangManual.findMany({
        where: nonZeroWhere,
        orderBy: { tanggalPasangManual: 'asc' },
      }),
      prisma.masterDataDropGorongGorong.findMany({
        where: nonZeroWhere,
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterDataOrderGorongGorong.findMany({
        where: nonZeroWhere,
        orderBy: { tanggal: 'asc' },
      }),
      prisma.lokasiOrderGorongGorong.findMany({}),
      prisma.transaksiGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
    ]);

    // 1. Hitung Total Order (mengikuti filter rentang bulan jika aktif)
    let totalOrderPcs = 0;
    for (const o of allOrders) {
      if (inRange(o.tanggal)) {
        totalOrderPcs += (o.diameter40 || 0) + (o.diameter60 || 0) + (o.diameter80 || 0) + (o.diameter100 || 0);
      }
    }

    const formatDateDDMM = (d: Date) => {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}-${month}-${year}`;
    };

    const formatDateKey = (d: Date) => d.toISOString().slice(0, 10);

    // Kumpulkan Drop yang murni dari Form Input (semua tanggal, lalu filter tampilan sesuai bulan)
    const recordedDropTrxIds = new Set<number>();
    const formDropList: Array<{ tanggal: Date; lokasi: string; d40: number; d60: number; d80: number; d100: number }> = [];

    for (const t of allFormTrx) {
      if (t.jenisTransaksi !== 'DROP' || !t.tanggal) continue;
      const tot = (t.qtyD40 || 0) + (t.qtyD60 || 0) + (t.qtyD80 || 0) + (t.qtyD100 || 0);
      if (tot <= 0) continue;
      formDropList.push({
        tanggal: new Date(t.tanggal),
        lokasi: (t.lokasi || '').trim().toUpperCase(),
        d40: t.qtyD40 || 0,
        d60: t.qtyD60 || 0,
        d80: t.qtyD80 || 0,
        d100: t.qtyD100 || 0,
      });
      recordedDropTrxIds.add(t.id);
    }

    // Dukung juga jika ada drop form input yang tercatat di masterDataDropGorongGorong dengan transaksiId
    for (const d of allDrops) {
      if (!d.transaksiId || recordedDropTrxIds.has(d.transaksiId)) continue;
      if (!d.tanggal) continue;
      const tot = (d.diameter40 || 0) + (d.diameter60 || 0) + (d.diameter80 || 0) + (d.diameter100 || 0);
      if (tot <= 0) continue;
      formDropList.push({
        tanggal: new Date(d.tanggal),
        lokasi: (d.lokasi || '').trim().toUpperCase(),
        d40: d.diameter40 || 0,
        d60: d.diameter60 || 0,
        d80: d.diameter80 || 0,
        d100: d.diameter100 || 0,
      });
    }

    let totalAllDrop = 0;
    for (const it of formDropList) {
      if (inRange(it.tanggal)) {
        totalAllDrop += it.d40 + it.d60 + it.d80 + it.d100;
      }
    }

    // 3. Data Tabel Verifikasi Pasang Manual vs SAP & Grafik Pasang Manual
    // Sesuai aturan: Baris tabel & grafik harian murni menampilkan transaksi pasang manual dari Form Input
    const tableMap = new Map<string, {
      rawDate: string;
      tanggal: string;
      lokasi: string;
      d40Manual: number;
      d40Sap: number;
      d60Manual: number;
      d60Sap: number;
      d80Manual: number;
      d80Sap: number;
      d100Manual: number;
      d100Sap: number;
    }>();

    let totalAllPasangManual = 0;
    const recordedManualTrxIds = new Set<number>();
    const formManualList: Array<{ tanggal: Date; lokasi: string; d40: number; d60: number; d80: number; d100: number }> = [];

    // 1. Dari transaksiGorongGorong (Form Input jenis PASANG_MANUAL)
    for (const t of allFormTrx) {
      if (t.jenisTransaksi !== 'PASANG_MANUAL' || !t.tanggal) continue;
      const tot = (t.qtyD40 || 0) + (t.qtyD60 || 0) + (t.qtyD80 || 0) + (t.qtyD100 || 0);
      if (tot <= 0) continue;
      formManualList.push({
        tanggal: new Date(t.tanggal),
        lokasi: (t.lokasi || '').trim().toUpperCase(),
        d40: t.qtyD40 || 0,
        d60: t.qtyD60 || 0,
        d80: t.qtyD80 || 0,
        d100: t.qtyD100 || 0,
      });
      recordedManualTrxIds.add(t.id);
    }

    // 2. Dari masterDataPasangManual (mendukung data form input atau masterDataPasangManual yang ada)
    for (const m of allManual) {
      if (m.transaksiId && recordedManualTrxIds.has(m.transaksiId)) continue;
      if (!m.tanggalPasangManual) continue;
      const tot = (m.diameter40 || 0) + (m.diameter60 || 0) + (m.diameter80 || 0) + (m.diameter100 || 0);
      if (tot <= 0) continue;
      if (allFormTrx.some((t) => t.jenisTransaksi === 'PASANG_MANUAL') && !m.transaksiId) continue;
      formManualList.push({
        tanggal: new Date(m.tanggalPasangManual),
        lokasi: (m.lokasi || '').trim().toUpperCase(),
        d40: m.diameter40 || 0,
        d60: m.diameter60 || 0,
        d80: m.diameter80 || 0,
        d100: m.diameter100 || 0,
      });
    }

    for (const it of formManualList) {
      if (!inRange(it.tanggal)) continue;
      const tot = it.d40 + it.d60 + it.d80 + it.d100;
      totalAllPasangManual += tot;

      const rawDate = formatDateKey(it.tanggal);
      const lok = it.lokasi;
      const key = `${rawDate}_${lok}`;

      if (!tableMap.has(key)) {
        tableMap.set(key, {
          rawDate,
          tanggal: formatDateDDMM(it.tanggal),
          lokasi: lok,
          d40Manual: 0,
          d40Sap: 0,
          d60Manual: 0,
          d60Sap: 0,
          d80Manual: 0,
          d80Sap: 0,
          d100Manual: 0,
          d100Sap: 0,
        });
      }

      const ent = tableMap.get(key)!;
      ent.d40Manual += it.d40;
      ent.d60Manual += it.d60;
      ent.d80Manual += it.d80;
      ent.d100Manual += it.d100;
    }

    // Masukkan Pasang SAP: Hanya mencocokkan jika pada Tanggal & Lokasi tersebut ada pasang manual
    let totalSapAll = 0;
    for (const s of allSap) {
      if (!s.tanggalRealisasi || !inRange(s.tanggalRealisasi)) continue;
      const dObj = new Date(s.tanggalRealisasi);
      const rawDate = formatDateKey(dObj);
      const lok = s.lokasi.trim().toUpperCase();
      const key = `${rawDate}_${lok}`;
      const qty = s.qty || 0;
      totalSapAll += qty;

      if (tableMap.has(key)) {
        const ent = tableMap.get(key)!;
        if (s.diameter === 40) ent.d40Sap += qty;
        else if (s.diameter === 60) ent.d60Sap += qty;
        else if (s.diameter === 80) ent.d80Sap += qty;
        else if (s.diameter === 100) ent.d100Sap += qty;
      }
    }

    // Status Match: Hanya jika kedua isian data angka sama persis antara manual dan SAP
    const tableVerification = Array.from(tableMap.values())
      .map((row) => {
        const isMatch =
          row.d40Manual === row.d40Sap &&
          row.d60Manual === row.d60Sap &&
          row.d80Manual === row.d80Sap &&
          row.d100Manual === row.d100Sap;

        return {
          ...row,
          status: (isMatch ? 'Match' : 'Check') as 'Match' | 'Check',
        };
      })
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate) || a.lokasi.localeCompare(b.lokasi));

    // Sinkronisasi Rasio Card Status Open yang 100% identik dengan Card Menu Monitor Gorong-Gorong
    const masterOrderMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    for (const o of allOrders) {
      const l = (o.lokasi || '').trim().toUpperCase();
      if (!masterOrderMap.has(l)) masterOrderMap.set(l, { d40: 0, d60: 0, d80: 0, d100: 0 });
      const ent = masterOrderMap.get(l)!;
      ent.d40 += o.diameter40 || 0;
      ent.d60 += o.diameter60 || 0;
      ent.d80 += o.diameter80 || 0;
      ent.d100 += o.diameter100 || 0;
    }

    const masterDropMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    for (const d of allDrops) {
      const l = (d.lokasi || '').trim().toUpperCase();
      if (!masterDropMap.has(l)) masterDropMap.set(l, { d40: 0, d60: 0, d80: 0, d100: 0 });
      const ent = masterDropMap.get(l)!;
      ent.d40 += d.diameter40 || 0;
      ent.d60 += d.diameter60 || 0;
      ent.d80 += d.diameter80 || 0;
      ent.d100 += d.diameter100 || 0;
    }

    const masterManualMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    for (const m of allManual) {
      const l = (m.lokasi || '').trim().toUpperCase();
      if (!masterManualMap.has(l)) masterManualMap.set(l, { d40: 0, d60: 0, d80: 0, d100: 0 });
      const ent = masterManualMap.get(l)!;
      ent.d40 += m.diameter40 || 0;
      ent.d60 += m.diameter60 || 0;
      ent.d80 += m.diameter80 || 0;
      ent.d100 += m.diameter100 || 0;
    }

    const lokasiSapMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    for (const s of allSap) {
      const l = (s.lokasi || '').trim().toUpperCase();
      if (!lokasiSapMap.has(l)) lokasiSapMap.set(l, { d40: 0, d60: 0, d80: 0, d100: 0 });
      const ent = lokasiSapMap.get(l)!;
      if (s.diameter === 40) ent.d40 += s.qty || 0;
      else if (s.diameter === 60) ent.d60 += s.qty || 0;
      else if (s.diameter === 80) ent.d80 += s.qty || 0;
      else if (s.diameter === 100) ent.d100 += s.qty || 0;
    }

    let openOrderSum = 0;
    let openDropSum = 0;
    let openPasangSum = 0;
    const openDiaSet = new Set<string>();

    const openStats = {
      '40': { order: 0, drop: 0, pasang: 0 },
      '60': { order: 0, drop: 0, pasang: 0 },
      '80': { order: 0, drop: 0, pasang: 0 },
      '100': { order: 0, drop: 0, pasang: 0 },
    };

    if (dbLokasiOrder && dbLokasiOrder.length > 0) {
      for (const row of dbLokasiOrder) {
        const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
        if (isPetakClosed) continue;

        const lok = (row.lokasi || '').trim().toUpperCase();
        const ordM = masterOrderMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0 };
        const drpM = masterDropMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0 };
        const manM = masterManualMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0 };
        const sapM = lokasiSapMap.get(lok) || { d40: 0, d60: 0, d80: 0, d100: 0 };

        const diaList = [
          {
            dia: '40' as const,
            ord: masterOrderMap.has(lok) ? ordM.d40 : (row.orderD40 || 0),
            drop: masterDropMap.has(lok) ? drpM.d40 : (row.dropD40 || 0),
            pman: masterManualMap.has(lok) ? manM.d40 : (row.pasangManD40 || 0),
            psap: lokasiSapMap.has(lok) ? sapM.d40 : (row.pasangSapD40 || 0),
            status: row.statusD40,
          },
          {
            dia: '60' as const,
            ord: masterOrderMap.has(lok) ? ordM.d60 : (row.orderD60 || 0),
            drop: masterDropMap.has(lok) ? drpM.d60 : (row.dropD60 || 0),
            pman: masterManualMap.has(lok) ? manM.d60 : (row.pasangManD60 || 0),
            psap: lokasiSapMap.has(lok) ? sapM.d60 : (row.pasangSapD60 || 0),
            status: row.statusD60,
          },
          {
            dia: '80' as const,
            ord: masterOrderMap.has(lok) ? ordM.d80 : (row.orderD80 || 0),
            drop: masterDropMap.has(lok) ? drpM.d80 : (row.dropD80 || 0),
            pman: masterManualMap.has(lok) ? manM.d80 : (row.pasangManD80 || 0),
            psap: lokasiSapMap.has(lok) ? sapM.d80 : (row.pasangSapD80 || 0),
            status: row.statusD80,
          },
          {
            dia: '100' as const,
            ord: masterOrderMap.has(lok) ? ordM.d100 : (row.orderD100 || 0),
            drop: masterDropMap.has(lok) ? drpM.d100 : (row.dropD100 || 0),
            pman: masterManualMap.has(lok) ? manM.d100 : (row.pasangManD100 || 0),
            psap: lokasiSapMap.has(lok) ? sapM.d100 : (row.pasangSapD100 || 0),
            status: row.statusD100,
          },
        ];

        for (const d of diaList) {
          const st = (d.status || '-').trim().toLowerCase();
          const isOpen = st === 'open' || st === '-';
          if (isOpen) {
            openDiaSet.add(`${lok}_${d.dia}`);
            const bestPasang = Math.max(d.pman, d.psap);
            openOrderSum += d.ord;
            openDropSum += d.drop;
            openPasangSum += bestPasang;

            openStats[d.dia].order += d.ord;
            openStats[d.dia].drop += d.drop;
            openStats[d.dia].pasang += bestPasang;
          }
        }
      }
    }

    // Rumus sesuai arahan pengguna (TIDAK DIUBAH):
    // %Kedatangan = Total Drop Fisik (Status Open) dibagi Total Order (Status Open) * 100%
    // %Pemasangan = Total Pasang Maksimal (Status Open) dibagi Total Drop Fisik (Status Open) * 100%
    const calcTargetValues = (ord: number, drp: number, psg: number) => ({
      pctKedatangan: ord > 0 ? parseFloat(((drp / ord) * 100).toFixed(1)) : 0,
      pctPemasangan: drp > 0 ? parseFloat(((psg / drp) * 100).toFixed(1)) : 0,
      orderOpen: ord,
      dropOpen: drp,
      pasangOpen: psg,
    });

    const targets = {
      '40': calcTargetValues(openStats['40'].order, openStats['40'].drop, openStats['40'].pasang),
      '60': calcTargetValues(openStats['60'].order, openStats['60'].drop, openStats['60'].pasang),
      '80': calcTargetValues(openStats['80'].order, openStats['80'].drop, openStats['80'].pasang),
      '100': calcTargetValues(openStats['100'].order, openStats['100'].drop, openStats['100'].pasang),
      'ALL': calcTargetValues(openOrderSum, openDropSum, openPasangSum),
    };

    const cardPctKedatangan = targets.ALL.pctKedatangan;
    const cardPctPemasangan = targets.ALL.pctPemasangan;

    // Helper membangun series harian kumulatif menggunakan rumus Open yang sama + delta kontribusi harian
    type DiaBucket = { d40: number; d60: number; d80: number; d100: number; all: number; open40: number; open60: number; open80: number; open100: number; openAll: number };
    const buildDailyProgressSeries = (
      items: Array<{ tanggal: Date; lokasi: string; d40: number; d60: number; d80: number; d100: number }>,
      mode: 'kedatangan' | 'pemasangan'
    ) => {
      const dateMap = new Map<string, DiaBucket>();
      for (const it of items) {
        const k = formatDateKey(it.tanggal);
        if (!dateMap.has(k)) {
          dateMap.set(k, { d40: 0, d60: 0, d80: 0, d100: 0, all: 0, open40: 0, open60: 0, open80: 0, open100: 0, openAll: 0 });
        }
        const entry = dateMap.get(k)!;
        entry.d40 += it.d40;
        entry.d60 += it.d60;
        entry.d80 += it.d80;
        entry.d100 += it.d100;
        entry.all += it.d40 + it.d60 + it.d80 + it.d100;

        const o40 = openDiaSet.has(`${it.lokasi}_40`) ? it.d40 : 0;
        const o60 = openDiaSet.has(`${it.lokasi}_60`) ? it.d60 : 0;
        const o80 = openDiaSet.has(`${it.lokasi}_80`) ? it.d80 : 0;
        const o100 = openDiaSet.has(`${it.lokasi}_100`) ? it.d100 : 0;
        entry.open40 += o40;
        entry.open60 += o60;
        entry.open80 += o80;
        entry.open100 += o100;
        entry.openAll += o40 + o60 + o80 + o100;
      }

      const sortedDates = Array.from(dateMap.keys()).sort();
      const suffixAfter = { '40': 0, '60': 0, '80': 0, '100': 0, 'ALL': 0 };
      const afterByDate = new Map<string, Record<'40' | '60' | '80' | '100' | 'ALL', number>>();

      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const ds = sortedDates[i];
        afterByDate.set(ds, { ...suffixAfter });
        const ent = dateMap.get(ds)!;
        suffixAfter['40'] += ent.open40;
        suffixAfter['60'] += ent.open60;
        suffixAfter['80'] += ent.open80;
        suffixAfter['100'] += ent.open100;
        suffixAfter['ALL'] += ent.openAll;
      }

      const diaKeys = ['40', '60', '80', '100', 'ALL'] as const;
      return sortedDates
        .filter((ds) => inRange(new Date(`${ds}T00:00:00.000Z`)))
        .map((dateStr) => {
          const ent = dateMap.get(dateStr)!;
          const after = afterByDate.get(dateStr)!;
          const dt = new Date(dateStr);
          const label = `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`;

          const pctByDia = {} as Record<'40' | '60' | '80' | '100' | 'ALL', number>;
          const deltaPctByDia = {} as Record<'40' | '60' | '80' | '100' | 'ALL', number>;

          for (const dk of diaKeys) {
            const t = targets[dk];
            const numeratorCurrent = mode === 'kedatangan' ? t.dropOpen : t.pasangOpen;
            const denominator = mode === 'kedatangan' ? t.orderOpen : t.dropOpen;
            const dayOpenQty =
              dk === '40' ? ent.open40 : dk === '60' ? ent.open60 : dk === '80' ? ent.open80 : dk === '100' ? ent.open100 : ent.openAll;

            const qtyAtEnd = Math.max(0, numeratorCurrent - after[dk]);
            const qtyBefore = Math.max(0, qtyAtEnd - dayOpenQty);
            const pctEnd = denominator > 0 ? parseFloat(((qtyAtEnd / denominator) * 100).toFixed(1)) : 0;
            const pctBefore = denominator > 0 ? parseFloat(((qtyBefore / denominator) * 100).toFixed(1)) : 0;

            pctByDia[dk] = pctEnd;
            deltaPctByDia[dk] = parseFloat((pctEnd - pctBefore).toFixed(1));
          }

          return {
            dateStr,
            label,
            d40: ent.d40,
            d60: ent.d60,
            d80: ent.d80,
            d100: ent.d100,
            all: ent.all,
            pctByDia,
            deltaPctByDia,
          };
        });
    };

    // 4. Data Grafik Harian % Kedatangan
    const dailyKedatangan = buildDailyProgressSeries(formDropList, 'kedatangan').map((row) => ({
      ...row,
      dropPcs: row.all,
    }));

    // 5. Data Grafik Harian % Pemasangan
    const dailyPemasangan = buildDailyProgressSeries(formManualList, 'pemasangan').map((row) => ({
      ...row,
      pasangPcs: row.all,
    }));

    // KPI Summary
    const summary = {
      totalOrder: totalOrderPcs,
      totalDrop: totalAllDrop,
      totalPasangManual: totalAllPasangManual,
      totalPasangSap: totalSapAll,
      pctKedatangan: cardPctKedatangan,
      pctPemasangan: cardPctPemasangan,
    };

    return NextResponse.json({
      success: true,
      isFilterActive,
      summary,
      targets,
      tableVerification,
      dailyKedatangan,
      dailyPemasangan,
    });
  } catch (error: any) {
    console.error('Error in GET /api/gorong-gorong/control-board:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat data control board', error: error.message },
      { status: 500 }
    );
  }
}
