const fs = require('fs');
const content = fs.readFileSync('C:/Users/HYPE AMD/.gemini/antigravity/brain/080fdd65-20c3-4564-b313-e142ca6f9367/lokasi_order_nov24.sql', 'utf8');

const rows = [];
const lines = content.split('\n');
let inCopy = false;

for (const line of lines) {
  if (line.startsWith('COPY public."LokasiOrderGorongGorong"')) {
    inCopy = true;
    continue;
  }
  if (inCopy) {
    if (line.startsWith('\\.') || !line.trim()) {
      inCopy = false;
      continue;
    }
    const cols = line.split('\t');
    rows.push({
      lokasi: cols[1],
      wilayah: cols[2],
      luas: parseFloat(cols[3]) || 0,
      statusTanaman: cols[4],
      umurBulan: parseInt(cols[5]) || 0,
      tanggalOrder: cols[6],
      statusAll: cols[11],
      isClosedExcel: cols[12] === 't',
      orderD40: parseInt(cols[14]) || 0,
      dropD40: parseInt(cols[15]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
      statusD40: cols[20],
      orderD60: parseInt(cols[21]) || 0,
      dropD60: parseInt(cols[22]) || 0,
      pasangManD60: parseInt(cols[24]) || 0,
      pasangSapD60: parseInt(cols[25]) || 0,
      statusD60: cols[26],
      orderD80: parseInt(cols[27]) || 0,
      dropD80: parseInt(cols[28]) || 0,
      pasangManD80: parseInt(cols[30]) || 0,
      pasangSapD80: parseInt(cols[31]) || 0,
      statusD80: cols[32],
      orderD100: parseInt(cols[33]) || 0,
      dropD100: parseInt(cols[34]) || 0,
      pasangManD100: parseInt(cols[36]) || 0,
      pasangSapD100: parseInt(cols[37]) || 0,
      statusD100: cols[38]
    });
  }
}

console.log('--- BEFORE SQL UPDATE ---');
function calcStats(rList) {
  let openSaldo40 = 0;
  let openDrop40 = 0;
  let openPasang40 = 0;
  let openFcHa40 = 0;

  for (const r of rList) {
    const isClose = (r.statusAll || '').trim().toLowerCase() === 'close' || (r.statusD40 || '').trim().toLowerCase() === 'close';
    if (isClose) continue;

    const psg = Math.max(r.pasangManD40, r.pasangSapD40);
    const sld = r.dropD40 - psg;
    openSaldo40 += sld;
    openDrop40 += r.dropD40;
    openPasang40 += psg;

    const isFC = (r.statusTanaman || '').toUpperCase() === 'FC' || (r.statusTanaman || '').toUpperCase().endsWith('FC');
    if (isFC) {
      openFcHa40 += (r.luas || 0);
    }
  }

  return {
    openSaldo40,
    openDrop40,
    openPasang40,
    pctPasang: openDrop40 > 0 ? (openPasang40 / openDrop40 * 100).toFixed(1) : 0,
    openFcHa40: openFcHa40.toFixed(2)
  };
}

console.log('Current stats:', calcStats(rows));

// Now simulate SQL UPDATE:
// UPDATE "LokasiOrderGorongGorong"
// SET "statusD40" = 'Close', "statusAll" = 'Close'
// WHERE "dropD40" <= GREATEST("pasangManD40", "pasangSapD40") AND "dropD40" > 0;
let updatedCount = 0;
for (const r of rows) {
  const pmax = Math.max(r.pasangManD40, r.pasangSapD40);
  if (r.dropD40 <= pmax && r.dropD40 > 0) {
    r.statusD40 = 'Close';
    r.statusAll = 'Close';
    updatedCount++;
  }
}

console.log('--- AFTER SQL UPDATE (updated ' + updatedCount + ' rows) ---');
console.log('New stats:', calcStats(rows));

