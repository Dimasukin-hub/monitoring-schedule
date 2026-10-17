const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== START CROSS-CHECK STOK, LAND, AND EXCEL ===');

  // 1. Read Excel Schedule 2026 Update 09.xlsx sheet Master
  const excelPath = path.join(__dirname, '../excel/Schedule 2026 Update 09.xlsx');
  console.log('Reading Excel:', excelPath);
  const wb = xlsx.readFile(excelPath);
  const ws = wb.Sheets['Master'];
  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log('Total raw rows in Master sheet:', rawData.length);

  // Column mapping in sheet Master:
  // Col 2: Wilayah
  // Col 3: Lokasi
  // Col 4: Luas Bruto
  // Col 5: Luas Netto
  // Col 6: Status (STS)
  // Col 7: Eks
  // Col 8: Sejarah PS
  // Col 9: pH BK
  // Col 10: pH SN

  const excelMap = {};
  let validExcelRows = 0;

  for (let i = 10; i < rawData.length; i++) {
    const r = rawData[i];
    if (!r) continue;
    const lokasi = String(r[3] || '').trim();
    if (!lokasi || lokasi === '-' || lokasi === '0' || lokasi.toLowerCase() === 'lokasi') continue;

    const wilayah = String(r[2] || '').trim();
    const bruto = typeof r[4] === 'number' ? r[4] : parseFloat(String(r[4]).replace(/,/g, '.')) || 0;
    const netto = typeof r[5] === 'number' ? r[5] : parseFloat(String(r[5]).replace(/,/g, '.')) || 0;
    const status = r[6] !== undefined && r[6] !== null ? String(r[6]).trim() : '';
    const eks = r[7] !== undefined && r[7] !== null ? String(r[7]).trim() : '';
    const sejarah = r[8] !== undefined && r[8] !== null ? String(r[8]).trim() : '';
    const phBk = r[9] !== undefined && r[9] !== null && r[9] !== '' && r[9] !== '-' ? parseFloat(String(r[9]).replace(/,/g, '.')) || null : null;
    const phSn = r[10] !== undefined && r[10] !== null && r[10] !== '' && r[10] !== '-' ? parseFloat(String(r[10]).replace(/,/g, '.')) || null : null;

    excelMap[lokasi] = {
      rowIndex: i + 1,
      wilayah,
      lokasi,
      bruto,
      netto,
      status,
      eks,
      sejarah,
      phBk,
      phSn,
    };
    validExcelRows++;
  }

  console.log('Valid Excel locations count:', validExcelRows, 'Unique locations:', Object.keys(excelMap).length);

  // 2. Query Prisma Land (Data Lahan / Master)
  const allLands = await prisma.land.findMany();
  console.log('Database Land (Data Lahan) count:', allLands.length);
  const landMap = {};
  allLands.forEach((l) => {
    landMap[l.lokasi] = l;
  });

  // 3. Query Prisma StokLahanMaster (List Stok Lahan)
  const allStoks = await prisma.stokLahanMaster.findMany();
  console.log('Database StokLahanMaster (List Stok Lahan) count:', allStoks.length);
  const stokMap = {};
  allStoks.forEach((s) => {
    stokMap[s.lokasi] = s;
  });

  // 4. Compare Excel vs Land vs StokLahanMaster
  console.log('\n--- COMPARING EXCEL vs STOK LAHAN MASTER ---');
  let stokMatchCount = 0;
  let stokDiffCount = 0;
  const stokDiffs = [];

  for (const [lokasi, ex] of Object.entries(excelMap)) {
    const st = stokMap[lokasi];
    if (!st) {
      stokDiffCount++;
      stokDiffs.push({ lokasi, issue: 'Missing in StokLahanMaster' });
      continue;
    }

    const diffs = [];
    if (st.wilayah !== ex.wilayah) diffs.push(`wilayah: DB=${st.wilayah} vs EX=${ex.wilayah}`);
    if (Math.abs(st.luasBruto - ex.bruto) > 0.01) diffs.push(`bruto: DB=${st.luasBruto} vs EX=${ex.bruto}`);
    if (Math.abs(st.luasNetto - ex.netto) > 0.01) diffs.push(`netto: DB=${st.luasNetto} vs EX=${ex.netto}`);
    
    // Status comparison (check with / without digits)
    const stStatus = (st.status || '').trim();
    const exStatus = ex.status;
    if (stStatus !== exStatus && !exStatus.includes(stStatus) && !stStatus.includes(exStatus)) {
      diffs.push(`status: DB=${stStatus} vs EX=${exStatus}`);
    }

    const stEks = (st.eks || '').trim();
    const exEks = ex.eks;
    if (stEks !== exEks) diffs.push(`eks: DB=${stEks} vs EX=${exEks}`);

    const stSejarah = (st.sejarah || '').trim();
    const exSejarah = ex.sejarah;
    if (stSejarah !== exSejarah) diffs.push(`sejarah: DB=${stSejarah} vs EX=${exSejarah}`);

    if (ex.phBk !== null && st.phBk !== null && Math.abs(st.phBk - ex.phBk) > 0.05) {
      diffs.push(`phBk: DB=${st.phBk} vs EX=${ex.phBk}`);
    }
    if (ex.phSn !== null && st.phSn !== null && Math.abs(st.phSn - ex.phSn) > 0.05) {
      diffs.push(`phSn: DB=${st.phSn} vs EX=${ex.phSn}`);
    }

    if (diffs.length > 0) {
      stokDiffCount++;
      if (stokDiffs.length < 15) {
        stokDiffs.push({ lokasi, diffs });
      }
    } else {
      stokMatchCount++;
    }
  }

  console.log(`StokLahanMaster vs Excel: MATCH=${stokMatchCount}, MISMATCH/MISSING=${stokDiffCount}`);
  if (stokDiffs.length > 0) {
    console.log('Sample Stok differences:', JSON.stringify(stokDiffs.slice(0, 5), null, 2));
  }

  // 5. Compare Land (Data Lahan) vs Excel
  console.log('\n--- COMPARING EXCEL vs LAND (DATA LAHAN) ---');
  let landMatchCount = 0;
  let landDiffCount = 0;
  const landDiffs = [];

  for (const [lokasi, ex] of Object.entries(excelMap)) {
    const ld = landMap[lokasi];
    if (!ld) {
      landDiffCount++;
      landDiffs.push({ lokasi, issue: 'Missing in Land' });
      continue;
    }

    const diffs = [];
    if (ld.wilayah !== ex.wilayah) diffs.push(`wilayah: DB=${ld.wilayah} vs EX=${ex.wilayah}`);
    if (Math.abs(ld.luasBruto - ex.bruto) > 0.01) diffs.push(`bruto: DB=${ld.luasBruto} vs EX=${ex.bruto}`);
    if (Math.abs(ld.luasNetto - ex.netto) > 0.01) diffs.push(`netto: DB=${ld.luasNetto} vs EX=${ex.netto}`);
    
    const ldStatus = (ld.status || '').trim();
    const exStatus = ex.status;
    if (ldStatus !== exStatus && !exStatus.includes(ldStatus) && !ldStatus.includes(exStatus)) {
      diffs.push(`status: DB=${ldStatus} vs EX=${exStatus}`);
    }

    const ldEks = (ld.eks || '').trim();
    if (ldEks !== ex.eks) diffs.push(`eks: DB=${ldEks} vs EX=${ex.eks}`);

    const ldSejarah = (ld.sejarah || '').trim();
    if (ldSejarah !== ex.sejarah) diffs.push(`sejarah: DB=${ldSejarah} vs EX=${ex.sejarah}`);

    if (ex.phBk !== null && ld.phBk !== null && Math.abs(ld.phBk - ex.phBk) > 0.05) {
      diffs.push(`phBk: DB=${ld.phBk} vs EX=${ex.phBk}`);
    }
    if (ex.phSn !== null && ld.phSn !== null && Math.abs(ld.phSn - ex.phSn) > 0.05) {
      diffs.push(`phSn: DB=${ld.phSn} vs EX=${ex.phSn}`);
    }

    if (diffs.length > 0) {
      landDiffCount++;
      if (landDiffs.length < 15) {
        landDiffs.push({ lokasi, diffs });
      }
    } else {
      landMatchCount++;
    }
  }

  console.log(`Land (Data Lahan) vs Excel: MATCH=${landMatchCount}, MISMATCH/MISSING=${landDiffCount}`);
  if (landDiffs.length > 0) {
    console.log('Sample Land differences:', JSON.stringify(landDiffs.slice(0, 5), null, 2));
  }

  // 6. Compare Land vs StokLahanMaster
  console.log('\n--- COMPARING LAND vs STOK LAHAN MASTER ---');
  let dbMatchCount = 0;
  let dbDiffCount = 0;
  for (const ld of allLands) {
    const st = stokMap[ld.lokasi];
    if (!st) {
      dbDiffCount++;
      continue;
    }
    if (
      ld.wilayah === st.wilayah &&
      Math.abs(ld.luasBruto - st.luasBruto) < 0.01 &&
      Math.abs(ld.luasNetto - st.luasNetto) < 0.01
    ) {
      dbMatchCount++;
    } else {
      dbDiffCount++;
    }
  }
  console.log(`Land vs StokLahanMaster in DB: MATCH=${dbMatchCount}, MISMATCH=${dbDiffCount}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
