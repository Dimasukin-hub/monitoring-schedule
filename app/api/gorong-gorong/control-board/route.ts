import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterYear = searchParams.get('year') || '2026';
    const filterWilayah = searchParams.get('wilayah') || '';

    // Ambil data dari tabel terkait
    const [allSap, allManual, allDrops, allOrders] = await Promise.all([
      prisma.masterSapGorongGorong.findMany({
        orderBy: { tanggalRealisasi: 'asc' },
      }),
      prisma.masterDataPasangManual.findMany({
        orderBy: { tanggalPasangManual: 'asc' },
      }),
      prisma.masterDataDropGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterDataOrderGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
    ]);

    // 1. Hitung Total Order (baseline acuan % kedatangan)
    let totalOrderPcs = 0;
    for (const o of allOrders) {
      totalOrderPcs += (o.diameter40 || 0) + (o.diameter60 || 0) + (o.diameter80 || 0) + (o.diameter100 || 0);
    }
    if (totalOrderPcs === 0) totalOrderPcs = 1; // Cegah div/0

    // 2. Data Tabel Verifikasi Pasang Manual vs SAP (per Tanggal & Lokasi)
    // Map key: `${dateStr}_${lokasi}`
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

    // Helper format date
    const formatDateDDMM = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatDateKey = (d: Date) => d.toISOString().slice(0, 10);

    // Masukkan Pasang Manual
    for (const m of allManual) {
      if (!m.tanggalPasangManual) continue;
      const dObj = new Date(m.tanggalPasangManual);
      const rawDate = formatDateKey(dObj);
      const lok = m.lokasi.trim().toUpperCase();
      const key = `${rawDate}_${lok}`;

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
      totalSapAll += (s.qty || 0);
      if (!s.tanggalRealisasi) continue;
      const dObj = new Date(s.tanggalRealisasi);
      const rawDate = formatDateKey(dObj);
      const lok = s.lokasi.trim().toUpperCase();
      const key = `${rawDate}_${lok}`;

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
      if (s.diameter === 40) ent.d40Sap += (s.qty || 0);
      else if (s.diameter === 60) ent.d60Sap += (s.qty || 0);
      else if (s.diameter === 80) ent.d80Sap += (s.qty || 0);
      else if (s.diameter === 100) ent.d100Sap += (s.qty || 0);
    }

    // Ubah ke array dan hitung status match/check
    const tableVerification = Array.from(tableMap.values())
      .map((row) => {
        const isMatch =
          row.d40Manual === row.d40Sap &&
          row.d60Manual === row.d60Sap &&
          row.d80Manual === row.d80Sap &&
          row.d100Manual === row.d100Sap;

        return {
          ...row,
          status: isMatch ? 'Match' : 'Check',
        };
      })
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate) || a.lokasi.localeCompare(b.lokasi));

    // 3. Data Grafik Harian % Kedatangan (Batang: Drop harian, Garis: % Kedatangan kumulatif)
    const dropByDateMap = new Map<string, number>();
    for (const d of allDrops) {
      if (!d.tanggal) continue;
      const k = formatDateKey(new Date(d.tanggal));
      const tot = (d.diameter40 || 0) + (d.diameter60 || 0) + (d.diameter80 || 0) + (d.diameter100 || 0);
      dropByDateMap.set(k, (dropByDateMap.get(k) || 0) + tot);
    }

    const sortedDropDates = Array.from(dropByDateMap.keys()).sort();
    let cumDrop = 0;
    const dailyKedatangan = sortedDropDates.map((dateStr) => {
      const dropQty = dropByDateMap.get(dateStr) || 0;
      cumDrop += dropQty;
      const dt = new Date(dateStr);
      const label = `${dt.getDate()}/${dt.getMonth() + 1}`;
      const pct = parseFloat(((cumDrop / totalOrderPcs) * 100).toFixed(1));

      return {
        dateStr,
        label,
        dropPcs: dropQty,
        cumDropPcs: cumDrop,
        pctKedatangan: pct,
      };
    });

    // 4. Data Grafik Harian % Pemasangan (Batang: Pasang Manual harian, Garis: % Pemasangan kumulatif thdp drop)
    const pasangManualByDateMap = new Map<string, number>();
    for (const m of allManual) {
      if (!m.tanggalPasangManual) continue;
      const k = formatDateKey(new Date(m.tanggalPasangManual));
      const tot = (m.diameter40 || 0) + (m.diameter60 || 0) + (m.diameter80 || 0) + (m.diameter100 || 0);
      pasangManualByDateMap.set(k, (pasangManualByDateMap.get(k) || 0) + tot);
    }

    const sortedPasangDates = Array.from(pasangManualByDateMap.keys()).sort();
    let cumPasangManual = 0;
    const totalDropPcs = cumDrop > 0 ? cumDrop : 1;

    const dailyPemasangan = sortedPasangDates.map((dateStr) => {
      const pasangQty = pasangManualByDateMap.get(dateStr) || 0;
      cumPasangManual += pasangQty;
      const dt = new Date(dateStr);
      const label = `${dt.getDate()}/${dt.getMonth() + 1}`;
      const pct = parseFloat(((cumPasangManual / totalDropPcs) * 100).toFixed(1));

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
      totalDrop: cumDrop,
      totalPasangManual: cumPasangManual,
      totalPasangSap: totalSapAll, // Sesuai permintaan: Total Terpasang SAP
      pctKedatangan: parseFloat(((cumDrop / totalOrderPcs) * 100).toFixed(1)),
      pctPemasangan: parseFloat(((cumPasangManual / totalDropPcs) * 100).toFixed(1)),
    };

    return NextResponse.json({
      success: true,
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

