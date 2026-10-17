const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.plantingDetail.findMany({
    where: {
      aktivitas: 'Tanam Bibit',
    },
  });

  console.log(`Total planting detail records: ${records.length}`);

  const allMonths = [
    { key: 'Jan-26', monthNum: '01', name: 'Januari' },
    { key: 'Feb-26', monthNum: '02', name: 'Februari' },
    { key: 'Mar-26', monthNum: '03', name: 'Maret' },
    { key: 'Apr-26', monthNum: '04', name: 'April' },
    { key: 'Mei-26', monthNum: '05', name: 'Mei' },
    { key: 'Jun-26', monthNum: '06', name: 'Juni' },
    { key: 'Jul-26', monthNum: '07', name: 'Juli' },
    { key: 'Agu-26', monthNum: '08', name: 'Agustus' },
    { key: 'Sep-26', monthNum: '09', name: 'September' },
    { key: 'Okt-26', monthNum: '10', name: 'Oktober' },
  ];

  const monthlyData = allMonths.map(m => {
    const recs = records.filter(d => {
      if (!d.tanggal) return false;
      const parts = d.tanggal.split('/');
      return parts[1] === m.monthNum && parts[2] === '2026';
    });

    let totalHa = 0;
    const series = {
      crown_B: 0,
      crown_S: 0,
      crown_K: 0,
      crown_M: 0,
      sucker_B: 0,
      sucker_S: 0,
      sucker_K: 0,
      sucker_M: 0,
    };

    const locationMap = {
      crown_B: {},
      crown_S: {},
      crown_K: {},
      crown_M: {},
      sucker_B: {},
      sucker_S: {},
      sucker_K: {},
      sucker_M: {},
      allLocations: {},
    };

    recs.forEach(d => {
      const isSucker = d.jenisBibit && d.jenisBibit.toLowerCase().includes('sucker');
      const prefix = isSucker ? 'sucker' : 'crown';

      const besar = d.besar || 0;
      const sedang = (d.sedang || 0) + (d.standar || 0);
      const kecil = d.kecil || 0;
      const rowTotal = d.total || (besar + sedang + kecil);

      totalHa += rowTotal;
      locationMap.allLocations[d.lokasi] = (locationMap.allLocations[d.lokasi] || 0) + rowTotal;

      if (besar > 0) {
        series[`${prefix}_B`] += besar;
        locationMap[`${prefix}_B`][d.lokasi] = (locationMap[`${prefix}_B`][d.lokasi] || 0) + besar;
      }
      if (sedang > 0) {
        series[`${prefix}_S`] += sedang;
        locationMap[`${prefix}_S`][d.lokasi] = (locationMap[`${prefix}_S`][d.lokasi] || 0) + sedang;
      }
      if (kecil > 0) {
        series[`${prefix}_K`] += kecil;
        locationMap[`${prefix}_K`][d.lokasi] = (locationMap[`${prefix}_K`][d.lokasi] || 0) + kecil;
      }
    });

    // Format locations
    const formatLocs = (map) => Object.keys(map).map(loc => ({
      lokasi: loc,
      luasHa: Number(map[loc].toFixed(2))
    })).sort((a, b) => b.luasHa - a.luasHa);

    return {
      monthKey: m.key,
      monthName: m.name,
      totalHa: Number(totalHa.toFixed(2)),
      crownTotal: Number((series.crown_B + series.crown_S + series.crown_K).toFixed(2)),
      suckerTotal: Number((series.sucker_B + series.sucker_S + series.sucker_K).toFixed(2)),
      series: {
        crown_B: Number(series.crown_B.toFixed(2)),
        crown_S: Number(series.crown_S.toFixed(2)),
        crown_K: Number(series.crown_K.toFixed(2)),
        crown_M: 0,
        sucker_B: Number(series.sucker_B.toFixed(2)),
        sucker_S: Number(series.sucker_S.toFixed(2)),
        sucker_K: Number(series.sucker_K.toFixed(2)),
        sucker_M: 0,
      },
      locations: {
        all: formatLocs(locationMap.allLocations),
        crown_B: formatLocs(locationMap.crown_B),
        crown_S: formatLocs(locationMap.crown_S),
        crown_K: formatLocs(locationMap.crown_K),
        crown_M: [],
        sucker_B: formatLocs(locationMap.sucker_B),
        sucker_S: formatLocs(locationMap.sucker_S),
        sucker_K: formatLocs(locationMap.sucker_K),
        sucker_M: [],
      }
    };
  });

  console.log(JSON.stringify(monthlyData.map(d => ({
    month: d.monthKey,
    total: d.totalHa,
    crown: d.crownTotal,
    sucker: d.suckerTotal,
    series: d.series,
    locationsCount: d.locations.all.length
  })), null, 2));

  await prisma.$disconnect();
}

main();
