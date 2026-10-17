const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');
const p = new PrismaClient();

function getYearFromBulanSn(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    if (val > 40000 && val < 60000) {
      return xlsx.SSF.parse_date_code(val).y;
    }
    const str = String(val);
    const m = str.match(/^(\d{1,2})(20\d{2})$/);
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

async function check() {
  const wb = xlsx.readFile(path.join(__dirname, '../excel/Schedule 2026 Update 09.xlsx'), { cellDates: false });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');

  const lands = await p.land.findMany({ where: { year: 2026 }, include: { activities: true } });
  console.log('Database Land count (year 2026):', lands.length);

  // Group Excel Master rows by lokasi and year
  const excel2026Map = new Map();

  for (let r = 9; r <= range.e.r; r++) {
    const lokVal = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v;
    if (!lokVal) continue;
    const lok = String(lokVal).trim();
    if (!lok || lok === '0' || lok === '-') continue;

    const bulanSnVal = ws[xlsx.utils.encode_cell({ r, c: 1 })]?.v;
    const yr = getYearFromBulanSn(bulanSnVal);

    const rowData = {
      r,
      wilayah: ws[xlsx.utils.encode_cell({ r, c: 2 })]?.v,
      lokasi: lok,
      bruto: parseFloat(ws[xlsx.utils.encode_cell({ r, c: 4 })]?.v) || 0,
      netto: parseFloat(ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v) || 0,
      sts: ws[xlsx.utils.encode_cell({ r, c: 6 })]?.v ? String(ws[xlsx.utils.encode_cell({ r, c: 6 })]?.v).trim() : null,
      eks: ws[xlsx.utils.encode_cell({ r, c: 7 })]?.v ? String(ws[xlsx.utils.encode_cell({ r, c: 7 })]?.v).trim() : null,
      sejarah: ws[xlsx.utils.encode_cell({ r, c: 8 })]?.v ? String(ws[xlsx.utils.encode_cell({ r, c: 8 })]?.v).trim() : null,
      phBk: typeof ws[xlsx.utils.encode_cell({ r, c: 9 })]?.v === 'number' ? ws[xlsx.utils.encode_cell({ r, c: 9 })]?.v : parseFloat(String(ws[xlsx.utils.encode_cell({ r, c: 9 })]?.v).replace(',', '.')) || null,
      phSn: typeof ws[xlsx.utils.encode_cell({ r, c: 10 })]?.v === 'number' ? ws[xlsx.utils.encode_cell({ r, c: 10 })]?.v : parseFloat(String(ws[xlsx.utils.encode_cell({ r, c: 10 })]?.v).replace(',', '.')) || null,
      year: yr,
    };

    if (yr === 2026) {
      excel2026Map.set(lok, rowData);
    }
  }

  console.log('Excel Master rows with year=2026:', excel2026Map.size);

  let exactMatchCount = 0;
  const issues = [];

  for (const l of lands) {
    const ex = excel2026Map.get(l.lokasi);
    if (!ex) {
      issues.push({ lokasi: l.lokasi, issue: 'Tidak ditemukan di Excel Master dengan year=2026' });
      continue;
    }

    const diffs = [];
    if (Math.abs(ex.netto - l.luasNetto) > 0.01) {
      diffs.push(`Netto: Excel=${ex.netto} vs DB=${l.luasNetto}`);
    }
    if (Math.abs(ex.bruto - l.luasBruto) > 0.01) {
      diffs.push(`Bruto: Excel=${ex.bruto} vs DB=${l.luasBruto}`);
    }
    if (ex.phBk !== null && l.phBk !== null && Math.abs(ex.phBk - l.phBk) > 0.01) {
      diffs.push(`pH BK: Excel=${ex.phBk} vs DB=${l.phBk}`);
    }
    if (ex.phSn !== null && l.phSn !== null && Math.abs(ex.phSn - l.phSn) > 0.01) {
      diffs.push(`pH SN: Excel=${ex.phSn} vs DB=${l.phSn}`);
    }
    if (ex.eks && l.eks && ex.eks !== l.eks) {
      diffs.push(`Eks: Excel=${ex.eks} vs DB=${l.eks}`);
    }
    if (ex.sejarah && l.sejarah && ex.sejarah !== l.sejarah) {
      diffs.push(`Sejarah: Excel=${ex.sejarah} vs DB=${l.sejarah}`);
    }

    if (diffs.length === 0) {
      exactMatchCount++;
    } else {
      issues.push({ lokasi: l.lokasi, diffs });
    }
  }

  console.log(`Matched with Excel Master (year=2026): ${exactMatchCount} of ${lands.length}`);
  if (issues.length > 0) {
    console.log('Issues found:', JSON.stringify(issues, null, 2));
  }
}

check()
  .catch(console.error)
  .finally(() => p.$disconnect());
