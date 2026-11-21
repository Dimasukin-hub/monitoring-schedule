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

    // Ambil data dari tabel terkait
    const [allSap, allManual, allDrops, allOrders, dbLokasiOrder] = await Promise.all([
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
    ]);

    // 1. Hitung Total Order (mengikuti filter rentang bulan jika aktif)
    let totalOrderPcs = 0;
    for (const o of allOrders) {
      if (inRange(o.tanggal)) {
        totalOrderPcs += (o.diameter40 || 0) + (o.diameter60 || 0) + (o.diameter80 || 0) + (o.diameter100 || 0);
      }
    }

    // 2. Hitung Total Drop (mengikuti filter rentang bulan jika aktif)
    let totalAllDrop = 0;
    const dropByDateMap = new Map<string, number>();

    const formatDateDDMM = (d: Date) => {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatDateKey = (d: Date) => d.toISOString().slice(0, 10);

    for (const d of allDrops) {
      if (!d.tanggal || !inRange(d.tanggal)) continue;
      const dObj = new Date(d.tanggal);
      const tot = (d.diameter40 || 0) + (d.diameter60 || 0) + (d.diameter80 || 0) + (d.diameter100 || 0);
      if (tot <= 0) continue;
      totalAllDrop += tot;

      const k = formatDateKey(dObj);
      dropByDateMap.set(k, (dropByDateMap.get(k) || 0) + tot);
    }

    // 3. Data Tabel Verifikasi Pasang Manual vs SAP (per Tanggal & Lokasi, mengikuti rentang bulan)
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

    // Masukkan Pasang Manual
    for (const m of allManual) {
      if (!m.tanggalPasangManual || !inRange(m.tanggalPasangManual)) continue;
      const dObj = new Date(m.tanggalPasangManual);
      const tot = (m.diameter40 || 0) + (m.diameter60 || 0) + (m.diameter80 || 0) + (m.diameter100 || 0);
      totalAllPasangManual += tot;

      const rawDate = formatDateKey(dObj);
      const lok = m.lokasi.trim().toUpperCase();
      const key = `${rawDate}_${lok}`;

      pasangManualByDateMap.set(rawDate, (pasangManualByDateMap.get(rawDate) || 0) + tot);

      if (!tableMap.has(key)) {
        tableMap.set(key, {
          rawDate,
          tanggal: formatDateDDMM(dObj),
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
      ent.d40Manual += (m.diameter40 || 0);
      ent.d60Manual += (m.diameter60 || 0);
      ent.d80Manual += (m.diameter80 || 0);
      ent.d100Manual += (m.diameter100 || 0);
    }

    // Masukkan Pasang SAP
    let totalSapAll = 0;
    for (const s of allSap) {
      if (!s.tanggalRealisasi || !inRange(s.tanggalRealisasi)) continue;
      const dObj = new Date(s.tanggalRealisasi);
      const rawDate = formatDateKey(dObj);
      const lok = s.lokasi.trim().toUpperCase();
      const key = `${rawDate}_${lok}`;
      const qty = s.qty || 0;
      totalSapAll += qty;

      if (!tableMap.has(key)) {
        tableMap.set(key, {
          rawDate,
          tanggal: formatDateDDMM(dObj),
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
      if (s.diameter === 40) ent.d40Sap += qty;
      else if (s.diameter === 60) ent.d60Sap += qty;
      else if (s.diameter === 80) ent.d80Sap += qty;
      else if (s.diameter === 100) ent.d100Sap += qty;
    }

    // Helper match: jika manual 0 tapi sap > 0, tidak dianggap mismatch
    const isDiaMatch = (man: number, sap: number) => {
      if (man === sap) return true;
      if (man === 0 && sap > 0) return true;
      return false;
    };

    // Ubah ke array dan hitung status match/check
    const tableVerification = Array.from(tableMap.values())
      .map((row) => {
        const isMatch =
          isDiaMatch(row.d40Manual, row.d40Sap) &&
          isDiaMatch(row.d60Manual, row.d60Sap) &&
          isDiaMatch(row.d80Manual, row.d80Sap) &&
          isDiaMatch(row.d100Manual, row.d100Sap);

        return {
          ...row,
          status: (isMatch ? 'Match' : 'Check') as 'Match' | 'Check',
        };
      })
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate) || a.lokasi.localeCompare(b.lokasi));

    // Hitung Rasio Status Open yang sama persis dengan Card Menu Monitor Gorong-Gorong
    let openOrderSum = 0;
    let openDropSum = 0;
    let openPasangSum = 0;

    if (dbLokasiOrder && dbLokasiOrder.length > 0) {
      for (const row of dbLokasiOrder) {
        const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
        if (isPetakClosed) continue;

        const diaList = [
          { ord: row.orderD40 || 0, drop: row.dropD40 || 0, pman: row.pasangManD40 || 0, psap: row.pasangSapD40 || 0, status: row.statusD40 },
          { ord: row.orderD60 || 0, drop: row.dropD60 || 0, pman: row.pasangManD60 || 0, psap: row.pasangSapD60 || 0, status: row.statusD60 },
          { ord: row.orderD80 || 0, drop: row.dropD80 || 0, pman: row.pasangManD80 || 0, psap: row.pasangSapD80 || 0, status: row.statusD80 },
          { ord: row.orderD100 || 0, drop: row.dropD100 || 0, pman: row.pasangManD100 || 0, psap: row.pasangSapD100 || 0, status: row.statusD100 },
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

    const cardPctKedatangan = openOrderSum > 0 ? parseFloat(((openDropSum / openOrderSum) * 100).toFixed(1)) : 68.0;
    const cardPctPemasangan = openDropSum > 0 ? parseFloat(((openPasangSum / openDropSum) * 100).toFixed(1)) : 71.3;

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
        : (totalOrderPcs > 0 ? parseFloat(((cumDrop / totalOrderPcs) * 100).toFixed(1)) : 0);

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
        : (totalAllDrop > 0 ? parseFloat(((cumPasangManual / totalAllDrop) * 100).toFixed(1)) : 0);

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
