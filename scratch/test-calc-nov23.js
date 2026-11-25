const fs = require('fs');

function parseSqlDump(path) {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  const rows = [];
  let inCopy = false;
  for (const line of lines) {
    if (line.includes('COPY public."LokasiOrderGorongGorong"')) {
      inCopy = true;
      continue;
    }
    if (inCopy) {
      if (line.startsWith('\\.') || !line.trim()) {
        inCopy = false;
        continue;
      }
      const c = line.split('\t');
      rows.push({
        lokasi: c[1],
        wilayah: c[2],
        luas: parseFloat(c[3]) || 0,
        statusTanaman: c[4],
        umurBulan: parseInt(c[5]) || 0,
        tanggalOrder: c[6],
        prioritas: c[10],
        statusAll: c[11],
        isClosedExcel: c[12] === 't',
        orderD40: parseInt(c[15]) || 0,
        dropD40: parseInt(c[16]) || 0,
        pasangManD40: parseInt(c[18]) || 0,
        pasangSapD40: parseInt(c[19]) || 0,
        statusD40: c[20],
        orderD60: parseInt(c[21]) || 0,
        dropD60: parseInt(c[22]) || 0,
        pasangManD60: parseInt(c[23]) || 0,
        pasangSapD60: parseInt(c[24]) || 0,
        statusD60: c[25],
        orderD80: parseInt(c[26]) || 0,
        dropD80: parseInt(c[27]) || 0,
        pasangManD80: parseInt(c[28]) || 0,
        pasangSapD80: parseInt(c[29]) || 0,
        statusD80: c[30],
        orderD100: parseInt(c[31]) || 0,
        dropD100: parseInt(c[32]) || 0,
        pasangManD100: parseInt(c[33]) || 0,
        pasangSapD100: parseInt(c[34]) || 0,
        statusD100: c[35],
      });
    }
  }
  return rows;
}

const rows23 = parseSqlDump('C:/Users/HYPE AMD/.gemini/antigravity/brain/080fdd65-20c3-4564-b313-e142ca6f9367/lokasi_order_nov23.sql');
const rows24 = parseSqlDump('C:/Users/HYPE AMD/.gemini/antigravity/brain/080fdd65-20c3-4564-b313-e142ca6f9367/lokasi_order_nov24.sql');
console.log('Rows in nov23:', rows23.length, 'Rows in nov24:', rows24.length);

function calc(rows) {
  let saldo = 0;
  let openOrd = 0;
  let openDrp = 0;
  let openPsg = 0;
  let fcLuas = 0;
  const wil = {};

  for (const r of rows) {
    const isClose = r.isClosedExcel || (r.statusAll || '').toLowerCase() === 'close';
    if (isClose) continue;

    const w = r.wilayah || 'Unknown';
    if (!wil[w]) wil[w] = { ord: 0, drp: 0, psg: 0, sld: 0 };

    for (const dia of [40, 60, 80, 100]) {
      const st = (r['statusD' + dia] || '-').trim().toLowerCase();
      if (st === 'open' || st === '-') {
        const o = r['orderD' + dia] || 0;
        const d = r['dropD' + dia] || 0;
        const pman = r['pasangManD' + dia] || 0;
        const psap = r['pasangSapD' + dia] || 0;
        const p = Math.max(pman, psap);
        const s = d - p;

        saldo += s;
        openOrd += o;
        openDrp += d;
        openPsg += p;

        wil[w].ord += o;
        wil[w].drp += d;
        wil[w].psg += p;
        wil[w].sld += s;
      }
    }

    const stTan = (r.statusTanaman || '').toUpperCase();
    const st40 = (r.statusD40 || '-').trim().toLowerCase();
    if (stTan.includes('FC') && (st40 === 'open' || st40 === '-')) {
      fcLuas += r.luas;
    }
  }

  return {
    saldo,
    openOrd,
    openDrp,
    openPsg,
    pctKedatangan: (openDrp / openOrd * 100).toFixed(1) + '%',
    pctPasang: (openPsg / openDrp * 100).toFixed(1) + '%',
    fcLuas: fcLuas.toFixed(2),
    wil
  };
}

console.log('=== Nov23 calculation ===');
console.log(JSON.stringify(calc(rows23), null, 2));
console.log('=== Nov24 calculation ===');
console.log(JSON.stringify(calc(rows24), null, 2));

