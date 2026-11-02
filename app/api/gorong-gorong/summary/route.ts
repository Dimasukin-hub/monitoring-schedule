import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wilayah = searchParams.get('wilayah');
    const diameterParam = searchParams.get('diameter');
    const yearParam = searchParams.get('year');
    const targetYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

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

    const [allTrx, allSap, masterStatusList] = await Promise.all([
      prisma.transaksiGorongGorong.findMany({
        where: trxWhere,
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterSapGorongGorong.findMany({
        where: sapWhere,
        orderBy: { tanggalRealisasi: 'asc' },
      }),
      prisma.masterStatusLokasi.findMany({
        select: { lokasi: true, wil: true },
      }),
    ]);

    const wilMap = new Map<string, string>();
    for (const m of masterStatusList) {
      if (m.wil) wilMap.set(m.lokasi.trim().toUpperCase(), m.wil.trim().toUpperCase());
    }

    // 1. Hitung Data per Lokasi & per Diameter mengikuti Standar Formula Excel:
    // Terpasang = MAX(Pasang Manual, Pasang SAP)
    // Saldo = MAX(0, Drop - MAX(Pasang Manual, Pasang SAP))
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

    // Proses allTrx
    for (const trx of allTrx) {
      const trxYear = new Date(trx.tanggal).getFullYear();
      const isYear = trxYear === targetYear;
      const lok = trx.lokasi.trim().toUpperCase();
      const wil = trx.wilayah ? trx.wilayah.trim().toUpperCase() : (wilMap.get(lok) || '');

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
          if (isYear) e.orderYearly += q;
        } else if (trx.jenisTransaksi === 'DROP') {
          e.dropAll += q;
          if (isYear) e.dropYearly += q;
        } else if (trx.jenisTransaksi === 'PASANG_MANUAL') {
          e.manualAll += q;
          if (isYear) e.manualYearly += q;
        }
      }
    }

    // Proses allSap murni dari kolom qty
    for (const s of allSap) {
      const sapYear = new Date(s.tanggalRealisasi).getFullYear();
      const isYear = sapYear === targetYear;
      const lok = s.lokasi.trim().toUpperCase();
      const dia = s.diameter;
      const wil = wilMap.get(lok) || (s.wilayahSap?.startsWith('AW') ? s.wilayahSap.trim().toUpperCase() : '') || (s.penanggungJawab ? 'AW0' + s.penanggungJawab.replace(/\D/g, '') : '');

      const e = getLokDia(lok, dia, wil);
      e.sapAll += s.qty;
      if (isYear) e.sapYearly += s.qty;
    }

    // Kumpulkan lokasi-lokasi yang masuk ke Tabel List Lokasi Order (Order, Drop, Pasang Manual, atau SAP)
    const orderedLokSet = new Set<string>();
    for (const trx of allTrx) {
      if (trx.jenisTransaksi === 'ORDER' || trx.jenisTransaksi === 'DROP' || trx.jenisTransaksi === 'PASANG_MANUAL') {
        orderedLokSet.add(trx.lokasi.trim().toUpperCase());
      }
    }
    for (const s of allSap) {
      orderedLokSet.add(s.lokasi.trim().toUpperCase());
      if (s.referensiLokasi) orderedLokSet.add(s.referensiLokasi.trim().toUpperCase());
    }

    // Hitung 5 Kartu KPI Summarized:
    // 1. Total Order: Current Tahun 2026
    // 2. Total Terpasang: Current Tahun 2026
    // 3. Saldo di Lokasi: Status Open Saja (Semua Tahun)
    // 4. % Kedatangan: Status Open Saja
    // 5. % Pemasangan: Status Open Saja

    let order2026 = 0;
    let terpasang2026 = 0;
    let saldoOpen = 0;
    let openOrd = 0;
    let openDrop = 0;
    let openPasang = 0;

    let totalOrderAll = 0;
    let totalDropAll = 0;
    let totalTerpasangAll = 0;

    for (const e of lokDiaMap.values()) {
      // Hanya petak yang masuk sesuai tabel List Lokasi Order
      if (!orderedLokSet.has(e.lokasi)) continue;

      totalOrderAll += e.orderAll;
      totalDropAll += e.dropAll;
      const pasangAll = Math.max(e.manualAll, e.sapAll);
      totalTerpasangAll += pasangAll;

      order2026 += e.orderYearly;
      terpasang2026 += Math.max(e.manualYearly, e.sapYearly);

      const saldoAll = e.dropAll - pasangAll;

      let isClose = false;
      if (e.orderAll > 0 || e.dropAll > 0 || pasangAll > 0) {
        if (e.dropAll >= e.orderAll && saldoAll <= 0 && pasangAll > 0) {
          isClose = true;
        }
      }

      if (!isClose && (e.orderAll > 0 || e.dropAll > 0)) {
        saldoOpen += saldoAll;
        openOrd += e.orderAll;
        openDrop += e.dropAll;
        openPasang += pasangAll;
      }
    }

    const pctKedatanganOpen = openOrd > 0 ? (openDrop / openOrd) * 100 : (openDrop > 0 ? 100 : 0);
    const pctPemasanganOpen = openDrop > 0 ? (openPasang / openDrop) * 100 : (openPasang > 0 ? 100 : 0);

    // 2. Data Tren Bulanan untuk Grafik (Order vs Drop vs Pasang + % Kedatangan & % Pasang)
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

    for (const trx of allTrx) {
      const d = new Date(trx.tanggal);
      if (d.getFullYear() !== targetYear) continue;
      const mIdx = d.getMonth();
      const sumQty = selectedDia
        ? (selectedDia === 40 ? trx.qtyD40 : selectedDia === 60 ? trx.qtyD60 : selectedDia === 80 ? trx.qtyD80 : trx.qtyD100)
        : (trx.qtyD40 + trx.qtyD60 + trx.qtyD80 + trx.qtyD100);
      if (mIdx >= 0 && mIdx < 12) {
        if (trx.jenisTransaksi === 'ORDER') monthlyData[mIdx].order += sumQty;
        if (trx.jenisTransaksi === 'DROP') monthlyData[mIdx].drop += sumQty;
        if (trx.jenisTransaksi === 'PASANG_MANUAL') monthlyData[mIdx].pasangManual += sumQty;
      }
    }

    for (const s of allSap) {
      if (selectedDia && s.diameter !== selectedDia) continue;
      const d = new Date(s.tanggalRealisasi);
      if (d.getFullYear() !== targetYear) continue;
      const mIdx = d.getMonth();
      if (mIdx >= 0 && mIdx < 12) {
        monthlyData[mIdx].pasangSap += s.qty;
      }
    }

    // Hitung total pasang (MAX), saldo kumulatif, serta persentase bulanan
    let runningDrop = 0;
    let runningPasang = 0;
    for (const m of monthlyData) {
      m.totalPasang = Math.max(m.pasangManual, m.pasangSap);
      runningDrop += m.drop;
      runningPasang += m.totalPasang;
      m.saldo = Math.max(0, runningDrop - runningPasang);
      const mPctKedatangan = m.order > 0 ? (m.drop / m.order) * 100 : (m.drop > 0 ? 100 : 0);
      const mPctPasang = m.drop > 0 ? (m.totalPasang / m.drop) * 100 : (m.totalPasang > 0 ? 100 : 0);
      m.pctKedatangan = parseFloat(mPctKedatangan.toFixed(1));
      m.pctPasang = parseFloat(mPctPasang.toFixed(1));
    }

    // 3. Breakdown per Wilayah (AW01 s/d AW07)
    const wilayahList = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];
    const wilayahBreakdown = wilayahList.map((w) => {
      let wOrder = 0;
      let wDrop = 0;
      let wTotalPasang = 0;
      let wSaldo = 0;

      for (const e of lokDiaMap.values()) {
        if (!orderedLokSet.has(e.lokasi)) continue;
        const matchesWil =
          e.wilayah.toUpperCase().includes(w) ||
          e.wilayah.toUpperCase().includes(w.replace('AW0', 'Wilayah '));
        if (matchesWil) {
          wOrder += e.orderAll;
          wDrop += e.dropAll;
          const pasang = Math.max(e.manualAll, e.sapAll);
          wTotalPasang += pasang;
          wSaldo += Math.max(0, e.dropAll - pasang);
        }
      }

      const wPctKedatangan = wOrder > 0 ? (wDrop / wOrder) * 100 : (wDrop > 0 ? 100 : 0);
      const wPctPasang = wDrop > 0 ? (wTotalPasang / wDrop) * 100 : (wTotalPasang > 0 ? 100 : 0);

      return {
        wilayah: w,
        order: wOrder,
        drop: wDrop,
        pasang: wTotalPasang,
        totalPasang: wTotalPasang,
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

      for (const e of lokDiaMap.values()) {
        if (!orderedLokSet.has(e.lokasi)) continue;
        if (e.dia === dia) {
          dOrder += e.orderAll;
          dDrop += e.dropAll;
          dPasangMan += e.manualAll;
          dPasangSap += e.sapAll;
          const pasang = Math.max(e.manualAll, e.sapAll);
          dTotalPasang += pasang;
          dSaldo += Math.max(0, e.dropAll - pasang);
        }
      }

      return {
        diameter: `Ø${dia}CM`,
        diameterInt: dia,
        order: dOrder,
        drop: dDrop,
        pasangManual: dPasangMan,
        pasangSap: dPasangSap,
        totalPasang: dTotalPasang,
        saldo: dSaldo,
        pctKedatangan: dOrder > 0 ? parseFloat(((dDrop / dOrder) * 100).toFixed(1)) : 0,
        pctPasang: dDrop > 0 ? parseFloat(((dTotalPasang / dDrop) * 100).toFixed(1)) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          orderYearly: order2026,
          terpasangYearly: terpasang2026,
          saldoCurrent: saldoOpen,
          pctKedatangan: parseFloat(pctKedatanganOpen.toFixed(1)),
          pctPemasangan: parseFloat(pctPemasanganOpen.toFixed(1)),
          totalOrderAll,
          totalDropAll,
          totalTerpasangAll,
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
