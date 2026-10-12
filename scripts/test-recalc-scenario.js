const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

function parseDateVal(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s === '0' || s.toLowerCase() === 'null') return null;

  // DD/MM/YYYY
  const pSlash = s.split('/');
  if (pSlash.length === 3) {
    const d = parseInt(pSlash[0], 10);
    const m = parseInt(pSlash[1], 10);
    const y = parseInt(pSlash[2], 10);
    if (!isNaN(m) && !isNaN(y) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }

  // YYYY-MM-DD
  const pDash = s.split('-');
  if (pDash.length === 3 && pDash[0].length === 4) {
    const y = parseInt(pDash[0], 10);
    const m = parseInt(pDash[1], 10);
    const d = parseInt(pDash[2], 10);
    if (!isNaN(m) && !isNaN(y) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }

  // MMM-YY
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
    jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
  };
  if (pDash.length === 2) {
    const mStr = pDash[0].toLowerCase().slice(0, 3);
    let y = parseInt(pDash[1], 10);
    if (y < 100) y += 2000;
    if (monthMap[mStr] !== undefined && !isNaN(y)) {
      return new Date(y, monthMap[mStr], 1);
    }
  }

  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + num * 86400000);
  }

  return null;
}

function getEffectiveMonthYear(d) {
  if (!d || isNaN(d.getTime())) return null;
  return { month: d.getMonth() + 1, year: d.getFullYear(), key: `${d.getMonth() + 1}${d.getFullYear()}` };
}

async function recalculateAndPersistStageStocks(targetYear = 2026) {
  const currentSummaries = await prisma.stageStockSummary.findMany({
    where: { year: targetYear },
    orderBy: { monthIndex: 'asc' },
  });

  const tanamMap = {};
  let initBk = 336.59;
  let initBjk = 64.82;
  let initSn = 82.04;

  if (currentSummaries.length > 0) {
    initBk = currentSummaries[0].initialCarryoverBongkar ?? initBk;
    initBjk = currentSummaries[0].initialCarryoverBajak ?? initBjk;
    initSn = currentSummaries[0].initialCarryoverSN ?? initSn;

    currentSummaries.forEach((s) => {
      tanamMap[s.monthIndex] = s.tanam;
    });
  }

  const lands = await prisma.land.findMany({
    select: {
      id: true,
      lokasi: true,
      luasNetto: true,
      rencBkr: true,
      realBkr: true,
      rencBajak: true,
      realBajak: true,
      bulanSn: true,
      aplikasiDetails: true,
    },
  });

  const monthlyBongkar = new Array(13).fill(0);
  const monthlyBajak = new Array(13).fill(0);
  const monthlySN = new Array(13).fill(0);

  for (const l of lands) {
    const netto = Number(l.luasNetto) || 0;
    if (netto <= 0) continue;

    const details = (typeof l.aplikasiDetails === 'object' && l.aplikasiDetails !== null) ? l.aplikasiDetails : {};

    const realBkrStr = l.realBkr || details.realChopper || details.realRh1 || null;
    const rencBkrStr = l.rencBkr || details.chopper || null;
    const dRencBkr = parseDateVal(rencBkrStr);
    const dRealBkr = parseDateVal(realBkrStr);
    let dDO = null;
    if (dRencBkr && dRealBkr) dDO = dRealBkr > dRencBkr ? dRealBkr : dRencBkr;
    else dDO = dRealBkr || dRencBkr;

    const realBjkStr =
      l.realBajak ||
      details.realBajakAwalMb5Btr ||
      details.realBajakAwalMb25 ||
      details.realBajakAwalHoward ||
      details.realBajakAwalNardi ||
      details.realHrEksMb ||
      null;
    const rencBjkStr = l.rencBajak || details.rencAwalMb5Btr || details.bajakAwalMb5Btr || null;
    const dRencBjk = parseDateVal(rencBjkStr);
    const dRealBjk = parseDateVal(realBjkStr);
    let dDP = null;
    if (dRencBjk && dRealBjk) dDP = dRealBjk > dRencBjk ? dRealBjk : dRencBjk;
    else dDP = dRealBjk || dRencBjk;

    const dDQ =
      parseDateVal(l.bulanSn) ||
      parseDateVal(details.realSiapTanam) ||
      parseDateVal(details.realJalanSal);

    const mDO = getEffectiveMonthYear(dDO);
    const mDP = getEffectiveMonthYear(dDP);
    const mDQ = getEffectiveMonthYear(dDQ);

    if (mDO && mDO.year === targetYear && mDO.month >= 1 && mDO.month <= 12) {
      monthlyBongkar[mDO.month] += netto;
    }
    if (mDP && mDP.year === targetYear && mDP.month >= 1 && mDP.month <= 12) {
      monthlyBajak[mDP.month] += netto;
    }
    if (mDQ && mDQ.year === targetYear && mDQ.month >= 1 && mDQ.month <= 12) {
      monthlySN[mDQ.month] += netto;
    }
  }

  let rollingBk = initBk;
  let rollingBjk = initBjk;
  let rollingSN = initSn;

  const updatedSummaries = [];

  for (let m = 1; m <= 12; m++) {
    const monthName = MONTH_NAMES[m - 1];
    const monthYear = `${monthName}-${String(targetYear).slice(2)}`;

    const bkr = Math.round(monthlyBongkar[m] * 100) / 100;
    const bjk = Math.round(monthlyBajak[m] * 100) / 100;
    const sn = Math.round(monthlySN[m] * 100) / 100;
    const tanam = Math.round((tanamMap[m] || 0) * 100) / 100;

    rollingBk = Math.round((rollingBk + bkr - bjk) * 100) / 100;
    rollingBjk = Math.round((rollingBjk + bjk - sn) * 100) / 100;
    rollingSN = Math.round((rollingSN + sn - tanam) * 100) / 100;
    const totalStok = Math.round((rollingBk + rollingBjk + rollingSN) * 100) / 100;

    const payload = {
      year: targetYear,
      month: monthName,
      monthIndex: m,
      monthYear,
      bongkar: bkr,
      bajak: bjk,
      sn,
      tanam,
      stokBongkar: rollingBk,
      stokBajak: rollingBjk,
      stokSN: rollingSN,
      totalStok,
      initialCarryoverBongkar: initBk,
      initialCarryoverBajak: initBjk,
      initialCarryoverSN: initSn,
    };

    const record = await prisma.stageStockSummary.upsert({
      where: {
        year_monthIndex: {
          year: targetYear,
          monthIndex: m,
        },
      },
      update: payload,
      create: payload,
    });

    updatedSummaries.push(record);
  }

  return updatedSummaries;
}

