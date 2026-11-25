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
      id: cols[0],
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

console.log('Total rows loaded:', rows.length);

// Let's see all rows with their drop, pasang, and saldo
let countZeroOrNegSaldo = 0;
let countPosSaldo = 0;
let sumPosSaldo = 0;

for (const r of rows) {
  const pmax40 = Math.max(r.pasangManD40, r.pasangSapD40);
  const sld40 = r.dropD40 - pmax40;
  if (sld40 <= 0) countZeroOrNegSaldo++;
  else {
    countPosSaldo++;
    sumPosSaldo += sld40;
  }
}

console.log({ countZeroOrNegSaldo, countPosSaldo, sumPosSaldo });

