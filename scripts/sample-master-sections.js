const xlsx = require('xlsx');
const path = require('path');
const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx'), { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);
const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

console.log('Sample rows across the sheet to understand sections:');
const sampleIndices = [11, 200, 500, 1000, 1500, 1800, 2000, 2300, 2400];
for (const r of sampleIndices) {
  console.log('Row ' + (r + 1) + ':', {
    colA: getCell(r, 0),
    colB: getCell(r, 1),
    wilayah: getCell(r, 2),
    lokasi: getCell(r, 3),
    bruto: getCell(r, 4),
    netto: getCell(r, 5),
    status: getCell(r, 6),
    eks: getCell(r, 7),
    sejarah: getCell(r, 8),
    phBk: getCell(r, 9),
    phSn: getCell(r, 10),
  });
}
