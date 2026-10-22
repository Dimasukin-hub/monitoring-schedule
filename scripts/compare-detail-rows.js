const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const prisma = new PrismaClient();

async function check() {
  console.log('=== CHECKING ACTUAL ROW COUNTS ===');

  // 1. Check in DB
  const db001C = await prisma.plantingDetail.findMany({ where: { lokasi: '001C' } });
  console.log('DB 001C count:', db001C.length);

  const db002A2 = await prisma.plantingDetail.findMany({ where: { lokasi: '002A2' } });
  console.log('DB 002A2 count:', db002A2.length);

  const db001A = await prisma.plantingDetail.findMany({ where: { lokasi: '001A' } });
  console.log('DB 001A count:', db001A.length);

  const db002A1 = await prisma.plantingDetail.findMany({ where: { lokasi: '002A1' } });
  console.log('DB 002A1 count:', db002A1.length);

  // 2. Check in Monitor Siap Nanas Update.xlsx
  const wb1 = xlsx.readFile('excel/Monitor Siap Nanas Update.xlsx');
  const ws1 = wb1.Sheets['Input Real Tanam&Petik Nanas'];
  const d1 = xlsx.utils.sheet_to_json(ws1, { header: 1 });
  let ex1_001C = 0, ex1_002A2 = 0;
  for (let r = 6; r < d1.length; r++) {
    if (d1[r] && d1[r][1] === '001C') ex1_001C++;
    if (d1[r] && d1[r][1] === '002A2') ex1_002A2++;
  }
  console.log('In Monitor Siap Nanas Update.xlsx -> 001C rows:', ex1_001C);
  console.log('In Monitor Siap Nanas Update.xlsx -> 002A2 rows:', ex1_002A2);

  // 3. Check in 5. Monitoring Tanam PG1 (Jan - Jun)
  const wb2 = xlsx.readFile("excel/5. Monitoring Tanam PG1 Jan-Des'26.xlsx");
  const ws2 = wb2.Sheets['LKH'];
  const d2 = xlsx.utils.sheet_to_json(ws2, { header: 1 });
  let ex2_locCounts = {};
  for (let r = 1; r < d2.length; r++) {
    const loc = d2[r] && d2[r][3] ? String(d2[r][3]).trim() : '';
    const act = d2[r] && d2[r][6] ? String(d2[r][6]).toLowerCase() : '';
    if (act.includes('tanam')) {
      ex2_locCounts[loc] = (ex2_locCounts[loc] || 0) + 1;
    }
  }

  ['001A', '002A1', '001B1', '007A', '042F1'].forEach(l => {
    console.log('In LKH sheet -> ' + l + ' tanam rows:', ex2_locCounts[l] || 0);
  });

  await prisma.$disconnect();
}
check();