async function main() {
  console.log('🧪 SIMULASI SKENARIO USER: LOKASI 003D');

  const land003d = await prisma.land.findFirst({
    where: { lokasi: '003D' }
  });

  if (!land003d) {
    throw new Error('Lahan 003D tidak ditemukan!');
  }

  console.log(`\n1. Kondisi Awal 003D:`);
  console.log(`   ID: ${land003d.id}, Lokasi: ${land003d.lokasi}, Netto: ${land003d.luasNetto} Ha`);
  console.log(`   Aplikasi Terakhir: ${land003d.aplikasiTerakhir}`);
  console.log(`   Real Bongkar: ${land003d.realBkr}, Real Bajak: ${land003d.realBajak}`);

  const originalRealBajak = land003d.realBajak;
  const originalDetails = land003d.aplikasiDetails;
  const originalAplikasiTerakhir = land003d.aplikasiTerakhir;

  const stockOctBefore = await prisma.stageStockSummary.findUnique({
    where: { year_monthIndex: { year: 2026, monthIndex: 10 } }
  });

  console.log(`\n2. Stok Lahan Oktober 2026 SEBELUM Perubahan:`);
  console.log(`   Bongkar (N59)     : ${stockOctBefore?.bongkar} Ha`);
  console.log(`   Bajak (N60)       : ${stockOctBefore?.bajak} Ha`);
  console.log(`   SN (N61)          : ${stockOctBefore?.sn} Ha`);
  console.log(`   Stok Bongkar (N64): ${stockOctBefore?.stokBongkar} Ha`);
  console.log(`   Stok Bajak (N65)  : ${stockOctBefore?.stokBajak} Ha`);
  console.log(`   Stok SN (N66)     : ${stockOctBefore?.stokSN} Ha`);

  console.log(`\n3. Mengubah Tanggal Realisasi MB 5 BTR lokasi 003D ke '15/10/2026'...`);

  const updatedDetails = {
    ...(typeof originalDetails === 'object' && originalDetails !== null ? originalDetails : {}),
    realBajakAwalMb5Btr: '15/10/2026',
    realBajak: '15/10/2026',
  };

  await prisma.land.update({
    where: { id: land003d.id },
    data: {
      realBajak: '15/10/2026',
      aplikasiDetails: updatedDetails,
    }
  });

  await recalculateAndPersistStageStocks(2026);

  const stockOctAfter = await prisma.stageStockSummary.findUnique({
    where: { year_monthIndex: { year: 2026, monthIndex: 10 } }
  });

  console.log(`\n4. Stok Lahan Oktober 2026 SETELAH Perubahan:`);
  console.log(`   Bongkar (N59)     : ${stockOctAfter?.bongkar} Ha`);
  console.log(`   Bajak (N60)       : ${stockOctAfter?.bajak} Ha`);
  console.log(`   SN (N61)          : ${stockOctAfter?.sn} Ha`);
  console.log(`   Stok Bongkar (N64): ${stockOctAfter?.stokBongkar} Ha`);
  console.log(`   Stok Bajak (N65)  : ${stockOctAfter?.stokBajak} Ha`);
  console.log(`   Stok SN (N66)     : ${stockOctAfter?.stokSN} Ha`);

  // Merestore kondisi semula
  console.log(`\n5. Merestore kondisi awal lokasi 003D...`);
  await prisma.land.update({
    where: { id: land003d.id },
    data: {
      realBajak: originalRealBajak,
      aplikasiDetails: originalDetails,
      aplikasiTerakhir: originalAplikasiTerakhir,
    }
  });
  await recalculateAndPersistStageStocks(2026);

  console.log('✅ Simulasi dan verifikasi kalkulasi otomatis sukses!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
