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

  console.log(`Found ${records.length} planting detail records.`);

  const monthKeys = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

  function buildPeriod(recs) {
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

    recs.forEach((d) => {
      const isSucker = d.jenisBibit && d.jenisBibit.toLowerCase().includes('sucker');
      const targetGroup = isSucker ? suckerData : crownData;

      const besar = d.besar || 0;
      const sedang = d.sedang || 0;
      const kecil = d.kecil || 0;
      const rowTotal = d.total || (besar + sedang + kecil);

      grandTotal += rowTotal;
      targetGroup.totalHa += rowTotal;

      if (besar > 0) {
        targetGroup.classes.B.totalHa += besar;
        targetGroup.classes.B.locations[d.lokasi] = (targetGroup.classes.B.locations[d.lokasi] || 0) + besar;
      }
      if (sedang > 0) {
        targetGroup.classes.S.totalHa += sedang;
        targetGroup.classes.S.locations[d.lokasi] = (targetGroup.classes.S.locations[d.lokasi] || 0) + sedang;
      }
      if (kecil > 0) {
        targetGroup.classes.K.totalHa += kecil;
        targetGroup.classes.K.locations[d.lokasi] = (targetGroup.classes.K.locations[d.lokasi] || 0) + kecil;
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

  const result = {};

  monthKeys.forEach((m) => {
    const [yr, mo] = m.split('-');
    const mRecs = records.filter((d) => {
      if (!d.tanggal) return false;
      const parts = d.tanggal.split('/');
      return parts[1] === mo && parts[2] === yr;
    });
    result[m] = buildPeriod(mRecs);
    console.log(`Month ${m}: total ${result[m].totalHa} Ha (Crown: ${result[m].crown.totalHa}, Sucker: ${result[m].sucker.totalHa})`);
  });

  result['all'] = buildPeriod(records);
  console.log(`All period: total ${result['all'].totalHa} Ha`);

  const outputPath = path.join(__dirname, '../lib/realTanamBibitDonut.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Saved updated realTanamBibitDonut.json to ${outputPath}`);

  await prisma.$disconnect();
}

main();
