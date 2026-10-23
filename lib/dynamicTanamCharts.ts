import { prisma } from './prisma';

export interface DynamicProsesTanamItem {
  wilayah: string;
  lokasi: string;
  jenisBibit: string;
  kelasBibit: string;
  bibit: string;
  progress: number;
  realTanam: number;
  luasHa: number;
  sisaHa: number;
  estSelesai: string;
  status: string;
}

export async function getDynamicProsesTanamList(): Promise<DynamicProsesTanamItem[]> {
  const [plantings, lands] = await Promise.all([
    prisma.planting.findMany({
      where: {
        OR: [
          { status: { in: ['PROSES', 'CEK SELESAI'] } },
          { progress: { gt: 0, lt: 100 } },
        ],
      },
    }),
    prisma.land.findMany({
      select: {
        lokasi: true,
        wilayah: true,
        luasNetto: true,
        jenisBibit: true,
        kelasBibit: true,
        progressTanam: true,
        rencSelesaiTanam: true,
        realMulaiTanam: true,
        realSelesaiTanam: true,
      },
    }),
  ]);

  const landMap = new Map<string, any>();
  for (const l of lands) {
    if (l.lokasi) landMap.set(l.lokasi.trim().toUpperCase(), l);
  }

  const normalizeWilayah = (rawW: string | null | undefined): string => {
    if (!rawW) return 'W01';
    const clean = rawW.trim().toUpperCase();
    if (clean === 'ARS1') return 'W07';
    if (clean === 'SAG1' || clean === 'MD2') return 'W04';
    if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
    if (clean.startsWith('AW')) {
      const num = clean.slice(2);
      return num.length === 1 ? `W0${num}` : `W${num}`;
    }
    return clean;
  };

  const resultMap = new Map<string, DynamicProsesTanamItem>();

  for (const p of plantings) {
    if (!p.lokasi) continue;
    const locKey = p.lokasi.trim().toUpperCase();
    const ld = landMap.get(locKey);
    const w = ld ? normalizeWilayah(ld.wilayah) : 'W01';
    const jenis = p.jenisBibit || ld?.jenisBibit || 'Crown';
    const kelas = p.kelasBibit || ld?.kelasBibit || '';
    const bibitFormatted = kelas ? `${jenis} (${kelas})` : jenis;
    const luas = p.luas || ld?.luasNetto || 0;
    const real = p.realTanam || 0;
    const prog = p.progress ?? (luas > 0 ? Number(((real / luas) * 100).toFixed(1)) : (ld?.progressTanam ?? 50));

    let status = p.status || 'PROSES';
    if (prog >= 100 || (luas > 0 && real >= luas)) {
      status = 'SELESAI';
    } else if (prog > 95) {
      status = 'CEK SELESAI';
    } else if (real > 0 || prog > 0) {
      status = 'PROSES';
    }

    if (status === 'SELESAI') continue;

    const sisa = Math.max(0, Number((luas - real).toFixed(2)));

    resultMap.set(locKey, {
      wilayah: w,
      lokasi: p.lokasi,
      jenisBibit: jenis,
      kelasBibit: kelas,
      bibit: bibitFormatted,
      progress: prog,
      realTanam: Math.round(real * 100) / 100,
      luasHa: Math.round(luas * 100) / 100,
      sisaHa: sisa,
      estSelesai: p.estSelesai || ld?.rencSelesaiTanam || '-',
      status: status,
    });
  }

  const list = Array.from(resultMap.values());
  list.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  return list;
}

