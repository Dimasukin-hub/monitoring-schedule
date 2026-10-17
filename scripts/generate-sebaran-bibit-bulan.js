const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.plantingDetail.findMany({
    where: {
      aktivitas: 'Tanam Bibit',
    },
  });

  console.log(`Processing ${records.length} records...`);

  const monthsConfig = [
    { key: 'Jan-26', label: 'Jan', num: '01', name: 'Januari 2026' },
    { key: 'Feb-26', label: 'Feb', num: '02', name: 'Februari 2026' },
    { key: 'Mar-26', label: 'Mar', num: '03', name: 'Maret 2026' },
    { key: 'Apr-26', label: 'Apr', num: '04', name: 'April 2026' },
    { key: 'Mei-26', label: 'Mei', num: '05', name: 'Mei 2026' },
    { key: 'Jun-26', label: 'Jun', num: '06', name: 'Juni 2026' },
    { key: 'Jul-26', label: 'Jul', num: '07', name: 'Juli 2026' },
    { key: 'Agu-26', label: 'Agu', num: '08', name: 'Agustus 2026' },
    { key: 'Sep-26', label: 'Sep', num: '09', name: 'September 2026' },
    { key: 'Okt-26', label: 'Okt', num: '10', name: 'Oktober 2026' },
    { key: 'Nov-26', label: 'Nov', num: '11', name: 'November 2026' },
    { key: 'Des-26', label: 'Des', num: '12', name: 'Desember 2026' },
  ];

  const dataset = monthsConfig.map(m => {
    const recs = records.filter(d => {
      if (!d.tanggal) return false;
      const parts = d.tanggal.split('/');
      return parts[1] === m.num && parts[2] === '2026';
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

    const classLocs = {
      crown_B: {},
      crown_S: {},
      crown_K: {},
      crown_M: {},
      sucker_B: {},
      sucker_S: {},
      sucker_K: {},
      sucker_M: {},
    };

    const monthAllLocs = {};

    recs.forEach(d => {
      const isSucker = d.jenisBibit && d.jenisBibit.toLowerCase().includes('sucker');
      const prefix = isSucker ? 'sucker' : 'crown';

      const besar = d.besar || 0;
      const sedang = d.sedang || 0;
      const kecil = d.kecil || 0;
      const rowTotal = d.total || (besar + sedang + kecil);

      totalHa += rowTotal;

      if (!monthAllLocs[d.lokasi]) {
        monthAllLocs[d.lokasi] = { lokasi: d.lokasi, luasHa: 0, bibits: new Set() };
      }
      monthAllLocs[d.lokasi].luasHa += rowTotal;
      monthAllLocs[d.lokasi].bibits.add(isSucker ? 'Sucker' : 'Crown');

      if (besar > 0) {
        classTotals[`${prefix}_B`] += besar;
        classLocs[`${prefix}_B`][d.lokasi] = (classLocs[`${prefix}_B`][d.lokasi] || 0) + besar;
      }
      if (sedang > 0) {
        classTotals[`${prefix}_S`] += sedang;
        classLocs[`${prefix}_S`][d.lokasi] = (classLocs[`${prefix}_S`][d.lokasi] || 0) + sedang;
      }
      if (kecil > 0) {
        classTotals[`${prefix}_K`] += kecil;
        classLocs[`${prefix}_K`][d.lokasi] = (classLocs[`${prefix}_K`][d.lokasi] || 0) + kecil;
      }
    });

    const totMonth = Number(totalHa.toFixed(2));
    const crTotal = Number((classTotals.crown_B + classTotals.crown_S + classTotals.crown_K).toFixed(2));
    const skTotal = Number((classTotals.sucker_B + classTotals.sucker_S + classTotals.sucker_K).toFixed(2));

    const formatLocMap = (locMap) => Object.keys(locMap)
      .map(loc => ({ lokasi: loc, luasHa: Number(locMap[loc].toFixed(2)) }))
      .sort((a, b) => b.luasHa - a.luasHa);

    const classesFormatted = {};
    Object.keys(classTotals).forEach(k => {
      const val = Number(classTotals[k].toFixed(2));
      const locList = formatLocMap(classLocs[k]);
      classesFormatted[k] = {
        luasHa: val,
        pct: totMonth > 0 ? Number(((val / totMonth) * 100).toFixed(1)) : 0,
        locations: locList,
        locationsCount: locList.length,
      };
    });

    const allLocList = Object.values(monthAllLocs)
      .map(l => ({
        lokasi: l.lokasi,
        luasHa: Number(l.luasHa.toFixed(2)),
        bibit: Array.from(l.bibits).join(' & ')
      }))
      .sort((a, b) => b.luasHa - a.luasHa);

    return {
      monthKey: m.key,
      monthLabel: m.label,
      monthName: m.name,
      totalHa: totMonth,
      crownTotal: crTotal,
      suckerTotal: skTotal,
      // Flattened values for easy Recharts Bar dataKey
      crown_B: Number(classTotals.crown_B.toFixed(2)),
      crown_S: Number(classTotals.crown_S.toFixed(2)),
      crown_K: Number(classTotals.crown_K.toFixed(2)),
      crown_M: 0,
      sucker_B: Number(classTotals.sucker_B.toFixed(2)),
      sucker_S: Number(classTotals.sucker_S.toFixed(2)),
      sucker_K: Number(classTotals.sucker_K.toFixed(2)),
      sucker_M: 0,
      classes: classesFormatted,
      locations: allLocList,
      locationsCount: allLocList.length,
    };
  });

  const outPath = path.join(__dirname, '../lib/sebaranBibitBulan.json');
  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2), 'utf8');
  console.log(`Successfully generated ${outPath} with ${dataset.length} months.`);

  await prisma.$disconnect();
}

main();
