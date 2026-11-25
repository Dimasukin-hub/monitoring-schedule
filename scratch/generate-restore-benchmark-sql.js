const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

const entries = Object.values(snap);
console.log('Total entries:', entries.length);

const lines = [];
lines.push('BEGIN;');
lines.push('TRUNCATE "LokasiOrderGorongGorong";');

for (const item of entries) {
  const lok = (item.lokasi || '').trim().toUpperCase();
  if (!lok || lok === 'LOKASI' || lok === 'TOTAL' || lok.startsWith('TOTAL')) continue;

  const escapeStr = (val) => {
    if (val === null || val === undefined) return 'NULL';
    const s = String(val).trim().replace(/'/g, "''");
    return s === '' ? 'NULL' : `'${s}'`;
  };

  const numVal = (val, def = 0) => {
    if (val === null || val === undefined || isNaN(Number(val))) return def;
    return Number(val);
  };

  const boolVal = (val) => val === true ? 'true' : 'false';

  const sql = `INSERT INTO "LokasiOrderGorongGorong" (
    "lokasi", "wilayah", "luas", "statusTanaman", "umurBulan", "tanggalOrder",
    "aktBk", "dsmBk", "dsmSt", "prioritas", "statusAll", "isClosedExcel",
    "ratioPerHa", "keteranganClose",
    "orderD40", "dropD40", "tglDropD40", "pindahD40", "pasangManD40", "pasangSapD40", "statusD40",
    "orderD60", "dropD60", "pindahD60", "pasangManD60", "pasangSapD60", "statusD60",
    "orderD80", "dropD80", "pindahD80", "pasangManD80", "pasangSapD80", "statusD80",
    "orderD100", "dropD100", "pindahD100", "pasangManD100", "pasangSapD100", "statusD100",
    "createdAt", "updatedAt"
  ) VALUES (
    ${escapeStr(lok)},
    ${escapeStr(item.wilayah)},
    ${numVal(item.luas, 0)},
    ${escapeStr(item.statusTanaman)},
    ${numVal(item.umurBulan, 0)},
    ${escapeStr(item.tanggalOrder)},
    ${escapeStr(item.aktBk)},
    ${escapeStr(item.dsmBk)},
    ${escapeStr(item.dsmSt)},
    ${escapeStr(item.prioritas)},
    ${escapeStr(item.statusAll || '-')},
    ${boolVal(item.isClosedExcel)},
    ${numVal(item.ratioPerHa, 'NULL')},
    ${escapeStr(item.keteranganClose)},
    ${numVal(item.orderD40, 0)},
    ${numVal(item.dropD40, 0)},
    ${escapeStr(item.tglDropD40)},
    ${numVal(item.pindahD40, 0)},
    ${numVal(item.pasangManD40, 0)},
    ${numVal(item.pasangSapD40, 0)},
    ${escapeStr(item.statusD40 || '-')},
    ${numVal(item.orderD60, 0)},
    ${numVal(item.dropD60, 0)},
    ${numVal(item.pindahD60, 0)},
    ${numVal(item.pasangManD60, 0)},
    ${numVal(item.pasangSapD60, 0)},
    ${escapeStr(item.statusD60 || '-')},
    ${numVal(item.orderD80, 0)},
    ${numVal(item.dropD80, 0)},
    ${numVal(item.pindahD80, 0)},
    ${numVal(item.pasangManD80, 0)},
    ${numVal(item.pasangSapD80, 0)},
    ${escapeStr(item.statusD80 || '-')},
    ${numVal(item.orderD100, 0)},
    ${numVal(item.dropD100, 0)},
    ${numVal(item.pindahD100, 0)},
    ${numVal(item.pasangManD100, 0)},
    ${numVal(item.pasangSapD100, 0)},
    ${escapeStr(item.statusD100 || '-')},
    NOW(), NOW()
  );`;
  lines.push(sql);
}

lines.push('COMMIT;');
fs.writeFileSync('scratch/restore_benchmark_lokasi_order.sql', lines.join('\n'), 'utf8');
console.log('Done generating restore_benchmark_lokasi_order.sql. Total lines:', lines.length);

