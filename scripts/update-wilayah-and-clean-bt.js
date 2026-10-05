const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const prisma = new PrismaClient();

async function updateWilayahAndCleanBT() {
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const sheet = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(sheet['!ref']);
  const getCell = (r, c) => sheet[xlsx.utils.encode_cell({ r, c })]?.v;

  function parseYear(val) {
    if (val === undefined || val === null || val === '' || val === '-') return null;
    if (typeof val === 'number') {
      if (val > 40000 && val < 60000) return xlsx.SSF.parse_date_code(val).y;
      const m = String(val).match(/^(\d{1,2})(20\d{2})$/);
      if (m) return parseInt(m[2], 10);
      return null;
    }
    const s = String(val).trim();
    const mMatch = s.match(/^(\d{1,2})(20\d{2})$/);
    if (mMatch) return parseInt(mMatch[2], 10);
    const m = s.match(/(20\d{2})/);
    if (m) return parseInt(m[1], 10);
    return null;
  }
  function parseYearFromStatus(val) {
    if (!val || typeof val !== 'string') return null;
    const m = val.match(/(\d{2})/);
    if (m) {
      const yy = parseInt(m[1], 10);
      if (yy >= 15 && yy <= 35) return 2000 + yy;
    }
    return null;
  }

  const excelRecords = [];
  for (let r = 11; r <= range.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1') continue;

    const bt = parseYear(getCell(r, 53));
    const slsReal = parseYear(getCell(105));
    const slsRenc = parseYear(getCell(48));
    const mliReal = parseYear(getCell(104));
    const mliRenc = parseYear(getCell(47));
    const bkrReal = parseYear(getCell(72));
    const bkrRenc = parseYear(getCell(11));
    const stsRaw = getCell(r, 6);
    const stsYear = parseYearFromStatus(stsRaw);
    const snYear = parseYear(getCell(1)) || parseYear(getCell(52));
    const cycleYear = bt || slsReal || slsRenc || mliReal || mliRenc || stsYear || bkrReal || bkrRenc || snYear;

    if (!cycleYear || cycleYear < 2021 || cycleYear > 2028) continue;
    let rawWilayah = (getCell(r, 2) ? String(getCell(r, 2)).trim().toUpperCase() : '');
    excelRecords.push({ lokasi: String(rawLokasi).trim(), rawWilayah, year: cycleYear });
  }

  const dbLands = await prisma.land.findMany({ orderBy: { id: 'asc' }, select: { id: true, lokasi: true, wilayah: true, year: true } });

  console.log('Updating wilayah for lands...');
  let updatedWilayah = 0;
  for (let i = 0; i < dbLands.length; i++) {
    const db = dbLands[i];
    const ex = excelRecords[i];
    if (ex.rawWilayah && ex.rawWilayah !== db.wilayah) {
      await prisma.land.update({
        where: { id: db.id },
        data: { wilayah: ex.rawWilayah },
      });
      updatedWilayah++;
    }
  }
  console.log('Updated ' + updatedWilayah + ' lands with exact raw wilayah.');

  // Clean Sep-14 and 11900
  const cleanBT = await prisma.land.updateMany({
    where: {
      OR: [
        { bulanTanam: { contains: '14' } },
        { bulanTanam: '11900' },
      ],
    },
    data: { bulanTanam: null },
  });
  console.log('Cleaned ' + cleanBT.count + ' lands with invalid bulanTanam.');

  const distinctWil = await prisma.land.findMany({
    select: { wilayah: true },
    distinct: ['wilayah'],
    orderBy: { wilayah: 'asc' },
  });
  console.log('New distinct Wilayah in DB:', distinctWil.map(w => w.wilayah));

  const distinctBT = await prisma.land.findMany({
    where: { bulanTanam: { not: null } },
    select: { bulanTanam: true },
    distinct: ['bulanTanam'],
    orderBy: { bulanTanam: 'asc' },
  });
  console.log('New distinct Bulan Tanam in DB:', distinctBT.map(b => b.bulanTanam));

  process.exit(0);
}

updateWilayahAndCleanBT();
