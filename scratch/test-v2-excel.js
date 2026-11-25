const XLSX = require('xlsx');
const wb = XLSX.readFile('Template_Upload_Monitor_Gorong_Gorong_Aktual_V2.xlsx');
const ws = wb.Sheets['Lokasi Order'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Total rows in sheet:', rows.length);

// Header is row 0 and 1, data starts row 2
let totalOrder40 = 0;
let totalDrop40 = 0;
let totalPasang40 = 0;
let totalSaldo40 = 0;
let openFcHa = 0;
let openOrder40 = 0;
let openDrop40 = 0;
let openPasang40 = 0;
let openSaldo40 = 0;

const byWil = {};

for (let i = 2; i < rows.length; i++) {
  const r = rows[i];
  if (!r || !r[0]) continue;
  const lok = String(r[0]).trim();
  if (!lok || lok === 'TOTAL' || lok.startsWith('TOTAL')) continue;

  const wil = r[1] ? String(r[1]).trim() : '';
  const luas = parseFloat(r[2]) || 0;
  const statusTanaman = r[3] ? String(r[3]).trim() : '';
  const tanggalOrder = r[5] ? String(r[5]).trim() : '';
  const statusAll = r[10] ? String(r[10]).trim() : '-';

  const ord40 = parseInt(r[12]) || 0;
  const drp40 = parseInt(r[13]) || 0;
  const pman40 = parseInt(r[15]) || 0;
  const psap40 = parseInt(r[16]) || 0;
  const pmax40 = Math.max(pman40, psap40);
  const status40 = r[17] ? String(r[17]).trim() : '-';
  const sld40 = drp40 - pmax40;

  totalOrder40 += ord40;
  totalDrop40 += drp40;
  totalPasang40 += pmax40;
  totalSaldo40 += sld40;

  const isClose = statusAll.toLowerCase() === 'close' || status40.toLowerCase() === 'close';
  if (!isClose) {
    openSaldo40 += sld40;
    openOrder40 += ord40;
    openDrop40 += drp40;
    openPasang40 += pmax40;

    const isFC = statusTanaman.toUpperCase() === 'FC' || statusTanaman.toUpperCase().endsWith('FC');
    if (isFC) openFcHa += luas;

    if (!byWil[wil]) byWil[wil] = { drop: 0, pasang: 0, order: 0 };
    byWil[wil].drop += drp40;
    byWil[wil].pasang += pmax40;
    byWil[wil].order += ord40;
  }
}

console.log({
  totalOrder40,
  totalDrop40,
  totalPasang40,
  totalSaldo40,
  openSaldo40,
  openOrder40,
  openDrop40,
  openPasang40,
  pctKedatangan: (openDrop40 / openOrder40 * 100).toFixed(1),
  pctPemasangan: (openPasang40 / openDrop40 * 100).toFixed(1),
  openFcHa: openFcHa.toFixed(2)
});

console.log('byWil:', byWil);

