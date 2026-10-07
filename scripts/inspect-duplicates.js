const xlsx = require('xlsx');
const path = require('path');
const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx'), { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);
const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

const targetLokasi = ['005D', '080D', '024B1', '049F1'];
for (let r = 11; r <= range.e.r; r++) {
  const lok = String(getCell(r, 3) || '').trim();
  if (targetLokasi.includes(lok)) {
    console.log('Row ' + (r + 1) + ':', {
      statusA: getCell(r, 0),
      colB: getCell(r, 1),
      wilayah: getCell(r, 2),
      lokasi: lok,
      bruto: getCell(r, 4),
      netto: getCell(r, 5),
      statusG: getCell(r, 6),
      eks: getCell(r, 7),
      sejarah: getCell(r, 8),
      phBk: getCell(r, 9),
      phSn: getCell(r, 10),
    });
  }
}