export async function getDynamicTanamChartsData() {
  const records = await prisma.plantingDetail.findMany({
    where: {
      aktivitas: { contains: 'tanam', mode: 'insensitive' },
    },
    orderBy: { id: 'asc' },
  });

  const monthsConfig = [
    { key: 'Jan-26', isoKey: '2026-01', label: 'Jan', num: '01', name: 'Januari 2026' },
    { key: 'Feb-26', isoKey: '2026-02', label: 'Feb', num: '02', name: 'Februari 2026' },
    { key: 'Mar-26', isoKey: '2026-03', label: 'Mar', num: '03', name: 'Maret 2026' },
    { key: 'Apr-26', isoKey: '2026-04', label: 'Apr', num: '04', name: 'April 2026' },
    { key: 'Mei-26', isoKey: '2026-05', label: 'Mei', num: '05', name: 'Mei 2026' },
    { key: 'Jun-26', isoKey: '2026-06', label: 'Jun', num: '06', name: 'Juni 2026' },
    { key: 'Jul-26', isoKey: '2026-07', label: 'Jul', num: '07', name: 'Juli 2026' },
    { key: 'Agu-26', isoKey: '2026-08', label: 'Agu', num: '08', name: 'Agustus 2026' },
    { key: 'Sep-26', isoKey: '2026-09', label: 'Sep', num: '09', name: 'September 2026' },
    { key: 'Okt-26', isoKey: '2026-10', label: 'Okt', num: '10', name: 'Oktober 2026' },
    { key: 'Nov-26', isoKey: '2026-11', label: 'Nov', num: '11', name: 'November 2026' },
    { key: 'Des-26', isoKey: '2026-12', label: 'Des', num: '12', name: 'Desember 2026' },
  ];

  const sebaranBibitBulan: any[] = [];
  const realTanamBibitDonut: Record<string, any> = {};

  for (const m of monthsConfig) {
    const monthRecs = records.filter((r) => {
      if (r.tanggal) {
        const parts = r.tanggal.split('/');
        return parts.length === 3 && parts[1] === m.num && parts[2] === '2026';
      }
      if (r.tanggalDate) {
        const d = new Date(r.tanggalDate);
        return d.getFullYear() === 2026 && d.getMonth() + 1 === parseInt(m.num, 10);
      }
      return false;
    });

    let totalHa = 0;
    const classTotals = {
      crown_B: 0,
      crown_S: 0,
      crown_K: 0,
      crown_M: 0,
      sucker_B: 0,
      sucker_S: 0,
      sucker_K: 0,
      sucker_M: 0,
    };

    const classLocs: Record<string, Record<string, number>> = {
      crown_B: {},
      crown_S: {},
      crown_K: {},
      crown_M: {},
      sucker_B: {},
      sucker_S: {},
      sucker_K: {},
      sucker_M: {},
    };

    const donutGroup = {
      totalHa: 0,
      crown: {
        jenis: 'Crown',
        totalHa: 0,
        pct: 0,
        classes: {
          B: { name: 'Besar', code: 'B', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
          S: { name: 'Sedang', code: 'S', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
          K: { name: 'Kecil', code: 'K', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
          M: { name: 'Extra Kecil', code: 'M', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        },
      },
      sucker: {
        jenis: 'Sucker',
        totalHa: 0,
        pct: 0,
        classes: {
          B: { name: 'Besar', code: 'B', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
          S: { name: 'Sedang', code: 'S', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
          K: { name: 'Kecil', code: 'K', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
          M: { name: 'Extra Kecil', code: 'M', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        },
      },
    };

    for (const d of monthRecs) {
      const isSucker = (d.jenisBibit || '').toLowerCase().includes('sucker');
      const prefix = isSucker ? 'sucker' : 'crown';
      const targetGroup = isSucker ? donutGroup.sucker : donutGroup.crown;

      const besar = d.besar || 0;
      const sedang = d.sedang || 0;
      const kecil = d.kecil || 0;
      const extraKecil = d.extraKecil || 0;
      const standar = d.standar || 0;
      const rowTotal = d.total || (besar + sedang + kecil + extraKecil + standar);

      totalHa += rowTotal;
      targetGroup.totalHa += rowTotal;

      if (besar > 0) {
        classTotals[`${prefix}_B`] += besar;
        classLocs[`${prefix}_B`][d.lokasi] = (classLocs[`${prefix}_B`][d.lokasi] || 0) + besar;
        targetGroup.classes.B.luasHa += besar;
      }
      if (sedang > 0) {
        classTotals[`${prefix}_S`] += sedang;
        classLocs[`${prefix}_S`][d.lokasi] = (classLocs[`${prefix}_S`][d.lokasi] || 0) + sedang;
        targetGroup.classes.S.luasHa += sedang;
      }
      if (kecil > 0) {
        classTotals[`${prefix}_K`] += kecil;
        classLocs[`${prefix}_K`][d.lokasi] = (classLocs[`${prefix}_K`][d.lokasi] || 0) + kecil;
        targetGroup.classes.K.luasHa += kecil;
      }
      if (extraKecil > 0) {
        classTotals[`${prefix}_M`] += extraKecil;
        classLocs[`${prefix}_M`][d.lokasi] = (classLocs[`${prefix}_M`][d.lokasi] || 0) + extraKecil;
        targetGroup.classes.M.luasHa += extraKecil;
      }
    }

    const totMonth = Number(totalHa.toFixed(2));
    const crTotal = Number((classTotals.crown_B + classTotals.crown_S + classTotals.crown_K + classTotals.crown_M).toFixed(2));
    const skTotal = Number((classTotals.sucker_B + classTotals.sucker_S + classTotals.sucker_K + classTotals.sucker_M).toFixed(2));

    const formatLocMap = (locMap: Record<string, number>) =>
      Object.keys(locMap)
        .map((loc) => ({ lokasi: loc, luasHa: Number(locMap[loc].toFixed(2)) }))
        .sort((a, b) => b.luasHa - a.luasHa);

    const classesFormatted: Record<string, any> = {};
    for (const [k, val] of Object.entries(classTotals)) {
      const v = Number(val.toFixed(2));
      const locList = formatLocMap(classLocs[k]);
      classesFormatted[k] = {
        luasHa: v,
        pct: totMonth > 0 ? Number(((v / totMonth) * 100).toFixed(1)) : 0,
        locations: locList,
        locationsCount: locList.length,
      };
    }

    sebaranBibitBulan.push({
      monthKey: m.key,
      monthLabel: m.label,
      monthName: m.name,
      totalHa: totMonth,
      crownTotal: crTotal,
      suckerTotal: skTotal,
      crown_B: Number(classTotals.crown_B.toFixed(2)),
      crown_S: Number(classTotals.crown_S.toFixed(2)),
      crown_K: Number(classTotals.crown_K.toFixed(2)),
      crown_M: Number(classTotals.crown_M.toFixed(2)),
      sucker_B: Number(classTotals.sucker_B.toFixed(2)),
      sucker_S: Number(classTotals.sucker_S.toFixed(2)),
      sucker_K: Number(classTotals.sucker_K.toFixed(2)),
      sucker_M: Number(classTotals.sucker_M.toFixed(2)),
      classes: classesFormatted,
    });

    // Finalize Donut Group
    donutGroup.totalHa = totMonth;
    donutGroup.crown.totalHa = crTotal;
    donutGroup.sucker.totalHa = skTotal;
    donutGroup.crown.pct = totMonth > 0 ? Number(((crTotal / totMonth) * 100).toFixed(1)) : 0;
    donutGroup.sucker.pct = totMonth > 0 ? Number(((skTotal / totMonth) * 100).toFixed(1)) : 0;

    for (const code of ['B', 'S', 'K', 'M'] as const) {
      const crCls = donutGroup.crown.classes[code];
      crCls.luasHa = Number(crCls.luasHa.toFixed(2));
      crCls.pct = crTotal > 0 ? Number(((crCls.luasHa / crTotal) * 100).toFixed(1)) : 0;
      crCls.locations = formatLocMap(classLocs[`crown_${code}`]);
      crCls.locationsCount = crCls.locations.length;

      const skCls = donutGroup.sucker.classes[code];
      skCls.luasHa = Number(skCls.luasHa.toFixed(2));
      skCls.pct = skTotal > 0 ? Number(((skCls.luasHa / skTotal) * 100).toFixed(1)) : 0;
      skCls.locations = formatLocMap(classLocs[`sucker_${code}`]);
      skCls.locationsCount = skCls.locations.length;
    }

    realTanamBibitDonut[m.isoKey] = donutGroup;
  }

  // Agregasi Semua Bulan untuk Donut Chart ('all')
  const allDonutGroup = {
    totalHa: 0,
    crown: {
      jenis: 'Crown',
      totalHa: 0,
      pct: 0,
      classes: {
        B: { name: 'Besar', code: 'B', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        S: { name: 'Sedang', code: 'S', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        K: { name: 'Kecil', code: 'K', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        M: { name: 'Extra Kecil', code: 'M', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
      },
    },
    sucker: {
      jenis: 'Sucker',
      totalHa: 0,
      pct: 0,
      classes: {
        B: { name: 'Besar', code: 'B', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        S: { name: 'Sedang', code: 'S', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        K: { name: 'Kecil', code: 'K', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
        M: { name: 'Extra Kecil', code: 'M', luasHa: 0, pct: 0, locations: [] as any[], locationsCount: 0 },
      },
    },
  };

  const allClassTotals = {
    crown_B: 0, crown_S: 0, crown_K: 0, crown_M: 0,
    sucker_B: 0, sucker_S: 0, sucker_K: 0, sucker_M: 0,
  };
  const allClassLocs: Record<string, Record<string, number>> = {
    crown_B: {}, crown_S: {}, crown_K: {}, crown_M: {},
    sucker_B: {}, sucker_S: {}, sucker_K: {}, sucker_M: {},
  };
  let allTotalHa = 0;

  for (const d of records) {
    const isSucker = (d.jenisBibit || '').toLowerCase().includes('sucker');
    const prefix = isSucker ? 'sucker' : 'crown';
    const targetGroup = isSucker ? allDonutGroup.sucker : allDonutGroup.crown;

    const besar = d.besar || 0;
    const sedang = d.sedang || 0;
    const kecil = d.kecil || 0;
    const extraKecil = d.extraKecil || 0;
    const standar = d.standar || 0;
    const rowTotal = d.total || (besar + sedang + kecil + extraKecil + standar);

    allTotalHa += rowTotal;
    targetGroup.totalHa += rowTotal;

    if (besar > 0) {
      allClassTotals[`${prefix}_B`] += besar;
      allClassLocs[`${prefix}_B`][d.lokasi] = (allClassLocs[`${prefix}_B`][d.lokasi] || 0) + besar;
      targetGroup.classes.B.luasHa += besar;
    }
    if (sedang > 0) {
      allClassTotals[`${prefix}_S`] += sedang;
      allClassLocs[`${prefix}_S`][d.lokasi] = (allClassLocs[`${prefix}_S`][d.lokasi] || 0) + sedang;
      targetGroup.classes.S.luasHa += sedang;
    }
    if (kecil > 0) {
      allClassTotals[`${prefix}_K`] += kecil;
      allClassLocs[`${prefix}_K`][d.lokasi] = (allClassLocs[`${prefix}_K`][d.lokasi] || 0) + kecil;
      targetGroup.classes.K.luasHa += kecil;
    }
    if (extraKecil > 0) {
      allClassTotals[`${prefix}_M`] += extraKecil;
      allClassLocs[`${prefix}_M`][d.lokasi] = (allClassLocs[`${prefix}_M`][d.lokasi] || 0) + extraKecil;
      targetGroup.classes.M.luasHa += extraKecil;
    }
  }

  const allTot = Number(allTotalHa.toFixed(2));
  const allCrTot = Number((allClassTotals.crown_B + allClassTotals.crown_S + allClassTotals.crown_K + allClassTotals.crown_M).toFixed(2));
  const allSkTot = Number((allClassTotals.sucker_B + allClassTotals.sucker_S + allClassTotals.sucker_K + allClassTotals.sucker_M).toFixed(2));

  allDonutGroup.totalHa = allTot;
  allDonutGroup.crown.totalHa = allCrTot;
  allDonutGroup.sucker.totalHa = allSkTot;
  allDonutGroup.crown.pct = allTot > 0 ? Number(((allCrTot / allTot) * 100).toFixed(1)) : 0;
  allDonutGroup.sucker.pct = allTot > 0 ? Number(((allSkTot / allTot) * 100).toFixed(1)) : 0;

  for (const code of ['B', 'S', 'K', 'M'] as const) {
    const crCls = allDonutGroup.crown.classes[code];
    crCls.luasHa = Number(crCls.luasHa.toFixed(2));
    crCls.pct = allCrTot > 0 ? Number(((crCls.luasHa / allCrTot) * 100).toFixed(1)) : 0;
    crCls.locations = Object.keys(allClassLocs[`crown_${code}`])
      .map((loc) => ({ lokasi: loc, luasHa: Number(allClassLocs[`crown_${code}`][loc].toFixed(2)) }))
      .sort((a, b) => b.luasHa - a.luasHa);
    crCls.locationsCount = crCls.locations.length;

    const skCls = allDonutGroup.sucker.classes[code];
    skCls.luasHa = Number(skCls.luasHa.toFixed(2));
    skCls.pct = allSkTot > 0 ? Number(((skCls.luasHa / allSkTot) * 100).toFixed(1)) : 0;
    skCls.locations = Object.keys(allClassLocs[`sucker_${code}`])
      .map((loc) => ({ lokasi: loc, luasHa: Number(allClassLocs[`sucker_${code}`][loc].toFixed(2)) }))
      .sort((a, b) => b.luasHa - a.luasHa);
    skCls.locationsCount = skCls.locations.length;
  }

  realTanamBibitDonut['all'] = allDonutGroup;

  const realTanamKemarin = computeDynamicRealTanamKemarin(records);

  return {
    sebaranBibitBulan,
    realTanamBibitDonut,
    realTanamKemarin,
  };
}

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function computeDynamicRealTanamKemarin(records: any[]): any {
  let maxTimestamp = 0;
  let maxDateStr = '';

  for (const r of records) {
    if (r.aktivitas && r.aktivitas.toLowerCase().includes('petik')) continue;
    let ts = 0;
    let str = r.tanggal || '';
    if (r.tanggal) {
      const p = r.tanggal.split('/');
      if (p.length === 3) {
        ts = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10)).getTime();
      }
    } else if (r.tanggalDate) {
      ts = new Date(r.tanggalDate).getTime();
      const d = new Date(r.tanggalDate);
      str = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    if (ts > maxTimestamp) {
      maxTimestamp = ts;
      maxDateStr = str;
    }
  }

  if (!maxDateStr || maxTimestamp === 0) return null;

  const targetDateRecords = records.filter((r) => {
    if (r.aktivitas && r.aktivitas.toLowerCase().includes('petik')) return false;
    if (r.tanggal === maxDateStr) return true;
    if (r.tanggalDate) {
      const d = new Date(r.tanggalDate);
      const str = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return str === maxDateStr;
    }
    return false;
  });

  const parts = maxDateStr.split('/');
  let dateLabel = maxDateStr;
  let isoDate = '';
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    dateLabel = `${d} ${INDO_MONTHS[m - 1] || 'Oktober'} ${y}`;
    isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const items = targetDateRecords.map((r, idx) => {
    let kelas = 'Kecil';
    if ((r.besar || 0) > 0) kelas = 'Besar';
    else if ((r.sedang || 0) > 0) kelas = 'Sedang';
    else if ((r.kecil || 0) > 0) kelas = 'Kecil';
    else if ((r.extraKecil || 0) > 0) kelas = 'Extra Kecil';
    else if ((r.standar || 0) > 0) kelas = 'Standar';

    return {
      no: idx + 1,
      lokasi: r.lokasi,
      bibit: r.jenisBibit || 'Crown',
      kelas,
      luas: Number((r.total || 0).toFixed(2)),
      luasNetto: r.luasNetto ? Number(r.luasNetto.toFixed(2)) : null,
    };
  });

  const totalLuas = Number(items.reduce((sum, it) => sum + (it.luas || 0), 0).toFixed(2));

  return {
    date: maxDateStr,
    dateLabel,
    isoDate,
    totalLuas,
    count: items.length,
    items,
  };
}
