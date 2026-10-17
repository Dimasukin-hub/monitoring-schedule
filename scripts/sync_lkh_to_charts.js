const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('=== START SYNC LKH TO CHARTS ===');

  const lkhPath = path.join(__dirname, '../excel/5. Monitoring Tanam PG1 Jan-Des\'26.xlsx');
  console.log('Reading LKH from:', lkhPath);
  const wb = xlsx.readFile(lkhPath);
  const ws = wb.Sheets['LKH'];
  if (!ws) {
    throw new Error('Sheet LKH not found in ' + lkhPath);
  }

  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log('Total raw rows in LKH:', rawData.length);

  // Month keys for LKH: 1 to 6 (Jan to Jun)
  // Structure: monthRecords[monthNum] = [ { lokasi, jenis, classCode, className, luasHa } ]
  const lkhMonths = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  for (let i = 1; i < rawData.length; i++) {
    const r = rawData[i];
    if (!r || !r[0]) continue;

    let mo = null;
    let yr = null;
    if (typeof r[0] === 'number') {
      const d = xlsx.SSF.parse_date_code(r[0]);
      if (d) {
        mo = d.m;
        yr = d.y;
      }
    } else if (r[0] instanceof Date) {
      mo = r[0].getMonth() + 1;
      yr = r[0].getFullYear();
    } else if (typeof r[0] === 'string') {
      const parts = r[0].trim().split('/');
      if (parts.length === 3) {
        mo = parseInt(parts[1], 10);
        yr = parseInt(parts[2], 10);
      }
    }

    if (yr !== 2026 || !mo || mo < 1 || mo > 6) continue;

    const lokasi = String(r[3] || '').trim();
    if (!lokasi || lokasi === '-' || lokasi === '0') continue;

    const he = Number(r[7]) || 0; // Hasil Efektif (Ha)
    if (he <= 0) continue;

    const act = String(r[6] || '').trim().toLowerCase();
    const isCrown = act.includes('crown');
    const isSucker = act.includes('sucker');
    if (!isCrown && !isSucker) continue;

    const jenis = isCrown ? 'Crown' : 'Sucker';
    let classCode = 'K';
    let className = 'Kecil';

    if (act.includes('besar')) {
      classCode = 'B';
      className = 'Besar';
    } else if (act.includes('sedang')) {
      classCode = 'S';
      className = 'Sedang';
    } else if (act.includes('ekstra') || act.includes('extra')) {
      classCode = 'M';
      className = 'Extra Kecil';
    } else if (act.includes('kecil')) {
      classCode = 'K';
      className = 'Kecil';
    }

    lkhMonths[mo].push({
      lokasi,
      jenis,
      classCode,
      className,
      luasHa: he,
    });
  }

  Object.keys(lkhMonths).forEach((m) => {
    console.log(`Month ${m}: ${lkhMonths[m].length} rows parsed.`);
  });

  // Helper to build PeriodData object
  function buildPeriodData(records) {
    let grandTotal = 0;
    const crownData = {
      jenis: 'Crown',
      totalHa: 0,
      classes: {
        B: { name: 'Besar', code: 'B', totalHa: 0, locations: {} },
        S: { name: 'Sedang', code: 'S', totalHa: 0, locations: {} },
        K: { name: 'Kecil', code: 'K', totalHa: 0, locations: {} },
        M: { name: 'Extra Kecil', code: 'M', totalHa: 0, locations: {} },
      },
    };

    const suckerData = {
      jenis: 'Sucker',
      totalHa: 0,
      classes: {
        B: { name: 'Besar', code: 'B', totalHa: 0, locations: {} },
        S: { name: 'Sedang', code: 'S', totalHa: 0, locations: {} },
        K: { name: 'Kecil', code: 'K', totalHa: 0, locations: {} },
        M: { name: 'Extra Kecil', code: 'M', totalHa: 0, locations: {} },
      },
    };

    records.forEach((rec) => {
      const targetGroup = rec.jenis === 'Crown' ? crownData : suckerData;
      const ha = rec.luasHa;
      grandTotal += ha;
      targetGroup.totalHa += ha;

      const code = rec.classCode;
      if (targetGroup.classes[code]) {
        targetGroup.classes[code].totalHa += ha;
        targetGroup.classes[code].locations[rec.lokasi] =
          (targetGroup.classes[code].locations[rec.lokasi] || 0) + ha;
      }
    });

    const formatBibit = (bg) => {
      const tot = Number(bg.totalHa.toFixed(2));
      const formattedClasses = {};
      ['B', 'S', 'K', 'M'].forEach((code) => {
        const c = bg.classes[code];
        const cTot = Number(c.totalHa.toFixed(2));
        const locList = Object.keys(c.locations)
          .map((loc) => ({
            lokasi: loc,
            luasHa: Number(c.locations[loc].toFixed(2)),
          }))
          .sort((a, b) => b.luasHa - a.luasHa);

        formattedClasses[code] = {
          name: c.name,
          code: c.code,
          luasHa: cTot,
          pct: tot > 0 ? Number(((cTot / tot) * 100).toFixed(1)) : 0,
          locations: locList,
          locationsCount: locList.length,
        };
      });

      return {
        jenis: bg.jenis,
        totalHa: tot,
        pct: grandTotal > 0 ? Number(((tot / grandTotal) * 100).toFixed(1)) : 0,
        classes: formattedClasses,
      };
    };

    const cr = formatBibit(crownData);
    const sk = formatBibit(suckerData);
    const grandTot = Number((cr.totalHa + sk.totalHa).toFixed(2));

    return {
      totalHa: grandTot,
      crown: {
        ...cr,
        pct: grandTot > 0 ? Number(((cr.totalHa / grandTot) * 100).toFixed(1)) : 0,
      },
      sucker: {
        ...sk,
        pct: grandTot > 0 ? Number(((sk.totalHa / grandTot) * 100).toFixed(1)) : 0,
      },
    };
  }

  // --- 1. UPDATE realTanamBibitDonut.json ---
  const donutPath = path.join(__dirname, '../lib/realTanamBibitDonut.json');
  const existingDonut = JSON.parse(fs.readFileSync(donutPath, 'utf8'));

  const newDonut = {};
  const monthKeyPrefixes = {
    1: '2026-01',
    2: '2026-02',
    3: '2026-03',
    4: '2026-04',
    5: '2026-05',
    6: '2026-06',
  };

  for (let m = 1; m <= 6; m++) {
    const k = monthKeyPrefixes[m];
    newDonut[k] = buildPeriodData(lkhMonths[m]);
    console.log(`Donut ${k}: total ${newDonut[k].totalHa} Ha (Crown: ${newDonut[k].crown.totalHa}, Sucker: ${newDonut[k].sucker.totalHa})`);
  }

  // Preserve July - October exactly as they were
  ['2026-07', '2026-08', '2026-09', '2026-10'].forEach((k) => {
    if (existingDonut[k]) {
      newDonut[k] = existingDonut[k];
      console.log(`Donut ${k} (preserved): total ${newDonut[k].totalHa} Ha`);
    }
  });

  // Recalculate 'all' combining 2026-01 to 2026-10
  function aggregatePeriods(periodList) {
    let grandTotal = 0;
    const crownData = {
      jenis: 'Crown',
      totalHa: 0,
      classes: {
        B: { name: 'Besar', code: 'B', totalHa: 0, locations: {} },
        S: { name: 'Sedang', code: 'S', totalHa: 0, locations: {} },
        K: { name: 'Kecil', code: 'K', totalHa: 0, locations: {} },
        M: { name: 'Extra Kecil', code: 'M', totalHa: 0, locations: {} },
      },
    };
    const suckerData = {
      jenis: 'Sucker',
      totalHa: 0,
      classes: {
        B: { name: 'Besar', code: 'B', totalHa: 0, locations: {} },
        S: { name: 'Sedang', code: 'S', totalHa: 0, locations: {} },
        K: { name: 'Kecil', code: 'K', totalHa: 0, locations: {} },
        M: { name: 'Extra Kecil', code: 'M', totalHa: 0, locations: {} },
      },
    };

    periodList.forEach((pd) => {
      ['crown', 'sucker'].forEach((bKey) => {
        const bg = pd[bKey];
        const target = bKey === 'crown' ? crownData : suckerData;
        if (!bg) return;
        target.totalHa += bg.totalHa || 0;
        grandTotal += bg.totalHa || 0;

        ['B', 'S', 'K', 'M'].forEach((code) => {
          const cls = bg.classes?.[code];
          if (!cls) return;
          target.classes[code].totalHa += cls.luasHa || 0;
          (cls.locations || []).forEach((loc) => {
            target.classes[code].locations[loc.lokasi] =
              (target.classes[code].locations[loc.lokasi] || 0) + loc.luasHa;
          });
        });
      });
    });

    const formatBibit = (bg) => {
      const tot = Number(bg.totalHa.toFixed(2));
      const formattedClasses = {};
      ['B', 'S', 'K', 'M'].forEach((code) => {
        const c = bg.classes[code];
        const cTot = Number(c.totalHa.toFixed(2));
        const locList = Object.keys(c.locations)
          .map((loc) => ({
            lokasi: loc,
            luasHa: Number(c.locations[loc].toFixed(2)),
          }))
          .sort((a, b) => b.luasHa - a.luasHa);

        formattedClasses[code] = {
          name: c.name,
          code: c.code,
          luasHa: cTot,
          pct: tot > 0 ? Number(((cTot / tot) * 100).toFixed(1)) : 0,
          locations: locList,
          locationsCount: locList.length,
        };
      });

      return {
        jenis: bg.jenis,
        totalHa: tot,
        pct: grandTotal > 0 ? Number(((tot / grandTotal) * 100).toFixed(1)) : 0,
        classes: formattedClasses,
      };
    };

    const cr = formatBibit(crownData);
    const sk = formatBibit(suckerData);
    const grandTot = Number((cr.totalHa + sk.totalHa).toFixed(2));

    return {
      totalHa: grandTot,
      crown: {
        ...cr,
        pct: grandTot > 0 ? Number(((cr.totalHa / grandTot) * 100).toFixed(1)) : 0,
      },
      sucker: {
        ...sk,
        pct: grandTot > 0 ? Number(((sk.totalHa / grandTot) * 100).toFixed(1)) : 0,
      },
    };
  }

  const allActiveMonths = [
    newDonut['2026-01'],
    newDonut['2026-02'],
    newDonut['2026-03'],
    newDonut['2026-04'],
    newDonut['2026-05'],
    newDonut['2026-06'],
    newDonut['2026-07'],
    newDonut['2026-08'],
    newDonut['2026-09'],
    newDonut['2026-10'],
  ].filter(Boolean);

  newDonut['all'] = aggregatePeriods(allActiveMonths);
  console.log(`Donut 'all' (Jan - Oct 2026): total ${newDonut['all'].totalHa} Ha`);

  fs.writeFileSync(donutPath, JSON.stringify(newDonut, null, 2), 'utf8');
  console.log('Successfully saved updated realTanamBibitDonut.json');

  // --- 2. UPDATE sebaranBibitBulan.json ---
  const sebaranPath = path.join(__dirname, '../lib/sebaranBibitBulan.json');
  const existingSebaran = JSON.parse(fs.readFileSync(sebaranPath, 'utf8'));

  // Months config for sebaran: 0 to 5 are Jan to Jun
  const monthsMeta = [
    { key: 'Jan-26', label: 'Jan', num: 1, name: 'Januari 2026' },
    { key: 'Feb-26', label: 'Feb', num: 2, name: 'Februari 2026' },
    { key: 'Mar-26', label: 'Mar', num: 3, name: 'Maret 2026' },
    { key: 'Apr-26', label: 'Apr', num: 4, name: 'April 2026' },
    { key: 'Mei-26', label: 'Mei', num: 5, name: 'Mei 2026' },
    { key: 'Jun-26', label: 'Jun', num: 6, name: 'Juni 2026' },
  ];

  monthsMeta.forEach((m, idx) => {
    const recs = lkhMonths[m.num];
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

    recs.forEach((r) => {
      const prefix = r.jenis === 'Crown' ? 'crown' : 'sucker';
      const key = `${prefix}_${r.classCode}`;
      const ha = r.luasHa;
      totalHa += ha;

      if (!monthAllLocs[r.lokasi]) {
        monthAllLocs[r.lokasi] = { lokasi: r.lokasi, luasHa: 0, bibits: new Set() };
      }
      monthAllLocs[r.lokasi].luasHa += ha;
      monthAllLocs[r.lokasi].bibits.add(r.jenis);

      if (classTotals[key] !== undefined) {
        classTotals[key] += ha;
        classLocs[key][r.lokasi] = (classLocs[key][r.lokasi] || 0) + ha;
      }
    });

    const totMonth = Number(totalHa.toFixed(2));
    const crTotal = Number(
      (classTotals.crown_B + classTotals.crown_S + classTotals.crown_K + classTotals.crown_M).toFixed(2)
    );
    const skTotal = Number(
      (classTotals.sucker_B + classTotals.sucker_S + classTotals.sucker_K + classTotals.sucker_M).toFixed(2)
    );

    const formatLocMap = (locMap) =>
      Object.keys(locMap)
        .map((loc) => ({ lokasi: loc, luasHa: Number(locMap[loc].toFixed(2)) }))
        .sort((a, b) => b.luasHa - a.luasHa);

    const classesFormatted = {};
    Object.keys(classTotals).forEach((k) => {
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
      .map((l) => ({
        lokasi: l.lokasi,
        luasHa: Number(l.luasHa.toFixed(2)),
        bibit: Array.from(l.bibits).join(' & '),
      }))
      .sort((a, b) => b.luasHa - a.luasHa);

    existingSebaran[idx] = {
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
      locations: allLocList,
      locationsCount: allLocList.length,
    };

    console.log(`Sebaran ${m.key}: total ${totMonth} Ha (Crown: ${crTotal}, Sucker: ${skTotal})`);
  });

  fs.writeFileSync(sebaranPath, JSON.stringify(existingSebaran, null, 2), 'utf8');
  console.log('Successfully saved updated sebaranBibitBulan.json');

  console.log('=== ALL COMPLETED SUCCESSFULLY ===');
}

main().catch((err) => {
  console.error('Error syncing LKH to charts:', err);
  process.exit(1);
});
