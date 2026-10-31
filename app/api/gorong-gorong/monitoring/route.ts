import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper Pemetaan Tahapan Pekerjaan Tanah PG1 dengan Nomor Urut Resmi (Tahap 1 s/d 20)
function parseLandActivity(raw: any) {
  if (!raw || raw === '-' || raw === '0') return { stepOrder: 0, formatted: '-' };
  const s = String(raw).trim();
  const lower = s.toLowerCase();

  if (lower.includes('sls') || lower.includes('selesai tanam') || lower.includes('selesai tnm')) {
    return { stepOrder: 20, formatted: '24. Selesai Tanam' };
  }
  if (lower.includes('proses tnm') || lower.includes('proses tanam') || lower.includes('mulai tnm') || lower.includes('mulai tanam')) {
    return { stepOrder: 19, formatted: '23. Proses Tanam' };
  }
  if (lower.includes('siap tanam') || lower.includes('siap tnm')) {
    return { stepOrder: 18, formatted: '22. Siap Tanam' };
  }
  if (lower.includes('jalan') || lower.includes('saluran') || lower.includes('jln') || lower.includes('exmini')) {
    return { stepOrder: 17, formatted: '22. Jalan & Saluran' };
  }
  if (lower.includes('ridger')) {
    return { stepOrder: 16, formatted: '21. Ridger' };
  }
  if (lower.includes('fh2') || lower.includes('rotary 2') || lower.includes('rotary fh2')) {
    return { stepOrder: 15, formatted: '20. Rotary FH2' };
  }
  if (lower.includes('fh1') || lower.includes('finishing rotary') || lower.includes('rotary fh1')) {
    return { stepOrder: 14, formatted: '19. Finishing Rotary' };
  }
  if (lower.includes('harrow') || lower.includes('finishing harrow')) {
    return { stepOrder: 13, formatted: '18. Finishing Harrow' };
  }
  if (lower.includes('subsoiler') || lower.includes('ss1') || lower.includes('ss2')) {
    return { stepOrder: 12, formatted: '17. Subsoiler' };
  }
  if (lower.includes('bajak') || lower.includes('mb') || lower.includes('nardi') || lower.includes('howard')) {
    return { stepOrder: 11, formatted: '11. Bajak Awal' };
  }
  if (lower.includes('kompos')) {
    return { stepOrder: 10, formatted: '10. Kompos' };
  }
  if (lower.includes('belerang')) {
    return { stepOrder: 9, formatted: '09. Belerang' };
  }
  if (lower.includes('dp2')) {
    return { stepOrder: 8, formatted: '08. DP2' };
  }
  if (lower.includes('cross') || lower.includes('dp cross')) {
    return { stepOrder: 7, formatted: '07. DP Cross' };
  }
  if (lower.includes('dp1') || lower.includes('dp')) {
    return { stepOrder: 6, formatted: '06. DP1' };
  }
  if (lower.includes('dolomit')) {
    return { stepOrder: 5, formatted: '05. Aplikasi Dolomit' };
  }
  if (lower.includes('banana') || lower.includes('cutting banana')) {
    return { stepOrder: 4, formatted: '04. Cutting Banana' };
  }
  if (lower.includes('rh1')) {
    return { stepOrder: 3, formatted: '03. RH1' };
  }
  if (lower.includes('chopper lu') || lower.includes('lu')) {
    return { stepOrder: 2, formatted: '02. Chopper Lu' };
  }
  if (lower.includes('chopper')) {
    return { stepOrder: 1, formatted: '01. Chopper' };
  }

  // Jika sudah berformat nomor seperti "24. Selesai Tanam" atau kode "24.SLS_TANAM"
  if (/^\d{2}\./.test(s)) {
    return { stepOrder: parseInt(s.slice(0, 2), 10), formatted: s.replace(/_/g, ' ') };
  }

  return { stepOrder: 0, formatted: s };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filterWilayah = searchParams.get('wilayah');
    const filterStatus = searchParams.get('status');
    const filterTahun = searchParams.get('tahun');
    const searchQuery = searchParams.get('search')?.trim().toUpperCase();

    // 1. Ambil seluruh data master pendukung
    const [statusLokasiList, waterloggingList, allLands, allTrx, allSap] = await Promise.all([
      prisma.masterStatusLokasi.findMany({}),
      prisma.masterWaterlogging.findMany({}),
      prisma.land.findMany({
        orderBy: { year: 'asc' },
        select: { lokasi: true, aplikasiTerakhir: true },
      }),
      prisma.transaksiGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterSapGorongGorong.findMany({
        orderBy: { tanggalRealisasi: 'asc' },
      }),
    ]);

    // Buat lookup maps untuk performa instan
    const masterLokMap = new Map<string, any>();
    for (const m of statusLokasiList) {
      masterLokMap.set(m.lokasi.trim(), m);
    }

    const dsmMap = new Map<string, any>();
    for (const w of waterloggingList) {
      dsmMap.set(w.lokasi.trim(), w);
    }

    const landAktMap = new Map<string, string>();
    for (const l of allLands) {
      if (l.aplikasiTerakhir) {
        landAktMap.set(l.lokasi.trim(), l.aplikasiTerakhir);
      }
    }

    // 2. Kumpulkan transaksi per lokasi
    const lokasiOrderMap = new Map<string, {
      orders: any[];
      drops: any[];
      manuals: any[];
    }>();

    for (const trx of allTrx) {
      const lok = trx.lokasi.trim();
      if (!lokasiOrderMap.has(lok)) {
        lokasiOrderMap.set(lok, { orders: [], drops: [], manuals: [] });
      }
      const entry = lokasiOrderMap.get(lok)!;
      if (trx.jenisTransaksi === 'ORDER') entry.orders.push(trx);
      else if (trx.jenisTransaksi === 'DROP') entry.drops.push(trx);
      else if (trx.jenisTransaksi === 'PASANG_MANUAL') entry.manuals.push(trx);
    }

    // Kumpulkan SAP per lokasi (Murni dari Master SAP Gorong-Gorong kolom qty)
    const lokasiSapMap = new Map<string, any[]>();
    for (const s of allSap) {
      const lok = s.lokasi.trim().toUpperCase();
      if (!lokasiSapMap.has(lok)) lokasiSapMap.set(lok, []);
      lokasiSapMap.get(lok)!.push(s);
      if (s.referensiLokasi) {
        const refLok = s.referensiLokasi.trim().toUpperCase();
        if (refLok !== lok) {
          if (!lokasiSapMap.has(refLok)) lokasiSapMap.set(refLok, []);
          lokasiSapMap.get(refLok)!.push(s);
        }
      }
    }

    // 3. Susun Tabel List Lokasi Order
    const listLokasiOrder: any[] = [];
    const orderedLokasiSet = new Set<string>();

    // Gabungkan seluruh lokasi kandidat dari transaksi (Order/Drop/Pasang Manual) maupun SAP
    const allCandidateLocations = new Set<string>([
      ...lokasiOrderMap.keys(),
      ...lokasiSapMap.keys(),
    ]);

    for (const lok of allCandidateLocations) {
      const trxData = lokasiOrderMap.get(lok) || { orders: [], drops: [], manuals: [] };
      const sapRecords = lokasiSapMap.get(lok.toUpperCase()) || [];

      // Masuk ke List Lokasi Order jika memiliki pesanan Order ATAU Drop ATAU Pasang Manual ATAU Pasang SAP
      const hasOrder = trxData.orders.length > 0;
      const hasDrop = trxData.drops.length > 0;
      const hasManual = trxData.manuals.length > 0;
      const hasSap = sapRecords.length > 0;

      if (!hasOrder && !hasDrop && !hasManual && !hasSap) continue;
      orderedLokasiSet.add(lok);

      const m = masterLokMap.get(lok);
      const dsm = dsmMap.get(lok);
      const rawAktBk = landAktMap.get(lok) || (m ? m.statusLengkap : '-') || '-';
      const aktBk = parseLandActivity(rawAktBk).formatted;

      const wilayah = m?.wil || trxData.orders[0]?.wilayah || trxData.drops[0]?.wilayah || trxData.manuals[0]?.wilayah || '-';
      const luas = m?.luasNetto || m?.luasAktif || m?.luasBruto || 0;
      const statusTanaman = m?.status || '-';
      const umurBulan = m?.umurBulan ?? (m?.umurRawat ?? 0);

      // Cari tanggal order paling awal
      let minOrderDate: Date | null = null;
      for (const ord of trxData.orders) {
        const d = new Date(ord.tanggal);
        if (!minOrderDate || d < minOrderDate) minOrderDate = d;
      }
      const tanggalOrderStr = minOrderDate ? minOrderDate.toISOString().slice(0, 10) : '-';

      // Ekstraksi tahun untuk filter tahun
      let rowYear = minOrderDate ? minOrderDate.getFullYear().toString() : '';
      if (!rowYear) {
        if (trxData.drops.length > 0 && trxData.drops[0].tanggal) {
          rowYear = new Date(trxData.drops[0].tanggal).getFullYear().toString();
        } else if (trxData.manuals.length > 0 && trxData.manuals[0].tanggal) {
          rowYear = new Date(trxData.manuals[0].tanggal).getFullYear().toString();
        } else if (sapRecords.length > 0 && sapRecords[0].tanggalRealisasi) {
          rowYear = new Date(sapRecords[0].tanggalRealisasi).getFullYear().toString();
        } else {
          rowYear = '2026';
        }
      }

      // Hitung metrik untuk 4 diameter
      const diameters = [40, 60, 80, 100];
      const diameterDetails: Record<string, any> = {};

      let totalOrderSemua = 0;
      let totalDropSemua = 0;
      let allClosed = true;

      for (const dia of diameters) {
        const key = `d${dia}`;
        let ordQty = 0;
        let dropQty = 0;
        let manQty = 0;
        let sapQty = 0;
        let lastDropDate: Date | null = null;

        for (const o of trxData.orders) {
          ordQty += (dia === 40 ? o.qtyD40 : dia === 60 ? o.qtyD60 : dia === 80 ? o.qtyD80 : o.qtyD100);
        }
        for (const dr of trxData.drops) {
          const q = (dia === 40 ? dr.qtyD40 : dia === 60 ? dr.qtyD60 : dia === 80 ? dr.qtyD80 : dr.qtyD100);
          dropQty += q;
          if (q > 0) {
            const d = new Date(dr.tanggal);
            if (!lastDropDate || d > lastDropDate) lastDropDate = d;
          }
        }
        for (const pm of trxData.manuals) {
          manQty += (dia === 40 ? pm.qtyD40 : dia === 60 ? pm.qtyD60 : dia === 80 ? pm.qtyD80 : pm.qtyD100);
        }
        for (const s of sapRecords) {
          if (s.diameter === dia) sapQty += s.qty;
        }

        // Standar Excel: Terpasang = MAX(Pasang Manual, Pasang SAP)
        // Saldo = Drop - MAX(Pasang Manual, Pasang SAP)
        const totalPasangDia = Math.max(manQty, sapQty);
        const sisaKebutuhanDia = Math.max(0, ordQty - dropQty);
        const pctKedatanganDia = ordQty > 0 ? (dropQty / ordQty) * 100 : (dropQty > 0 ? 100 : 0);
        const saldoDia = ordQty === 0 && dropQty === 0 ? 0 : Math.max(0, dropQty - totalPasangDia);
        const pctPasangDia = dropQty > 0 ? (totalPasangDia / dropQty) * 100 : (totalPasangDia > 0 ? 100 : 0);

        let statusDia = '-';
        if (ordQty > 0 || dropQty > 0 || totalPasangDia > 0) {
          if (dropQty >= ordQty && saldoDia === 0 && totalPasangDia > 0) {
            statusDia = 'Close';
          } else {
            statusDia = 'Open';
            allClosed = false;
          }
        }

        totalOrderSemua += ordQty;
        totalDropSemua += dropQty;

        diameterDetails[key] = {
          order: ordQty,
          drop: dropQty,
          tglTerakhirDrop: lastDropDate ? lastDropDate.toISOString().slice(0, 10) : '-',
          sisaKebutuhan: sisaKebutuhanDia,
          pctKedatangan: parseFloat(pctKedatanganDia.toFixed(1)),
          pasangManual: manQty,
          pasangSap: sapQty,
          totalPasang: totalPasangDia,
          saldo: saldoDia,
          pctPasang: parseFloat(pctPasangDia.toFixed(1)),
          status: statusDia,
        };
      }

      // Standar Excel: Ratio = Order Diameter 40 / Luas Netto
      const d40Order = diameterDetails['d40']?.order || 0;
      const ratioPerHa = luas > 0 ? Math.trunc(d40Order / luas) : 0;
      const statusAll = totalOrderSemua === 0 && totalDropSemua === 0 ? 'Close' : (allClosed ? 'Close' : 'Open');

      // Evaluasi Prioritas (Jika Status All Close -> Prioritas kosong "")
      let prioritas = '-';
      if (statusAll === 'Close') {
        prioritas = '';
      } else if (totalOrderSemua === 0) {
        prioritas = '-';
      } else {
        const isFC = statusTanaman === 'FC' || statusTanaman?.endsWith('FC') || aktBk.includes('24.Sls Tanam') || aktBk.includes('Selesai Tnm') || aktBk.toLowerCase().includes('selesai tanam');
        const isJalanSal = aktBk.includes('22.JALAN & SAL') || aktBk.includes('Jln&Sal') || aktBk.includes('Exmini') || aktBk.includes('SS1') || aktBk.includes('Subsoiler');

        if (isFC && totalDropSemua === 0) {
          prioritas = '1';
        } else if (isJalanSal && totalDropSemua === 0) {
          prioritas = '2';
        } else if (isJalanSal && totalDropSemua > 0) {
          prioritas = '3';
        } else if (isFC && totalDropSemua > 0) {
          prioritas = '4';
        } else {
          prioritas = '5';
        }
      }

      listLokasiOrder.push({
        lokasi: lok,
        wilayah,
        luas,
        status: statusTanaman,
        umurBulan,
        tanggalOrder: tanggalOrderStr,
        tahun: rowYear,
        aktBk,
        dsmBk: dsm?.dsmbkPlot || '-',
        dsmSt: dsm?.dsmPlot || '-',
        prioritas,
        statusAll,
        ratioPerHa,
        totalOrder: totalOrderSemua,
        totalDrop: totalDropSemua,
        // Detail per diameter
        d40: diameterDetails['d40'],
        d60: diameterDetails['d60'],
        d80: diameterDetails['d80'],
        d100: diameterDetails['d100'],
      });
    }

    // Sort listLokasiOrder default:
    // 1. Prioritas 1-5 (Ascending)
    // 2. Status (Ascending)
    // 3. Akt. BK (Descending)
    // 4. DSM BK & DSM ST (Descending)
    // 5. Tgl Order (Oldest ke Newest)
    listLokasiOrder.sort((a, b) => {
      const prioOrder: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '-': 6, '': 7 };
      const pA = prioOrder[a.prioritas] ?? 99;
      const pB = prioOrder[b.prioritas] ?? 99;
      if (pA !== pB) return pA - pB;

      // Status (Ascending)
      const stCmp = (a.status || '').localeCompare(b.status || '');
      if (stCmp !== 0) return stCmp;

      // Akt. BK (Descending)
      const aktCmp = (b.aktBk || '').localeCompare(a.aktBk || '');
      if (aktCmp !== 0) return aktCmp;

      // DSM BK (Descending)
      const dsmBkCmp = (b.dsmBk || '').localeCompare(a.dsmBk || '');
      if (dsmBkCmp !== 0) return dsmBkCmp;

      // DSM ST (Descending)
      const dsmStCmp = (b.dsmSt || '').localeCompare(a.dsmSt || '');
      if (dsmStCmp !== 0) return dsmStCmp;

      // Tgl Order (Oldest ke Newest / Ascending)
      const tglA = a.tanggalOrder === '-' ? '9999-99-99' : a.tanggalOrder;
      const tglB = b.tanggalOrder === '-' ? '9999-99-99' : b.tanggalOrder;
      const tglCmp = tglA.localeCompare(tglB);
      if (tglCmp !== 0) return tglCmp;

      return a.lokasi.localeCompare(b.lokasi);
    });

    // 4. Susun Tabel List Lokasi Belum Order (Wilayah, Lokasi, Akt. BK)
    // Sesuai Arahan User:
    // - Hanya petak belum order
    // - Status berakhiran BK atau ST (2 huruf dari kanan pada status)
    // - Aktivitas terakhir setelah dolomit sampai selesai tanam (stepOrder 6 s/d 20: DP1 hingga Selesai Tanam)
    // - Menampilkan nomor urut tahapan resmi
    const listLokasiBelumOrder: any[] = [];
    for (const m of statusLokasiList) {
      const lok = m.lokasi.trim();
      if (orderedLokasiSet.has(lok)) continue;

      const statusTanaman = (m.status || '').trim().toUpperCase();
      const isBkOrSt = statusTanaman.endsWith('BK') || statusTanaman.endsWith('ST');
      if (!isBkOrSt) continue;

      const rawAkt = landAktMap.get(lok) || m.statusLengkap || '';
      const parsed = parseLandActivity(rawAkt);

      // Hanya lolos jika setelah dolomit (stepOrder >= 6)
      if (parsed.stepOrder < 6) continue;

      listLokasiBelumOrder.push({
        wilayah: m.wil || '-',
        lokasi: lok,
        luasNetto: m.luasNetto || m.luasAktif || 0,
        status: m.status || '-',
        aktBk: parsed.formatted,
        stepOrder: parsed.stepOrder,
      });
    }

    listLokasiBelumOrder.sort((a, b) => {
      if (a.wilayah !== b.wilayah) return a.wilayah.localeCompare(b.wilayah);
      return a.lokasi.localeCompare(b.lokasi);
    });

    // Filter berdasarkan request query params
    let filteredOrder = listLokasiOrder;
    let filteredBelum = listLokasiBelumOrder;

    if (filterWilayah && filterWilayah !== 'ALL') {
      const wList = filterWilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
      filteredOrder = filteredOrder.filter((item) =>
        wList.some((w) => item.wilayah.toUpperCase().includes(w))
      );
      filteredBelum = filteredBelum.filter((item) =>
        wList.some((w) => item.wilayah.toUpperCase().includes(w))
      );
    }

    if (filterStatus && filterStatus !== 'ALL') {
      const sList = filterStatus.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      filteredOrder = filteredOrder.filter((item) =>
        sList.includes(item.statusAll.toUpperCase())
      );
    }

    if (filterTahun && filterTahun !== 'ALL') {
      const yList = filterTahun.split(',').map((y) => y.trim()).filter(Boolean);
      filteredOrder = filteredOrder.filter((item) =>
        yList.includes(String(item.tahun))
      );
    }

    if (searchQuery) {
      const qList = searchQuery.split(',').map((q) => q.trim().toUpperCase()).filter(Boolean);
      filteredOrder = filteredOrder.filter((item) =>
        qList.some((q) => item.lokasi.toUpperCase().includes(q) || item.wilayah.toUpperCase().includes(q))
      );
      filteredBelum = filteredBelum.filter((item) =>
        qList.some((q) => item.lokasi.toUpperCase().includes(q) || item.wilayah.toUpperCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalLokasiOrder: filteredOrder.length,
        totalLokasiBelumOrder: filteredBelum.length,
        listLokasiOrder: filteredOrder,
        listLokasiBelumOrder: filteredBelum,
      },
    });
  } catch (error: any) {
    console.error('Error fetching gorong-gorong monitoring data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat data monitoring gorong-gorong', error: error.message },
      { status: 500 }
    );
  }
}
