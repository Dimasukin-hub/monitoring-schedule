const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const wb = xlsx.readFile('excel/Schedule 2026 Update 09.xlsx');
  const ws = wb.Sheets['Master'];
  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });

  // Get all StokLahanMaster records
  const stoks = await prisma.stokLahanMaster.findMany();
  console.log('Total StokLahanMaster records:', stoks.length);

  // Get all Land records
  const lands = await prisma.land.findMany();
  const landMap = new Map(lands.map((l) => [l.lokasi, l]));
  console.log('Total Land records in DB:', lands.length);

  // Find corresponding rows in Excel for these 210 locations
  let exactMatchStokExcel = 0;
  let exactMatchStokLand = 0;
  const issues = [];
  const statusDiffs = [];

  for (const st of stoks) {
    // Find in Excel with Bulan SN 2026
    let exRow = null;
    for (let i = 11; i < rawData.length; i++) {
      const r = rawData[i];
      if (!r || !r[3]) continue;
      if (String(r[3]).trim().toUpperCase() === st.lokasi.toUpperCase()) {
        const b = r[1];
        let is26 = false;
        if (typeof b === 'number' && b > 40000 && b < 60000) {
          const d = xlsx.SSF.parse_date_code(b);
          if (d && d.y === 2026) is26 = true;
        } else if (typeof b === 'string' && (b.endsWith('-26') || b.includes('26'))) {
          is26 = true;
        }
        if (is26) {
          exRow = r;
          break;
        }
      }
    }

    if (!exRow) {
      // Find any row for this location
      for (let i = 11; i < rawData.length; i++) {
        const r = rawData[i];
        if (r && r[3] && String(r[3]).trim().toUpperCase() === st.lokasi.toUpperCase()) {
          exRow = r;
        }
      }
    }

    if (!exRow) {
      issues.push({ lokasi: st.lokasi, err: 'Not found in Excel Sheet Master' });
      continue;
    }

    // Compare with Excel
    const exWilayah = String(exRow[2] || '').trim();
    const exBruto = typeof exRow[4] === 'number' ? exRow[4] : parseFloat(String(exRow[4]).replace(/,/g, '.')) || 0;
    const exNetto = typeof exRow[5] === 'number' ? exRow[5] : parseFloat(String(exRow[5]).replace(/,/g, '.')) || 0;
    const exSts = String(exRow[6] || '').trim();
    const exEks = String(exRow[7] || '').trim();
    const exSejarah = String(exRow[8] || '').trim();
    const exPhBk = exRow[9] !== undefined && exRow[9] !== null && exRow[9] !== '' && exRow[9] !== '-' ? parseFloat(String(exRow[9]).replace(/,/g, '.')) : null;
    const exPhSn = exRow[10] !== undefined && exRow[10] !== null && exRow[10] !== '' && exRow[10] !== '-' ? parseFloat(String(exRow[10]).replace(/,/g, '.')) : null;

    const diffs = [];
    if (st.wilayah !== exWilayah) diffs.push(`wilayah: DB=${st.wilayah} vs EX=${exWilayah}`);
    if (Math.abs(st.luasBruto - exBruto) > 0.01) diffs.push(`bruto: DB=${st.luasBruto} vs EX=${exBruto}`);
    if (Math.abs(st.luasNetto - exNetto) > 0.01) diffs.push(`netto: DB=${st.luasNetto} vs EX=${exNetto}`);
    
    // Check status
    if (st.status !== exSts) {
      statusDiffs.push({ lokasi: st.lokasi, dbStatus: st.status, exStatus: exSts });
    }
    if ((st.eks || '') !== exEks) diffs.push(`eks: DB=${st.eks} vs EX=${exEks}`);
    if ((st.sejarah || '') !== exSejarah) diffs.push(`sejarah: DB=${st.sejarah} vs EX=${exSejarah}`);
    if (exPhBk !== null && st.phBk !== null && Math.abs(st.phBk - exPhBk) > 0.05) diffs.push(`phBk: DB=${st.phBk} vs EX=${exPhBk}`);
    if (exPhSn !== null && st.phSn !== null && Math.abs(st.phSn - exPhSn) > 0.05) diffs.push(`phSn: DB=${st.phSn} vs EX=${exPhSn}`);

    if (diffs.length === 0) exactMatchStokExcel++;
    else if (issues.length < 10) issues.push({ lokasi: st.lokasi, diffs });

    // Compare with Land
    const ld = landMap.get(st.lokasi);
    if (ld) {
      const landDiffs = [];
      if (ld.wilayah !== st.wilayah) landDiffs.push(`wilayah: Land=${ld.wilayah} vs Stok=${st.wilayah}`);
      if (Math.abs(ld.luasBruto - st.luasBruto) > 0.01) landDiffs.push(`bruto: Land=${ld.luasBruto} vs Stok=${st.luasBruto}`);
      if (Math.abs(ld.luasNetto - st.luasNetto) > 0.01) landDiffs.push(`netto: Land=${ld.luasNetto} vs Stok=${st.luasNetto}`);
      if ((ld.eks || '') !== (st.eks || '')) landDiffs.push(`eks: Land=${ld.eks} vs Stok=${st.eks}`);
      if ((ld.sejarah || '') !== (st.sejarah || '')) landDiffs.push(`sejarah: Land=${ld.sejarah} vs Stok=${st.sejarah}`);
      if (landDiffs.length === 0) exactMatchStokLand++;
    }
  }

  console.log(`StokLahanMaster vs Excel (2026 cycle): ${exactMatchStokExcel} of ${stoks.length} exact match on Wilayah, Bruto, Netto, Eks, Sejarah, pH BK, pH SN`);
  console.log(`Status format diffs (e.g. stripped digits): ${statusDiffs.length}`);
  if (statusDiffs.length > 0) {
    console.log('Sample status format comparison:', statusDiffs.slice(0, 5));
  }
  console.log(`StokLahanMaster vs Land (Data Lahan in DB): ${exactMatchStokLand} of ${stoks.length} exact match`);
  if (issues.length > 0) {
    console.log('Differences found:', JSON.stringify(issues, null, 2));
  }

  await prisma.$disconnect();
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
