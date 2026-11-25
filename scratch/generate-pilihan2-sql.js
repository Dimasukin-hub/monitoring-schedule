const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

const closeD40 = [];
const closeAll = [];

for (const [k, v] of Object.entries(snap)) {
  const lok = k.trim().toUpperCase();
  if (v.statusD40 && v.statusD40.trim().toLowerCase() === 'close') {
    closeD40.push(lok);
  }
  if (v.statusAll && v.statusAll.trim().toLowerCase() === 'close') {
    closeAll.push(lok);
  }
}

// Generate SQL
const sqlD40List = closeD40.map(l => `'${l}'`).join(', ');
const sqlAllList = closeAll.map(l => `'${l}'`).join(', ');

const fullSql = `BEGIN;

-- 1. Update status diameter 40 menjadi 'Close' sesuai daftar petak selesai asli Admin (${closeD40.length} petak)
UPDATE "LokasiOrderGorongGorong"
SET "statusD40" = 'Close'
WHERE UPPER(TRIM("lokasi")) IN (
  ${sqlD40List}
);

-- 2. Update status All menjadi 'Close' sesuai daftar petak selesai asli Admin (${closeAll.length} petak)
UPDATE "LokasiOrderGorongGorong"
SET "statusAll" = 'Close', "isClosedExcel" = true
WHERE UPPER(TRIM("lokasi")) IN (
  ${sqlAllList}
);

COMMIT;`;

fs.writeFileSync('scratch/pilihan2_update.sql', fullSql, 'utf8');
console.log('SQL generated. Length:', fullSql.length);

