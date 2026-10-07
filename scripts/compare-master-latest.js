const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);

  const masterLatestMap = new Map();

  for (let r = 11; r <= range.e.r; r++) {
    const getCell = (c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;
    const rawLokasi = getCell(3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-' || rawLokasi === 1 || rawLokasi === '1' || rawLokasi === 'LOKASI') continue;
    const lokasi = String(rawLokasi).trim();

    let rawWilayah = getCell(2);
    let wilayah = rawWilayah ? String(rawWilayah).trim().toUpperCase() : null;
    let bruto = getCell(4) !== undefined && !isNaN(parseFloat(getCell(4))) ? parseFloat(getCell(4)) : null;
    let netto = getCell(5) !== undefined && !isNaN(parseFloat(getCell(5))) ? parseFloat(getCell(5)) : null;
    let sts = getCell(6) !== undefined ? String(getCell(6)).trim() : null;
    if (sts) {
      const cleaned = sts.replace(/\d+/g, '').trim();
      sts = cleaned || sts;
    }
    let eks = getCell(7) !== undefined ? String(getCell(7)).trim() : null;
    if (eks === '-' || eks === '0') eks = null;
    let sejarah = getCell(8) !== undefined ? String(getCell(8)).trim() : null;
    if (sejarah === '-' || sejarah === '0') sejarah = null;
    let phBk = getCell(9) !== undefined && !isNaN(parseFloat(getCell(9))) ? parseFloat(getCell(9)) : null;
    let phSn = getCell(10) !== undefined && !isNaN(parseFloat(getCell(10))) ? parseFloat(getCell(10)) : null;

    masterLatestMap.set(lokasi.toUpperCase(), {
      row: r + 1,
      lokasi,
      wilayah,
      luasBruto: bruto,
      luasNetto: netto,
      status: sts,
      eks,
      sejarah,
      phBk,
      phSn
    });
  }

  console.log('Total unique lokasi in Sheet Master:', masterLatestMap.size);

  const dbLands = await prisma.land.findMany();
  console.log('Total lands in DB:', dbLands.length);

  let matchCount = 0;
  let diffCount = 0;
  const sampleDiffs = [];

  for (const land of dbLands) {
    const master = masterLatestMap.get(land.lokasi.toUpperCase());
    if (master) {
      matchCount++;
      const diffs = [];
      if (master.wilayah && land.wilayah !== master.wilayah) {
        diffs.push(`wilayah: DB='${land.wilayah}' vs Master='${master.wilayah}'`);
      }
      if (master.luasBruto !== null && Math.abs((land.luasBruto || 0) - master.luasBruto) > 0.01) {
        diffs.push(`bruto: DB=${land.luasBruto} vs Master=${master.luasBruto}`);
      }
      if (master.luasNetto !== null && Math.abs((land.luasNetto || 0) - master.luasNetto) > 0.01) {
        diffs.push(`netto: DB=${land.luasNetto} vs Master=${master.luasNetto}`);
      }
      if (master.status && land.status !== master.status) {
        diffs.push(`status: DB='${land.status}' vs Master='${master.status}'`);
      }
      if ((land.eks || null) !== (master.eks || null)) {
        diffs.push(`eks: DB='${land.eks}' vs Master='${master.eks}'`);
      }
      if ((land.sejarah || null) !== (master.sejarah || null)) {
        diffs.push(`sejarah: DB='${land.sejarah}' vs Master='${master.sejarah}'`);
      }
      if ((land.phBk || null) !== (master.phBk || null)) {
        diffs.push(`phBk: DB=${land.phBk} vs Master=${master.phBk}`);
      }
      if ((land.phSn || null) !== (master.phSn || null)) {
        diffs.push(`phSn: DB=${land.phSn} vs Master=${master.phSn}`);
      }

      if (diffs.length > 0) {
        diffCount++;
        if (sampleDiffs.length < 10) {
          sampleDiffs.push({ lokasi: land.lokasi, diffs });
        }
      }
    }
  }

  console.log('DB Lands matched in Master:', matchCount);
  console.log('DB Lands with differences to Master (latest row):', diffCount);
  console.log('Sample differences (first 10):', JSON.stringify(sampleDiffs, null, 2));

  await prisma.$disconnect();
}

check().catch(console.error);
