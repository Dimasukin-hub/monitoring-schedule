const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['RTN'];
const range = xlsx.utils.decode_range(ws['!ref']);
const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

for (let r = 5; r <= range.e.r; r++) {
  const loc = getCell(r, 3);
  if (!loc || loc === 'Total') continue;
  const progress = getCell(r, 10);
  const awalTnm = getCell(r, 11);
  const leadtime = getCell(r, 12);
  
  if (progress !== undefined || awalTnm !== undefined || leadtime !== undefined) {
    console.log(`Row ${r} [${loc}]: Prog=${progress} AwalTnm=${awalTnm} Leadtime=${leadtime}`);
  }
}
