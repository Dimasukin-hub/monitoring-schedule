import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadSnapshotFromFile, saveSnapshotToFile, isExcludedGorongGorongLocation, isLocationWithoutWilayah, ensureMasterSapLoaded } from '@/lib/lokasiOrderSnapshot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper Pemformatan Resmi Tahapan Pekerjaan Tanah PG1 dengan Kode Resmi (contoh: 24. Selesai Tanam)
function formatLandActivity(a: { code?: string | null; name?: string | null; stepOrder?: number | null }) {
  if (!a || !a.name) return '-';
  const name = String(a.name).trim();
  if (/^\d{2}\./.test(name)) return name;
  let numPrefix = '';
  if (a.code && /^\d{2}\./.test(a.code.trim())) {
    numPrefix = a.code.trim().slice(0, 2);
  } else if (a.stepOrder) {
    numPrefix = String(a.stepOrder).padStart(2, '0');
  }
  return numPrefix ? `${numPrefix}. ${name}` : name;
}

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
    await ensureMasterSapLoaded();
    const { searchParams } = new URL(request.url);
    const filterWilayah = searchParams.get('wilayah');
    const filterStatus = searchParams.get('status');
    const filterTahun = searchParams.get('tahun');
    const filterPrioritas = searchParams.get('prioritas');
    const filterDiameter = searchParams.get('diameter');
    const searchQuery = searchParams.get('search')?.trim().toUpperCase();

    // 1. Ambil seluruh data master pendukung dan database tabel lokasi order & belum order
    const [statusLokasiList, waterloggingList, allLands, allTrx, allSap, dbLokasiOrder, dbLokasiBelumOrder, masterOrders, masterDrops, masterPindahs] = await Promise.all([
      prisma.masterStatusLokasi.findMany({}),
      prisma.masterWaterlogging.findMany({}),
      prisma.land.findMany({
        orderBy: { year: 'desc' },
        select: {
          lokasi: true,
          year: true,
          aplikasiTerakhir: true,
          realBkr: true,
          realBajak: true,
          realMulaiTanam: true,
          realSelesaiTanam: true,
          rencBkr: true,
          activities: {
            where: { realisasiDate: { not: null } },
            select: { code: true, name: true, stepOrder: true, realisasiDate: true },
          },
        },
      }),
      prisma.transaksiGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterSapGorongGorong.findMany({
        orderBy: { tanggalRealisasi: 'asc' },
      }),
      prisma.lokasiOrderGorongGorong.findMany({}),
      prisma.lokasiBelumOrderGorongGorong.findMany({}),
      prisma.masterDataOrderGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterDataDropGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
      prisma.masterDataPindahGorongGorong.findMany({
        orderBy: { tanggal: 'asc' },
      }),
    ]);

    // Buat lookup maps untuk performa instan
    const masterLokMap = new Map<string, any>();
    for (const m of statusLokasiList) {
      masterLokMap.set(m.lokasi.trim().toUpperCase(), m);
      masterLokMap.set(m.lokasi.trim(), m);
    }

    const dsmMap = new Map<string, any>();
    for (const w of waterloggingList) {
      dsmMap.set(w.lokasi.trim().toUpperCase(), w);
      dsmMap.set(w.lokasi.trim(), w);
    }

    // Master Orders Map
    const masterOrderMap = new Map<string, { minDate: Date | null; d40: number; d60: number; d80: number; d100: number }>();
    for (const o of masterOrders) {
      const k = o.lokasi.trim().toUpperCase();
      if (!masterOrderMap.has(k)) {
        masterOrderMap.set(k, { minDate: null, d40: 0, d60: 0, d80: 0, d100: 0 });
      }
      const ent = masterOrderMap.get(k)!;
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
    const masterDropMap = new Map<string, { d40: number; d60: number; d80: number; d100: number; tglDrop40: Date | null }>();
    for (const d of masterDrops) {
      const k = d.lokasi.trim().toUpperCase();
      if (!masterDropMap.has(k)) {
        masterDropMap.set(k, { d40: 0, d60: 0, d80: 0, d100: 0, tglDrop40: null });
      }
      const ent = masterDropMap.get(k)!;
      ent.d40 += d.diameter40 || 0;
      ent.d60 += d.diameter60 || 0;
      ent.d80 += d.diameter80 || 0;
      ent.d100 += d.diameter100 || 0;
      if (d.diameter40 > 0 && d.tanggal) {
        const dt = new Date(d.tanggal);
        if (!ent.tglDrop40 || dt > ent.tglDrop40) ent.tglDrop40 = dt;
      }
    }

    // Master Pindah Map (Murni dari MasterDataPindahGorongGorong)
    const masterPindahMap = new Map<string, { d40: number; d60: number; d80: number; d100: number }>();
    const getMasterPindahEnt = (lok: string) => {
      if (!masterPindahMap.has(lok)) {
        masterPindahMap.set(lok, { d40: 0, d60: 0, d80: 0, d100: 0 });
      }
      return masterPindahMap.get(lok)!;
    };
    for (const p of masterPindahs) {
      if (p.lokasiPengirim) {
        const ent = getMasterPindahEnt(p.lokasiPengirim.trim().toUpperCase());
        ent.d40 -= (p.diameter40 || 0);
        ent.d60 -= (p.diameter60 || 0);
        ent.d80 -= (p.diameter80 || 0);
        ent.d100 -= (p.diameter100 || 0);
      }
      if (p.lokasiPenerima) {
        const ent = getMasterPindahEnt(p.lokasiPenerima.trim().toUpperCase());
        ent.d40 += (p.diameter40 || 0);
        ent.d60 += (p.diameter60 || 0);
        ent.d80 += (p.diameter80 || 0);
        ent.d100 += (p.diameter100 || 0);
      }
    }

    // Helper parsing tanggal realisasi kegiatan tanah
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    function parseRealDate(s: string | null | undefined): Date | null {
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

    // Pemetaan Akt. BK MURNI dari tabel database Land saja (kolom aplikasiTerakhir, Newest <= Today)
    const landAktMap = new Map<string, { formatted: string; stepOrder: number; date: Date }>();
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
          parseRealDate(l.realSelesaiTanam),
          parseRealDate(l.realMulaiTanam),
          parseRealDate(l.realBajak),
          parseRealDate(l.realBkr),
          ...(l.activities || []).map((a: any) => parseRealDate(a.realisasiDate)),
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
        const parsed = parseLandActivity(chosenLand.aplikasiTerakhir);
        landAktMap.set(lok, {
          formatted: parsed.formatted !== '-' ? parsed.formatted : chosenLand.aplikasiTerakhir,
          stepOrder: parsed.stepOrder,
          date: chosenDate || new Date(),
        });
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

    // 3. Susun Tabel List Lokasi Order (Prioritas dari Database LokasiOrderGorongGorong)
    const snapshotMap: Record<string, any> = {};
    if (dbLokasiOrder && dbLokasiOrder.length > 0) {
      for (const row of dbLokasiOrder) {
        snapshotMap[row.lokasi] = row;
        snapshotMap[row.lokasi.trim().toUpperCase()] = row;
      }
    } else {
      const fallbackSnap = loadSnapshotFromFile();
      for (const [k, v] of Object.entries(fallbackSnap)) {
        snapshotMap[k] = v;
        snapshotMap[k.trim().toUpperCase()] = v;
      }
    }
    const listLokasiOrder: any[] = [];
    const orderedLokasiSet = new Set<string>();

    // Kandidat lokasi List Lokasi Order: murni mengikuti Master Data Order & Drop + form transactions
    const allCandidateLocations = new Set<string>();
    for (const o of masterOrders) {
      if (o.lokasi) allCandidateLocations.add(o.lokasi.trim());
    }
    for (const d of masterDrops) {
      if (d.lokasi) allCandidateLocations.add(d.lokasi.trim());
    }
    for (const p of masterPindahs) {
      if (p.lokasiPengirim) allCandidateLocations.add(p.lokasiPengirim.trim());
      if (p.lokasiPenerima) allCandidateLocations.add(p.lokasiPenerima.trim());
    }
    for (const trx of allTrx) {
      if (trx.lokasi) {
        allCandidateLocations.add(trx.lokasi.trim());
      }
      if (trx.lokasiAsal) {
        allCandidateLocations.add(trx.lokasiAsal.trim());
      }
    }

    for (const lok of allCandidateLocations) {
      if (isExcludedGorongGorongLocation(lok)) continue;
      const lokUpper = lok.toUpperCase();
      orderedLokasiSet.add(lokUpper);

      const snap = snapshotMap[lok] || snapshotMap[lokUpper];
      const trxData = lokasiOrderMap.get(lok) || lokasiOrderMap.get(lokUpper) || { orders: [], drops: [], manuals: [] };
      const sapRecords = lokasiSapMap.get(lokUpper) || [];
      const ordMaster = masterOrderMap.get(lokUpper) || { minDate: null, d40: 0, d60: 0, d80: 0, d100: 0 };
      const drpMaster = masterDropMap.get(lokUpper) || { d40: 0, d60: 0, d80: 0, d100: 0, tglDrop40: null };

      const m = masterLokMap.get(lok) || masterLokMap.get(lokUpper);
      const dsm = dsmMap.get(lok) || dsmMap.get(lokUpper);
      // Kolom Akt. BK MURNI diambil dari tabel database Land saja (aplikasiTerakhir, newest <= today). Jika tidak ada di Land, dikosongkan/strip ('-').
      const landAkt = landAktMap.get(lokUpper);
      const aktBk = landAkt ? landAkt.formatted : '-';

      // Wilayah, Luas, Status, Umur Bulan MURNI mengikuti master data status lokasi
      let wilayah = isLocationWithoutWilayah(lok)
        ? '-'
        : (m?.strucPlant || snap?.wilayah || '-');
      const luas = m?.luasNetto != null ? m.luasNetto : (snap?.luas || 0);
      const statusTanaman = m?.status || snap?.statusTanaman || '-';
      const umurBulan = m?.umurBulan ?? (m?.umurRawat ?? snap?.umurBulan ?? 0);

      // Cari tanggal order paling awal dari Master Data Order & Transaksi
      let minOrderDate: Date | null = ordMaster.minDate;
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
      let rowYear = minOrderDate ? minOrderDate.getFullYear().toString() : '2026';

      // Hitung metrik untuk 4 diameter
      const diameters = [40, 60, 80, 100];
      const diameterDetails: Record<string, any> = {};

      let totalOrderSemua = 0;
      let totalDropSemua = 0;

      for (const dia of diameters) {
        const key = `d${dia}`;

        // Orders: Master Data Order (karena Form Order langsung memperbarui Master Data)
        const masterOrdQty = dia === 40 ? ordMaster.d40 : dia === 60 ? ordMaster.d60 : dia === 80 ? ordMaster.d80 : ordMaster.d100;
        const ordQty = masterOrdQty;

        // Drops: Master Data Drop (karena Form Drop langsung memperbarui Master Data)
        let trxDrpQty = 0;
        let lastDropDate: Date | null = dia === 40 ? drpMaster.tglDrop40 : null;
        for (const dr of trxData.drops) {
          const q = (dia === 40 ? dr.qtyD40 : dia === 60 ? dr.qtyD60 : dia === 80 ? dr.qtyD80 : dr.qtyD100);
          trxDrpQty += q;
          if (q > 0) {
            const d = new Date(dr.tanggal);
            if (!lastDropDate || d > lastDropDate) lastDropDate = d;
          }
        }
        const masterDrpQty = dia === 40 ? drpMaster.d40 : dia === 60 ? drpMaster.d60 : dia === 80 ? drpMaster.d80 : drpMaster.d100;
        const dropQty = masterDrpQty;

        // Pindah lokasi: murni bersumber dari MasterDataPindahGorongGorong, fallback ke snapshot
        const pnd = masterPindahMap.get(lokUpper);
        let pindahQty = pnd ? (dia === 40 ? pnd.d40 : dia === 60 ? pnd.d60 : dia === 80 ? pnd.d80 : pnd.d100) : 0;
        if (masterPindahs.length === 0 && pindahQty === 0) {
          pindahQty = (snap as any)?.[`pindahD${dia}`] || 0;
        }

        // Pasang: Pasang Manual + Pasang SAP
        let trxManQty = 0;
        let lastPasangDate: Date | null = null;
        for (const pm of trxData.manuals) {
          const q = (dia === 40 ? pm.qtyD40 : dia === 60 ? pm.qtyD60 : dia === 80 ? pm.qtyD80 : pm.qtyD100);
          trxManQty += q;
          if (q > 0 && pm.tanggal) {
            const d = new Date(pm.tanggal);
            if (!lastPasangDate || d > lastPasangDate) lastPasangDate = d;
          }
        }

        let sapDbQty = 0;
        for (const s of sapRecords) {
          if (s.diameter === dia) {
            sapDbQty += s.qty;
            if (s.tanggalRealisasi) {
              const d = new Date(s.tanggalRealisasi);
              if (!lastPasangDate || d > lastPasangDate) lastPasangDate = d;
            }
          }
        }

        const manQty = trxManQty;
        const sapQty = sapDbQty;
        const totalPasangDia = Math.max(manQty, sapQty);
        const sisaKebutuhanDia = ordQty - dropQty;
        const saldoDia = dropQty - totalPasangDia;

        // Rumus % Kedatangan: Hanya ada jika drop > 0 dan order > 0, murni (drop / order) * 100
        let pctKedatanganDia: number | string = '-';
        if (dropQty > 0 && ordQty > 0) {
          pctKedatanganDia = Math.round((dropQty / ordQty) * 100);
        } else {
          pctKedatanganDia = '-';
        }

        // Rumus % Pasang
        let pctPasangDia: number | string = '-';
        if (dropQty === 0 && manQty > 0) {
          pctPasangDia = 'Check';
        } else if (dropQty > 0) {
          pctPasangDia = Math.round((totalPasangDia / dropQty) * 100);
        } else {
          pctPasangDia = '-';
        }

        // Rumus Status Diameter: utamakan status manual yang disimpan jika ada ('Close', 'Cek', 'Open')
        const snapDiaStatus = dia === 40 ? snap?.statusD40 : dia === 60 ? snap?.statusD60 : dia === 80 ? snap?.statusD80 : snap?.statusD100;
        let statusDia = '-';
        if (snapDiaStatus && (snapDiaStatus.trim() === 'Close' || snapDiaStatus.trim() === 'Cek')) {
          statusDia = snapDiaStatus.trim();
        } else if (ordQty > 0 || dropQty > 0 || totalPasangDia > 0) {
          if (dropQty >= ordQty && saldoDia <= 0 && totalPasangDia > 0) {
            statusDia = 'Close';
          } else {
            statusDia = 'Open';
          }
        }

        totalOrderSemua += ordQty;
        totalDropSemua += dropQty;

        const tglDrop = lastDropDate ? lastDropDate.toISOString().slice(0, 10) : (dia === 40 ? (snap?.tglDropD40 || '-') : '-');
        const tglPasang = lastPasangDate ? lastPasangDate.toISOString().slice(0, 10) : '-';

        diameterDetails[key] = {
          order: ordQty > 0 ? ordQty : (masterOrdQty > 0 ? masterOrdQty : (ordQty === 0 ? 0 : null)),
          drop: dropQty > 0 ? dropQty : (masterDrpQty > 0 ? masterDrpQty : (dropQty === 0 ? 0 : null)),
          tglTerakhirDrop: tglDrop,
          pindah: pindahQty !== 0 ? pindahQty : ((masterDrpQty > 0 || trxDrpQty > 0) ? 0 : null),
          tglTerakhirPasang: tglPasang,
          sisaKebutuhan: (ordQty > 0 || dropQty > 0) ? sisaKebutuhanDia : null,
          pctKedatangan: pctKedatanganDia,
          pasangManual: manQty > 0 ? manQty : null,
          pasangSap: sapQty > 0 ? sapQty : null,
          totalPasang: totalPasangDia,
          saldo: (dropQty > 0 || manQty > 0 || sapQty > 0) ? saldoDia : null,
          pctPasang: pctPasangDia,
          status: statusDia,
        };
      }

      // Rumus Status All mengikuti status per diameter
      // semisal yang status per diameternya close, maka yang status all nya juga ikut close, kalau status per diameter ada yang open, maka nantinya status allnya juga ikut open.
      const diaStatuses = [diameterDetails.d40.status, diameterDetails.d60.status, diameterDetails.d80.status, diameterDetails.d100.status];
      const hasAnyOpen = diaStatuses.some((st) => st === 'Open');
      const hasAnyClose = diaStatuses.some((st) => st === 'Close');
      const statusAll = hasAnyOpen ? 'Open' : (hasAnyClose ? 'Close' : '-');

      // Standar: Ratio = ROUND(Order Diameter 40 / Luas Netto)
      const d40Order = diameterDetails['d40']?.order;
      const ratioPerHa = (luas > 0 && d40Order !== null && d40Order !== undefined && d40Order > 0)
        ? Math.round(d40Order / luas)
        : null;

      // Evaluasi Prioritas & Transisi Otomatis
      let prioritas = snap?.prioritas || '';
      const totalDropNow = totalDropSemua;
      const totalOrderNow = totalOrderSemua;
      const d40DropNow = diameterDetails['d40']?.drop || 0;
      const hasDropAny = totalDropNow > 0 || d40DropNow > 0;
      const pctDropTotal = totalOrderNow > 0 ? (totalDropNow / totalOrderNow) * 100 : (totalDropNow > 0 ? 100 : 0);
      const isDropAbove50 = pctDropTotal > 50;

      const isFC = statusTanaman === 'FC' || statusTanaman?.endsWith('FC');
      const isSchedule1 = aktBk.includes('24.Sls Tanam') || aktBk.toLowerCase().includes('selesai tanam') || aktBk.includes('23.Proses Tanam');
      const isSchedule2 = aktBk.includes('22.Jalan & Saluran') || aktBk.includes('22.JALAN & SAL') || aktBk.includes('Jln&Sal') || aktBk.includes('Exmini') || aktBk.includes('SS1') || aktBk.includes('Subsoiler') || aktBk.includes('Ridger');

      if (prioritas === '1' || prioritas === '4' || ((isFC || isSchedule1) && statusAll !== 'Close')) {
        prioritas = isDropAbove50 ? '4' : '1';
      } else if (prioritas === '2' || prioritas === '3' || (isSchedule2 && statusAll !== 'Close')) {
        prioritas = hasDropAny ? '3' : '2';
      } else if (!prioritas || prioritas === '') {
        if (statusAll === 'Close') {
          prioritas = '';
        } else if (d40Order === null || d40Order === undefined || d40Order === 0) {
          prioritas = '-';
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
        dsmBk: snap?.dsmBk || dsm?.dsmbkPlot || '-',
        dsmSt: snap?.dsmSt || dsm?.dsmPlot || '-',
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

    // Helper ekstrak angka terdepan dari string Akt. BK (misal "24. Selesai Tanam" -> 24)
    const getAktBkNum = (str: string | null | undefined): number => {
      if (!str) return -1;
      const m = String(str).match(/^(\d+)/);
      return m ? parseInt(m[1], 10) : -1;
    };

    // Locked Multi-tier Sort pada List Lokasi Order:
    // 1. Prioritas urutan dari 1 (1, 2, 3, 4, 5, -, '')
    // 2. Akt. BK dari urutan angka paling besar (descending)
    // 3. Umur Bulan urutan angka paling besar (descending)
    // 4. Status Tanaman urutan A-Z (ascending)
    // 5. DSM BK urutan Z-A (descending)
    // 6. DSM ST urutan Z-A (descending)
    // 7. Tie-breaker Lokasi (ascending)
    listLokasiOrder.sort((a, b) => {
      const prioOrder: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '-': 6, '': 7 };
      const pA = prioOrder[a.prioritas] ?? 99;
      const pB = prioOrder[b.prioritas] ?? 99;
      if (pA !== pB) return pA - pB;

      // 2. Akt. BK (urutan angka paling besar)
      const numAktA = getAktBkNum(a.aktBk);
      const numAktB = getAktBkNum(b.aktBk);
      if (numAktA !== numAktB) return numAktB - numAktA;

      // 3. Umur Bulan (urutan angka paling besar)
      const uA = Number(a.umurBulan ?? 0);
      const uB = Number(b.umurBulan ?? 0);
      if (uA !== uB) return uB - uA;

      // 4. Status Tanaman (A-Z)
      const stCmp = (a.status || '').localeCompare(b.status || '');
      if (stCmp !== 0) return stCmp;

      // 5. DSM BK (Z-A / Descending)
      const dsmBkCmp = (b.dsmBk || '').localeCompare(a.dsmBk || '');
      if (dsmBkCmp !== 0) return dsmBkCmp;

      // 6. DSM ST (Z-A / Descending)
      const dsmStCmp = (b.dsmSt || '').localeCompare(a.dsmSt || '');
      if (dsmStCmp !== 0) return dsmStCmp;

      // 7. Lokasi (Ascending)
      return a.lokasi.localeCompare(b.lokasi);
    });

    // Beri fixedRank permanen berdasarkan urutan master list lengkap yang sudah disortir
    listLokasiOrder.forEach((item, idx) => {
      item.fixedRank = idx + 1;
    });

    // 4. Susun Tabel List Lokasi Belum Order (Prioritas dari Database LokasiBelumOrderGorongGorong)
    const listLokasiBelumOrder: any[] = [];
    if (dbLokasiBelumOrder && dbLokasiBelumOrder.length > 0) {
      for (const b of dbLokasiBelumOrder) {
        const lokUpper = b.lokasi.trim().toUpperCase();
        if (orderedLokasiSet.has(lokUpper)) continue;
        const landAkt = landAktMap.get(lokUpper);
        listLokasiBelumOrder.push({
          wilayah: b.wilayah || '-',
          lokasi: b.lokasi,
          luasNetto: b.luasNetto || 0,
          status: b.status || '-',
          aktBk: landAkt ? landAkt.formatted : (b.aktBk || '-'),
          stepOrder: landAkt ? landAkt.stepOrder : (b.stepOrder || 0),
        });
      }
    } else {
      for (const m of statusLokasiList) {
        const lok = m.lokasi.trim();
        const lokUpper = lok.toUpperCase();
        if (isExcludedGorongGorongLocation(lok)) continue;
        if (orderedLokasiSet.has(lokUpper)) continue;

        const statusTanaman = (m.status || '').trim().toUpperCase();
        const isBkOrSt = statusTanaman.endsWith('BK') || statusTanaman.endsWith('ST');
        if (!isBkOrSt) continue;

        // Ambil Akt. BK murni dari Land saja (newest <= today)
        const landAkt = landAktMap.get(lokUpper);
        if (!landAkt) continue;

        // Hanya lolos jika setelah dolomit (stepOrder >= 6)
        if (landAkt.stepOrder < 6) continue;

        listLokasiBelumOrder.push({
          wilayah: m.strucPlant || '-',
          lokasi: lok,
          luasNetto: m.luasNetto || m.luasAktif || 0,
          status: m.status || '-',
          aktBk: landAkt.formatted,
          stepOrder: landAkt.stepOrder,
        });
      }
    }

    listLokasiBelumOrder.sort((a, b) => {
      if (a.wilayah !== b.wilayah) return a.wilayah.localeCompare(b.wilayah);
      return a.lokasi.localeCompare(b.lokasi);
    });

    listLokasiBelumOrder.forEach((item: any, idx: number) => {
      item.fixedRank = idx + 1;
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
      const diaKeys = (filterDiameter && filterDiameter !== 'ALL')
        ? [`d${filterDiameter}`]
        : ['d40', 'd60', 'd80', 'd100'];

      filteredOrder = filteredOrder.filter((item) => {
        return diaKeys.some((k) => {
          const diaStatus = (item[k]?.status || '-').trim().toUpperCase();
          const isOpen = diaStatus === '-' || diaStatus === 'OPEN';
          const isClose = diaStatus === 'CLOSE';
          return sList.some((s) => {
            if (s === 'OPEN' || s === '-') return isOpen;
            if (s === 'CLOSE') return isClose;
            return diaStatus === s;
          });
        });
      });
    }

    if (filterTahun && filterTahun !== 'ALL') {
      const yList = filterTahun.split(',').map((y) => y.trim()).filter(Boolean);
      filteredOrder = filteredOrder.filter((item) =>
        yList.includes(String(item.tahun))
      );
    }

    if (filterPrioritas && filterPrioritas !== 'ALL') {
      const pList = filterPrioritas.split(',').map((p) => p.trim()).filter(Boolean);
      filteredOrder = filteredOrder.filter((item) =>
        pList.includes(String(item.prioritas || ''))
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

export async function PATCH(request: NextRequest) {
  try {
    // Verifikasi Hak Akses: Hanya Admin atau Super Admin yang boleh mengubah status diameter
    const roleHeader = request.headers.get('x-user-role');
    const cookieHeader = request.headers.get('cookie') || '';
    let isAuthorized = roleHeader === 'admin' || roleHeader === 'super_admin';
    if (!isAuthorized) {
      const match = cookieHeader.match(/ggf_session=([^;]+)/);
      if (match) {
        try {
          const session = JSON.parse(decodeURIComponent(match[1]));
          if (session && (session.role === 'admin' || session.role === 'super_admin')) {
            isAuthorized = true;
          }
        } catch {}
      }
    }
    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin atau Super Admin yang dapat mengubah status diameter.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lokasi, diameter, status } = body;

    if (!lokasi || !diameter) {
      return NextResponse.json(
        { success: false, message: 'Lokasi dan diameter wajib diisi.' },
        { status: 400 }
      );
    }

    const diaNum = Number(diameter);
    if (![40, 60, 80, 100].includes(diaNum)) {
      return NextResponse.json(
        { success: false, message: 'Diameter harus salah satu dari: 40, 60, 80, 100.' },
        { status: 400 }
      );
    }

    const validStatus = ['Open', '-', 'Cek', 'Close'];
    if (!validStatus.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Status harus salah satu dari: Open, -, Cek, Close.' },
        { status: 400 }
      );
    }

    const normalizedStatus = (status === 'Open' || status === '-') ? '-' : status;
    const updateData: Record<string, string> = {};
    if (diaNum === 40) updateData.statusD40 = normalizedStatus;
    else if (diaNum === 60) updateData.statusD60 = normalizedStatus;
    else if (diaNum === 80) updateData.statusD80 = normalizedStatus;
    else if (diaNum === 100) updateData.statusD100 = normalizedStatus;

    const lokStr = String(lokasi).trim();

    // 1. Update ke database PostgreSQL permanen
    await prisma.lokasiOrderGorongGorong.updateMany({
      where: { lokasi: lokStr },
      data: updateData,
    });

    const updatedRow = await prisma.lokasiOrderGorongGorong.findUnique({
      where: { lokasi: lokStr },
    });
    if (updatedRow) {
      const diaStatuses = [
        updatedRow.statusD40 || '-',
        updatedRow.statusD60 || '-',
        updatedRow.statusD80 || '-',
        updatedRow.statusD100 || '-',
      ];
      const hasAnyOpen = diaStatuses.some((st) => st === 'Open' || st === '-');
      const hasAnyClose = diaStatuses.some((st) => st === 'Close');
      const newStatusAll = hasAnyOpen ? 'Open' : (hasAnyClose ? 'Close' : '-');
      await prisma.lokasiOrderGorongGorong.update({
        where: { lokasi: lokStr },
        data: { statusAll: newStatusAll, isClosedExcel: newStatusAll === 'Close' },
      });
    }

    // 2. Update ke snapshot file JSON agar selalu sinkron
    try {
      const snap = loadSnapshotFromFile();
      if (snap && snap[lokStr]) {
        const diaKey = `statusD${diaNum}`;
        (snap[lokStr] as any)[diaKey] = normalizedStatus;
        saveSnapshotToFile(snap);
      }
    } catch (snapErr) {
      console.warn('Warning updating snapshot file:', snapErr);
    }

    return NextResponse.json({
      success: true,
      message: `Status diameter ${diaNum} lokasi ${lokStr} berhasil diperbarui menjadi ${normalizedStatus}.`,
      data: { lokasi: lokStr, diameter: diaNum, status: normalizedStatus },
    });
  } catch (error: any) {
    console.error('Error updating diameter status:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui status diameter', error: error.message },
      { status: 500 }
    );
  }
}
