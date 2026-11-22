import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Validasi otorisasi: Hanya 6 role (Super Admin, Admin FE, Kabag FE, Manajer FE, Manajer FM, Manajer OSD)
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    if (match) {
      try {
        const user = JSON.parse(decodeURIComponent(match[1]));
        const allowedRoles = ['super_admin', 'admin', 'kepala_bagian_fe', 'manajer_fe', 'manajer_fm', 'manajer_osd'];
        if (user && user.role && !allowedRoles.includes(user.role)) {
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

    // 2. Data Grafik Harian Drop (MURNI transaksi Form Input pada rentang bulan yang dipilih)
    let totalAllDrop = 0;
    const dropByDateMap = new Map<string, number>();

    const formatDateDDMM = (d: Date) => {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}-${month}-${year}`;
    };

    const formatDateKey = (d: Date) => d.toISOString().slice(0, 10);

    // Kumpulkan Drop yang murni dari Form Input (transaksiGorongGorong jenis DROP atau master drop dengan transaksiId)
    const recordedDropTrxIds = new Set<number>();
    const formDropList: Array<{ tanggal: Date; d40: number; d60: number; d80: number; d100: number }> = [];

    for (const t of allFormTrx) {
      if (t.jenisTransaksi !== 'DROP' || !t.tanggal || !inRange(t.tanggal)) continue;
      const tot = (t.qtyD40 || 0) + (t.qtyD60 || 0) + (t.qtyD80 || 0) + (t.qtyD100 || 0);
      if (tot <= 0) continue;
      formDropList.push({
        tanggal: new Date(t.tanggal),
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
      if (!d.tanggal || !inRange(d.tanggal)) continue;
      const tot = (d.diameter40 || 0) + (d.diameter60 || 0) + (d.diameter80 || 0) + (d.diameter100 || 0);
      if (tot <= 0) continue;
      formDropList.push({
        tanggal: new Date(d.tanggal),
        d40: d.diameter40 || 0,
        d60: d.diameter60 || 0,
        d80: d.diameter80 || 0,
        d100: d.diameter100 || 0,
      });
    }

    for (const it of formDropList) {
      const tot = it.d40 + it.d60 + it.d80 + it.d100;
      totalAllDrop += tot;
      const k = formatDateKey(it.tanggal);
      dropByDateMap.set(k, (dropByDateMap.get(k) || 0) + tot);
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
    const pasangManualByDateMap = new Map<string, number>();

    const recordedManualTrxIds = new Set<number>();
    const formManualList: Array<{ tanggal: Date; lokasi: string; d40: number; d60: number; d80: number; d100: number }> = [];

    // 1. Dari transaksiGorongGorong (Form Input jenis PASANG_MANUAL)
    for (const t of allFormTrx) {
      if (t.jenisTransaksi !== 'PASANG_MANUAL' || !t.tanggal || !inRange(t.tanggal)) continue;
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
      if (!m.tanggalPasangManual || !inRange(m.tanggalPasangManual)) continue;
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
      const tot = it.d40 + it.d60 + it.d80 + it.d100;
      totalAllPasangManual += tot;

      const rawDate = formatDateKey(it.tanggal);
      const lok = it.lokasi;
      const key = `${rawDate}_${lok}`;

      pasangManualByDateMap.set(rawDate, (pasangManualByDateMap.get(rawDate) || 0) + tot);

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
            ord: masterOrderMap.has(lok) ? ordM.d40 : (row.orderD40 || 0),
            drop: masterDropMap.has(lok) ? drpM.d40 : (row.dropD40 || 0),
            pman: masterManualMap.has(lok) ? manM.d40 : (row.pasangManD40 || 0),
            psap: lokasiSapMap.has(lok) ? sapM.d40 : (row.pasangSapD40 || 0),
            status: row.statusD40,
          },
          {
            ord: masterOrderMap.has(lok) ? ordM.d60 : (row.orderD60 || 0),
            drop: masterDropMap.has(lok) ? drpM.d60 : (row.dropD60 || 0),
            pman: masterManualMap.has(lok) ? manM.d60 : (row.pasangManD60 || 0),
            psap: lokasiSapMap.has(lok) ? sapM.d60 : (row.pasangSapD60 || 0),
            status: row.statusD60,
          },
          {
            ord: masterOrderMap.has(lok) ? ordM.d80 : (row.orderD80 || 0),
            drop: masterDropMap.has(lok) ? drpM.d80 : (row.dropD80 || 0),
            pman: masterManualMap.has(lok) ? manM.d80 : (row.pasangManD80 || 0),
            psap: lokasiSapMap.has(lok) ? sapM.d80 : (row.pasangSapD80 || 0),
            status: row.statusD80,
          },
          {
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
            const bestPasang = Math.max(d.pman, d.psap);
            openOrderSum += d.ord;
            openDropSum += d.drop;
            openPasangSum += bestPasang;
          }
        }
      }
    }

    const cardPctKedatangan = openOrderSum > 0 ? parseFloat(((openDropSum / openOrderSum) * 100).toFixed(1)) : 0;
    const cardPctPemasangan = openDropSum > 0 ? parseFloat(((openPasangSum / openDropSum) * 100).toFixed(1)) : 0;

    // 4. Data Grafik Harian % Kedatangan (mengikuti progres menuju % Kedatangan Card Menu Monitor)
    const sortedDropDates = Array.from(dropByDateMap.keys()).sort();
    let cumDrop = 0;
    const dailyKedatangan = sortedDropDates.map((dateStr) => {
      const dropQty = dropByDateMap.get(dateStr) || 0;
      cumDrop += dropQty;
      const dt = new Date(dateStr);
      const label = `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`;
      const pct = totalAllDrop > 0
        ? parseFloat(((cumDrop / totalAllDrop) * cardPctKedatangan).toFixed(1))
        : 0;

      return {
        dateStr,
        label,
        dropPcs: dropQty,
        cumDropPcs: cumDrop,
        pctKedatangan: pct,
      };
    });

    // 5. Data Grafik Harian % Pemasangan (mengikuti progres menuju % Pemasangan Card Menu Monitor)
    const sortedPasangDates = Array.from(pasangManualByDateMap.keys()).sort();
    let cumPasangManual = 0;
    const dailyPemasangan = sortedPasangDates.map((dateStr) => {
      const pasangQty = pasangManualByDateMap.get(dateStr) || 0;
      cumPasangManual += pasangQty;
      const dt = new Date(dateStr);
      const label = `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`;
      const pct = totalAllPasangManual > 0
        ? parseFloat(((cumPasangManual / totalAllPasangManual) * cardPctPemasangan).toFixed(1))
        : 0;

      return {
        dateStr,
        label,
        pasangPcs: pasangQty,
        cumPasangPcs: cumPasangManual,
        pctPemasangan: pct,
      };
    });

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
