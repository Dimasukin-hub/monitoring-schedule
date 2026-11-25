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

// Logic in bdcb6eb for KPI cards:
let saldoOpen2025_2026 = 0;
let openOrderSum = 0;
let openDropSum = 0;
let openPasangSum = 0;

for (const row of rows) {
  const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
  if (isPetakClosed) continue;

  const diaList = [
    { dia: 40, ord: row.orderD40, drop: row.dropD40, pman: row.pasangManD40, psap: row.pasangSapD40, status: row.statusD40 },
    { dia: 60, ord: row.orderD60, drop: row.dropD60, pman: row.pasangManD60, psap: row.pasangSapD60, status: row.statusD60 },
    { dia: 80, ord: row.orderD80, drop: row.dropD80, pman: row.pasangManD80, psap: row.pasangSapD80, status: row.statusD80 },
    { dia: 100, ord: row.orderD100, drop: row.dropD100, pman: row.pasangManD100, psap: row.pasangSapD100, status: row.statusD100 },
  ];

  for (const d of diaList) {
    if (d.dia !== 40) continue; // selected dia 40
    const st = (d.status || '-').trim().toLowerCase();
    const isOpen = st === 'open' || st === '-';
    if (isOpen) {
      const bestPasang = Math.max(d.pman, d.psap);
      const sld = d.drop - bestPasang;
      saldoOpen2025_2026 += sld;
      openOrderSum += d.ord;
      openDropSum += d.drop;
      openPasangSum += bestPasang;
    }
  }
}

const pctKedatangan = openOrderSum > 0 ? (openDropSum / openOrderSum) * 100 : 0;
const pctPemasangan = openDropSum > 0 ? (openPasangSum / openDropSum) * 100 : 0;

console.log({
  saldoOpen2025_2026,
  openOrderSum,
  openDropSum,
  openPasangSum,
  pctKedatangan: pctKedatangan.toFixed(1),
  pctPemasangan: pctPemasangan.toFixed(1)
});

