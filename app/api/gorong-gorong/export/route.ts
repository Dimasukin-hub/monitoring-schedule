import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { loadSnapshotFromFile, isExcludedGorongGorongLocation, isLocationWithoutWilayah } from '@/lib/lokasiOrderSnapshot';

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

  if (/^\d{2}\./.test(s)) {
    return { stepOrder: parseInt(s.slice(0, 2), 10), formatted: s.replace(/_/g, ' ') };
  }

  return { stepOrder: 0, formatted: s };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'order';
    const filterWilayah = searchParams.get('wilayah');
    const filterStatus = searchParams.get('status');
    const filterTahun = searchParams.get('tahun');
    const filterPrioritas = searchParams.get('prioritas');
    const searchQuery = searchParams.get('search')?.trim().toUpperCase();

    // 1. Ambil data master pendukung dan database tabel lokasi order & belum order
    const [statusLokasiList, waterloggingList, allLands, allTrx, allSap, dbLokasiOrder, dbLokasiBelumOrder] = await Promise.all([
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
      prisma.lokasiOrderGorongGorong.findMany({}),
      prisma.lokasiBelumOrderGorongGorong.findMany({}),
    ]);

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

    const lokasiOrderMap = new Map<string, { orders: any[]; drops: any[]; manuals: any[] }>();
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring Schedule Gorong-Gorong';
    workbook.created = new Date();

    const lightBlueFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' }, // Soft Light Blue
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
      right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
    };

    const cellBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    if (tab === 'order') {
      // PROSES TABEL LIST LOKASI ORDER (Prioritas dari Database LokasiOrderGorongGorong)
      const snapshotMap: Record<string, any> = {};
      if (dbLokasiOrder && dbLokasiOrder.length > 0) {
        for (const row of dbLokasiOrder) {
          snapshotMap[row.lokasi] = row;
        }
      } else {
        const fileSnap = loadSnapshotFromFile();
        for (const [k, v] of Object.entries(fileSnap)) {
          snapshotMap[k] = v;
        }
      }
      const listLokasiOrder: any[] = [];
      const orderedLokasiSet = new Set<string>();

      // Gabungkan seluruh lokasi kandidat dari Snapshot Excel (261 petak resmi) dan transaksi Order/Drop/Pasang Manual
      const allCandidateLocations = new Set<string>([
        ...Object.keys(snapshotMap),
        ...lokasiOrderMap.keys(),
      ]);

      for (const lok of allCandidateLocations) {
        if (isExcludedGorongGorongLocation(lok)) continue;
        const snap = snapshotMap[lok];
        const trxData = lokasiOrderMap.get(lok) || { orders: [], drops: [], manuals: [] };
        const sapRecords = lokasiSapMap.get(lok.toUpperCase()) || [];

        // Masuk ke List Lokasi Order jika ada di Snapshot Excel (261 lokasi resmi) ATAU memiliki transaksi pesanan Order/Drop/Pasang Manual
        const hasOrder = trxData.orders.length > 0;
        const hasDrop = trxData.drops.length > 0;
        const hasManual = trxData.manuals.length > 0;
        const hasSnap = !!snap;

        if (!hasSnap && !hasOrder && !hasDrop && !hasManual) continue;
        orderedLokasiSet.add(lok);

        const m = masterLokMap.get(lok);
        const dsm = dsmMap.get(lok);
        const rawAktBk = landAktMap.get(lok) || (m ? m.statusLengkap : null) || snap?.aktBk || '-';
        const aktBk = parseLandActivity(rawAktBk).formatted;
        let wilayah = m?.strucPlant || snap?.wilayah || trxData.orders[0]?.wilayah || trxData.drops[0]?.wilayah || trxData.manuals[0]?.wilayah || '-';
        if (isLocationWithoutWilayah(lok)) {
          wilayah = '-';
        } else if (wilayah === 'Timur' || wilayah === '-' || !wilayah.startsWith('AW')) {
          if (m?.strucPlant && m.strucPlant.startsWith('AW')) {
            wilayah = m.strucPlant;
          } else if (snap?.wilayah && snap.wilayah.startsWith('AW')) {
            wilayah = snap.wilayah;
          }
        }
        const luas = m?.luasNetto || m?.luasAktif || m?.luasBruto || snap?.luas || 0;
        const statusTanaman = m?.status || snap?.statusTanaman || '-';
        const umurBulan = m?.umurBulan ?? (m?.umurRawat ?? (snap?.umurBulan || 0));

        let minOrderDate: Date | null = null;
        for (const ord of trxData.orders) {
          const d = new Date(ord.tanggal);
          if (!minOrderDate || d < minOrderDate) minOrderDate = d;
        }
        if (!minOrderDate && snap?.tanggalOrder) {
          const d = new Date(snap.tanggalOrder);
          if (!isNaN(d.getTime())) minOrderDate = d;
        }
        const tanggalOrderStr = minOrderDate ? minOrderDate.toISOString().slice(0, 10) : (snap?.tanggalOrder || '-');

        // Ekstraksi tahun untuk filter tahun
        let rowYear = minOrderDate ? minOrderDate.getFullYear().toString() : '';
        if (!rowYear) {
          if (trxData.drops.length > 0 && trxData.drops[0].tanggal) {
            rowYear = new Date(trxData.drops[0].tanggal).getFullYear().toString();
          } else if (trxData.manuals.length > 0 && trxData.manuals[0].tanggal) {
            rowYear = new Date(trxData.manuals[0].tanggal).getFullYear().toString();
          } else if (sapRecords.length > 0 && sapRecords[0].tanggalRealisasi) {
            rowYear = new Date(sapRecords[0].tanggalRealisasi).getFullYear().toString();
          } else if (snap?.tanggalOrder) {
            rowYear = snap.tanggalOrder.slice(0, 4);
          } else {
            rowYear = '2026';
          }
        }

        const diameters = [40, 60, 80, 100];
        const diameterDetails: Record<string, any> = {};
        let totalOrderSemua = 0;
        let totalDropSemua = 0;
        let allClosed = true;

        const isClosedInSnapshot = snap?.isClosedExcel === true || snap?.statusAll === 'Close';

        for (const dia of diameters) {
          const key = `d${dia}`;

          const snapOrdRaw = dia === 40 ? snap?.orderD40 : dia === 60 ? snap?.orderD60 : dia === 80 ? snap?.orderD80 : snap?.orderD100;
          const snapDrpRaw = dia === 40 ? snap?.dropD40 : dia === 60 ? snap?.dropD60 : dia === 80 ? snap?.dropD80 : snap?.dropD100;
          const snapManRaw = dia === 40 ? snap?.pasangManD40 : dia === 60 ? snap?.pasangManD60 : dia === 80 ? snap?.pasangManD80 : snap?.pasangManD100;
          const snapSapRaw = dia === 40 ? snap?.pasangSapD40 : dia === 60 ? snap?.pasangSapD60 : dia === 80 ? snap?.pasangSapD80 : snap?.pasangSapD100;

          const hasSnapOrd = snapOrdRaw !== null && snapOrdRaw !== undefined;
          const hasSnapDrp = snapDrpRaw !== null && snapDrpRaw !== undefined;
          const hasSnapMan = snapManRaw !== null && snapManRaw !== undefined;
          const hasSnapSap = snapSapRaw !== null && snapSapRaw !== undefined;

          let trxOrdQty = 0;
          for (const o of trxData.orders) {
            trxOrdQty += (dia === 40 ? o.qtyD40 : dia === 60 ? o.qtyD60 : dia === 80 ? o.qtyD80 : o.qtyD100);
          }

          let trxDrpQty = 0;
          let lastDropDate: Date | null = null;
          for (const dr of trxData.drops) {
            const q = (dia === 40 ? dr.qtyD40 : dia === 60 ? dr.qtyD60 : dia === 80 ? dr.qtyD80 : dr.qtyD100);
            trxDrpQty += q;
            if (q > 0) {
              const d = new Date(dr.tanggal);
              if (!lastDropDate || d > lastDropDate) lastDropDate = d;
            }
          }

          let trxManQty = 0;
          for (const pm of trxData.manuals) {
            trxManQty += (dia === 40 ? pm.qtyD40 : dia === 60 ? pm.qtyD60 : dia === 80 ? pm.qtyD80 : pm.qtyD100);
          }

          let sapDbQty = 0;
          for (const s of sapRecords) {
            if (s.diameter === dia) sapDbQty += s.qty;
          }

          const hasTrxActivity = trxOrdQty > 0 || trxDrpQty > 0 || trxManQty > 0 || sapDbQty > 0;
          const isDiameterActive = hasSnapOrd || hasSnapDrp || hasSnapMan || hasSnapSap || hasTrxActivity;

          if (!isDiameterActive) {
            diameterDetails[key] = {
              order: null,
              drop: null,
              tglTerakhirDrop: '-',
              sisaKebutuhan: null,
              pctKedatangan: '-',
              pasangManual: null,
              pasangSap: null,
              totalPasang: null,
              saldo: null,
              pctPasang: '-',
              status: '-',
            };
            continue;
          }

          const ordQty = (hasSnapOrd ? snapOrdRaw! : 0) + trxOrdQty;
          const dropQty = (hasSnapDrp ? snapDrpRaw! : 0) + trxDrpQty;
          const manQty = (hasSnapMan ? snapManRaw! : 0) + trxManQty;
          const sapQty = sapDbQty > 0 ? sapDbQty : (hasSnapSap ? snapSapRaw! : 0);

          const totalPasangDia = Math.max(manQty, sapQty);
          const sisaKebutuhanDia = ordQty - dropQty;
          const saldoDia = dropQty - totalPasangDia;

          let pctKedatanganDia: number | string = '-';
          if (totalPasangDia > 0) {
            pctKedatanganDia = ordQty > 0 ? Math.round((totalPasangDia / ordQty) * 100) : '-';
          } else if (ordQty > 0 && dropQty === 0) {
            pctKedatanganDia = 'Belum';
          } else if (ordQty > 0 && dropQty > 0) {
            pctKedatanganDia = Math.round((dropQty / ordQty) * 100);
          } else {
            pctKedatanganDia = '-';
          }

          let pctPasangDia: number | string = '-';
          if (dropQty === 0 && manQty > 0) {
            pctPasangDia = 'Check';
          } else if (dropQty > 0) {
            pctPasangDia = Math.round((totalPasangDia / dropQty) * 100);
          } else {
            pctPasangDia = '-';
          }

          const snapDiaStatus = dia === 40 ? snap?.statusD40 : dia === 60 ? snap?.statusD60 : dia === 80 ? snap?.statusD80 : snap?.statusD100;

          let statusDia = 'Close';
          if (ordQty > 0 || dropQty > 0 || totalPasangDia > 0) {
            if (dropQty >= ordQty && saldoDia <= 0 && totalPasangDia > 0) {
              statusDia = 'Close';
            } else {
              statusDia = 'Open';
              allClosed = false;
            }
          } else if (isClosedInSnapshot || snapDiaStatus === 'Close') {
            statusDia = 'Close';
          } else {
            statusDia = '-';
          }

          totalOrderSemua += ordQty;
          totalDropSemua += dropQty;

          const tglDrop = lastDropDate ? lastDropDate.toISOString().slice(0, 10) : (dia === 40 ? (snap?.tglDropD40 || '-') : '-');

          diameterDetails[key] = {
            order: hasSnapOrd || trxOrdQty > 0 ? ordQty : null,
            drop: hasSnapDrp || trxDrpQty > 0 ? dropQty : null,
            tglTerakhirDrop: tglDrop,
            sisaKebutuhan: (hasSnapOrd || hasSnapDrp || trxOrdQty > 0 || trxDrpQty > 0) ? sisaKebutuhanDia : null,
            pctKedatangan: pctKedatanganDia,
            pasangManual: hasSnapMan || trxManQty > 0 ? manQty : null,
            pasangSap: sapDbQty > 0 || hasSnapSap ? sapQty : null,
            totalPasang: totalPasangDia,
            saldo: (hasSnapDrp || hasSnapMan || hasSnapSap || trxDrpQty > 0 || totalPasangDia > 0) ? saldoDia : null,
            pctPasang: pctPasangDia,
            status: statusDia,
          };
        }

        const d40Order = diameterDetails['d40']?.order;
        const ratioPerHa = (luas > 0 && d40Order !== null && d40Order !== undefined && d40Order > 0)
          ? Math.round(d40Order / luas)
          : (snap?.ratioPerHa !== null && snap?.ratioPerHa !== undefined && snap.ratioPerHa > 0 ? Math.round(snap.ratioPerHa) : null);

        let statusAll = isClosedInSnapshot ? 'Close' : '-';

        let prioritas = '';
        if (statusAll === 'Close') {
          prioritas = '';
        } else if (d40Order === null || d40Order === undefined || d40Order === 0) {
          prioritas = '-';
        } else if (snap && snap.prioritas !== undefined && snap.prioritas !== null && snap.prioritas !== '') {
          prioritas = snap.prioritas;
        } else {
          const isFC = statusTanaman === 'FC' || statusTanaman?.endsWith('FC');
          const isSchedule1 = aktBk.includes('24.Sls Tanam') || aktBk.toLowerCase().includes('selesai tanam') || aktBk.includes('23.Proses Tanam');
          const isSchedule2 = aktBk.includes('22.Jalan & Saluran') || aktBk.includes('22.JALAN & SAL') || aktBk.includes('Jln&Sal') || aktBk.includes('Exmini') || aktBk.includes('SS1') || aktBk.includes('Subsoiler') || aktBk.includes('Ridger');
          const d40Drop = diameterDetails['d40']?.drop || 0;
          const d40PctDtg = d40Order > 0 ? (d40Drop / d40Order) : 0;
          const d40TotalPsg = diameterDetails['d40']?.totalPasang || 0;
          const d40PctPsgOrDtg = d40Order > 0 ? (d40TotalPsg > 0 ? d40TotalPsg / d40Order : d40Drop / d40Order) : 0;

          if ((isFC || isSchedule1) && d40PctPsgOrDtg > 0.5) {
            prioritas = '4';
          } else if (isSchedule2 && d40Drop > 0) {
            prioritas = '3';
          } else if (isSchedule2 && d40Drop === 0) {
            prioritas = '2';
          } else if ((isFC || isSchedule1) && d40Drop === 0) {
            prioritas = '1';
          } else if ((isFC || statusTanaman?.endsWith('ST') || isSchedule1) && d40PctDtg < 0.5) {
            prioritas = '1';
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
          dsmBk: dsm?.dsmbkPlot || snap?.dsmBk || '-',
          dsmSt: dsm?.dsmPlot || snap?.dsmSt || '-',
          prioritas,
          statusAll,
          ratioPerHa,
          d40: diameterDetails['d40'],
          d60: diameterDetails['d60'],
          d80: diameterDetails['d80'],
          d100: diameterDetails['d100'],
        });
      }

      // Sort
      listLokasiOrder.sort((a, b) => {
        const prioOrder: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '-': 6, '': 7 };
        const pA = prioOrder[a.prioritas] ?? 99;
        const pB = prioOrder[b.prioritas] ?? 99;
        if (pA !== pB) return pA - pB;
        return a.lokasi.localeCompare(b.lokasi);
      });

      // Filter
      let filtered = listLokasiOrder;
      if (filterWilayah && filterWilayah !== 'ALL') {
        const wList = filterWilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        filtered = filtered.filter((i) => wList.some((w) => i.wilayah.toUpperCase().includes(w)));
      }
      if (filterStatus && filterStatus !== 'ALL') {
        const sList = filterStatus.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
        filtered = filtered.filter((i) => {
          const itemStatus = (i.statusAll || '').trim().toUpperCase();
          return sList.some((s) => {
            if (s === 'OPEN' || s === '-') {
              return itemStatus === '-' || itemStatus === 'OPEN' || itemStatus === '';
            }
            if (s === 'CLOSE') {
              return itemStatus === 'CLOSE';
            }
            return itemStatus === s;
          });
        });
      }
      // Note: Filter tahun tidak diterapkan pada List Lokasi Order agar mempertahankan seluruh 261 petak resmi
      // (termasuk petak Open 2025) persis sama dengan yang tampil di tabel dashboard.
      if (filterPrioritas && filterPrioritas !== 'ALL') {
        const pList = filterPrioritas.split(',').map((p) => p.trim()).filter(Boolean);
        filtered = filtered.filter((i) => pList.includes(String(i.prioritas || '').trim()));
      }
      if (searchQuery) {
        const qList = searchQuery.split(',').map((q) => q.trim().toUpperCase()).filter(Boolean);
        filtered = filtered.filter((i) => qList.some((q) => i.lokasi.toUpperCase().includes(q) || i.wilayah.toUpperCase().includes(q)));
      }

      const sheet = workbook.addWorksheet('List Lokasi Order', {
        views: [{ state: 'frozen', xSplit: 11, ySplit: 1 }],
      });

      // Definisi 50 Kolom (Sesuai Urutan dan Struktur Tabel Monitoring)
      const columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Lokasi', key: 'lokasi', width: 12 },
        { header: 'Wilayah', key: 'wilayah', width: 10 },
        { header: 'Luas (Ha)', key: 'luas', width: 11 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Umur Bln', key: 'umurBulan', width: 10 },
        { header: 'Tgl Order', key: 'tanggalOrder', width: 13 },
        { header: 'Akt. BK', key: 'aktBk', width: 20 },
        { header: 'DSM BK', key: 'dsmBk', width: 10 },
        { header: 'DSM ST', key: 'dsmSt', width: 10 },
        { header: 'Prioritas', key: 'prioritas', width: 10 },
        { header: 'Status All', key: 'statusAll', width: 11 },
        { header: 'Ratio/Ha', key: 'ratioPerHa', width: 10 },
        // Ø40
        { header: 'Ø40 Order', key: 'd40_order', width: 11 },
        { header: 'Ø40 Drop', key: 'd40_drop', width: 11 },
        { header: 'Ø40 Tgl Drop', key: 'd40_tglDrop', width: 13 },
        { header: 'Ø40 Sisa', key: 'd40_sisa', width: 10 },
        { header: 'Ø40 % Dtg', key: 'd40_pctDtg', width: 11 },
        { header: 'Ø40 P.Man', key: 'd40_pman', width: 11 },
        { header: 'Ø40 P.SAP', key: 'd40_psap', width: 11 },
        { header: 'Ø40 Saldo', key: 'd40_saldo', width: 11 },
        { header: 'Ø40 % Psg', key: 'd40_pctPsg', width: 11 },
        { header: 'Ø40 Status', key: 'd40_status', width: 11 },
        // Ø60
        { header: 'Ø60 Order', key: 'd60_order', width: 11 },
        { header: 'Ø60 Drop', key: 'd60_drop', width: 11 },
        { header: 'Ø60 Sisa', key: 'd60_sisa', width: 10 },
        { header: 'Ø60 % Dtg', key: 'd60_pctDtg', width: 11 },
        { header: 'Ø60 P.SAP', key: 'd60_psap', width: 11 },
        { header: 'Ø60 P.Man', key: 'd60_pman', width: 11 },
        { header: 'Ø60 Saldo', key: 'd60_saldo', width: 11 },
        { header: 'Ø60 % Psg', key: 'd60_pctPsg', width: 11 },
        { header: 'Ø60 Status', key: 'd60_status', width: 11 },
        // Ø80
        { header: 'Ø80 Order', key: 'd80_order', width: 11 },
        { header: 'Ø80 Drop', key: 'd80_drop', width: 11 },
        { header: 'Ø80 Sisa', key: 'd80_sisa', width: 10 },
        { header: 'Ø80 % Dtg', key: 'd80_pctDtg', width: 11 },
        { header: 'Ø80 P.SAP', key: 'd80_psap', width: 11 },
        { header: 'Ø80 P.Man', key: 'd80_pman', width: 11 },
        { header: 'Ø80 Saldo', key: 'd80_saldo', width: 11 },
        { header: 'Ø80 % Psg', key: 'd80_pctPsg', width: 11 },
        { header: 'Ø80 Status', key: 'd80_status', width: 11 },
        // Ø100
        { header: 'Ø100 Order', key: 'd100_order', width: 11 },
        { header: 'Ø100 Drop', key: 'd100_drop', width: 11 },
        { header: 'Ø100 Sisa', key: 'd100_sisa', width: 10 },
        { header: 'Ø100 % Dtg', key: 'd100_pctDtg', width: 11 },
        { header: 'Ø100 P.SAP', key: 'd100_psap', width: 11 },
        { header: 'Ø100 P.Man', key: 'd100_pman', width: 11 },
        { header: 'Ø100 Saldo', key: 'd100_saldo', width: 11 },
        { header: 'Ø100 % Psg', key: 'd100_pctPsg', width: 11 },
        { header: 'Ø100 Status', key: 'd100_status', width: 11 },
      ];

      sheet.columns = columns;

      // Styling Header Row
      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = lightBlueFill;
        cell.font = { bold: true, color: { argb: 'FF1F4E79' }, size: 10, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = headerBorder;
      });

      // Masukkan baris data
      const formatPercentStr = (val: any) => {
        if (val === 'Belum' || val === 'Check' || val === '-') return val;
        if (typeof val === 'number') return `${val}%`;
        if (typeof val === 'string' && val.trim() !== '') return val.includes('%') ? val : `${val}%`;
        return '-';
      };

      filtered.forEach((item, idx) => {
        const rowData = {
          no: idx + 1,
          lokasi: item.lokasi,
          wilayah: item.wilayah || '-',
          luas: item.luas ? parseFloat(item.luas.toFixed(2)) : 0,
          status: item.status || '-',
          umurBulan: item.umurBulan ?? 0,
          tanggalOrder: item.tanggalOrder || '-',
          aktBk: item.aktBk || '-',
          dsmBk: item.dsmBk || '-',
          dsmSt: item.dsmSt || '-',
          prioritas: item.prioritas || '-',
          statusAll: item.statusAll || '-',
          ratioPerHa: item.ratioPerHa,
          // Ø40
          d40_order: item.d40?.order ?? 0,
          d40_drop: item.d40?.drop ?? 0,
          d40_tglDrop: item.d40?.tglTerakhirDrop || '-',
          d40_sisa: item.d40?.sisaKebutuhan ?? 0,
          d40_pctDtg: formatPercentStr(item.d40?.pctKedatangan),
          d40_pman: item.d40?.pasangManual ?? 0,
          d40_psap: item.d40?.pasangSap ?? 0,
          d40_saldo: item.d40?.saldo ?? 0,
          d40_pctPsg: formatPercentStr(item.d40?.pctPasang),
          d40_status: item.d40?.status || '-',
          // Ø60
          d60_order: item.d60?.order ?? 0,
          d60_drop: item.d60?.drop ?? 0,
          d60_sisa: item.d60?.sisaKebutuhan ?? 0,
          d60_pctDtg: formatPercentStr(item.d60?.pctKedatangan),
          d60_psap: item.d60?.pasangSap ?? 0,
          d60_pman: item.d60?.pasangManual ?? 0,
          d60_saldo: item.d60?.saldo ?? 0,
          d60_pctPsg: formatPercentStr(item.d60?.pctPasang),
          d60_status: item.d60?.status || '-',
          // Ø80
          d80_order: item.d80?.order ?? 0,
          d80_drop: item.d80?.drop ?? 0,
          d80_sisa: item.d80?.sisaKebutuhan ?? 0,
          d80_pctDtg: formatPercentStr(item.d80?.pctKedatangan),
          d80_psap: item.d80?.pasangSap ?? 0,
          d80_pman: item.d80?.pasangManual ?? 0,
          d80_saldo: item.d80?.saldo ?? 0,
          d80_pctPsg: formatPercentStr(item.d80?.pctPasang),
          d80_status: item.d80?.status || '-',
          // Ø100
          d100_order: item.d100?.order ?? 0,
          d100_drop: item.d100?.drop ?? 0,
          d100_sisa: item.d100?.sisaKebutuhan ?? 0,
          d100_pctDtg: formatPercentStr(item.d100?.pctKedatangan),
          d100_psap: item.d100?.pasangSap ?? 0,
          d100_pman: item.d100?.pasangManual ?? 0,
          d100_saldo: item.d100?.saldo ?? 0,
          d100_pctPsg: formatPercentStr(item.d100?.pctPasang),
          d100_status: item.d100?.status || '-',
        };

        const row = sheet.addRow(rowData);
        row.height = 20;

        const isOdd = idx % 2 === 1;
        row.eachCell((cell) => {
          cell.font = { size: 9.5, name: 'Calibri' };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = cellBorder;
          if (isOdd) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
          }
        });
      });

      // Filter Otomatis Aktif
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };

      // Sesuaikan lebar kolom dengan isian sel agar pas dan tidak terlalu lebar
      sheet.columns.forEach((column) => {
        let maxLen = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        column.width = Math.min(Math.max(maxLen + 3, 9), 22);
      });
    } else {
      // PROSES TABEL LIST LOKASI BELUM ORDER (Prioritas dari Database LokasiBelumOrderGorongGorong)
      const listLokasiBelumOrder: any[] = [];
      if (dbLokasiBelumOrder && dbLokasiBelumOrder.length > 0) {
        for (const b of dbLokasiBelumOrder) {
          listLokasiBelumOrder.push({
            wilayah: b.wilayah || '-',
            lokasi: b.lokasi,
            luasNetto: b.luasNetto || 0,
            status: b.status || '-',
            aktBk: b.aktBk || '-',
            stepOrder: b.stepOrder || 0,
          });
        }
      } else {
        const orderedLokasiSet = new Set<string>();
        for (const [lok, trxData] of lokasiOrderMap.entries()) {
          if (trxData.orders.length > 0) orderedLokasiSet.add(lok);
        }

        for (const m of statusLokasiList) {
          const lok = m.lokasi.trim();
          if (isExcludedGorongGorongLocation(lok)) continue;
          if (orderedLokasiSet.has(lok)) continue;

          const statusTanaman = (m.status || '').trim().toUpperCase();
          const isBkOrSt = statusTanaman.endsWith('BK') || statusTanaman.endsWith('ST');
          if (!isBkOrSt) continue;

          const rawAkt = landAktMap.get(lok) || m.statusLengkap || '';
          const parsed = parseLandActivity(rawAkt);

          // Hanya lolos jika setelah dolomit (stepOrder >= 6)
          if (parsed.stepOrder < 6) continue;

          listLokasiBelumOrder.push({
            wilayah: m.strucPlant || '-',
            lokasi: lok,
            luasNetto: m.luasNetto || m.luasAktif || 0,
            status: m.status || '-',
            aktBk: parsed.formatted,
            stepOrder: parsed.stepOrder,
          });
        }
      }

      listLokasiBelumOrder.sort((a, b) => {
        if (a.wilayah !== b.wilayah) return a.wilayah.localeCompare(b.wilayah);
        return a.lokasi.localeCompare(b.lokasi);
      });

      let filtered = listLokasiBelumOrder;
      if (filterWilayah && filterWilayah !== 'ALL') {
        const wList = filterWilayah.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean);
        filtered = filtered.filter((i) => wList.some((w) => i.wilayah.toUpperCase().includes(w)));
      }
      if (searchQuery) {
        const qList = searchQuery.split(',').map((q) => q.trim().toUpperCase()).filter(Boolean);
        filtered = filtered.filter((i) => qList.some((q) => i.lokasi.toUpperCase().includes(q) || i.wilayah.toUpperCase().includes(q)));
      }

      const sheet = workbook.addWorksheet('List Lokasi Belum Order', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
      });

      const columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Wilayah', key: 'wilayah', width: 12 },
        { header: 'Lokasi', key: 'lokasi', width: 14 },
        { header: 'Luas Netto (Ha)', key: 'luasNetto', width: 16 },
        { header: 'Status Tanaman', key: 'status', width: 16 },
        { header: 'Aktivitas Terakhir (Akt. BK)', key: 'aktBk', width: 30 },
      ];

      sheet.columns = columns;

      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.fill = lightBlueFill;
        cell.font = { bold: true, color: { argb: 'FF1F4E79' }, size: 10, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = headerBorder;
      });

      filtered.forEach((item, idx) => {
        const rowData = {
          no: idx + 1,
          wilayah: item.wilayah,
          lokasi: item.lokasi,
          luasNetto: item.luasNetto ? parseFloat(item.luasNetto.toFixed(2)) : 0,
          status: item.status,
          aktBk: item.aktBk,
        };
        const row = sheet.addRow(rowData);
        row.height = 20;

        const isOdd = idx % 2 === 1;
        row.eachCell((cell) => {
          cell.font = { size: 9.5, name: 'Calibri' };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = cellBorder;
          if (isOdd) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' },
            };
          }
        });
      });

      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };

      // Sesuaikan lebar kolom dengan isian sel agar pas dan tidak terlalu lebar
      sheet.columns.forEach((column) => {
        let maxLen = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const val = cell.value ? String(cell.value) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        column.width = Math.min(Math.max(maxLen + 3, 9), 24);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = tab === 'order'
      ? `Monitoring_Gorong_Gorong_List_Order_${dateStr}.xlsx`
      : `Monitoring_Gorong_Gorong_Belum_Order_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel export:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengekspor file Excel', error: error.message },
      { status: 500 }
    );
  }
}
