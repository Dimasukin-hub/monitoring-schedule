const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- MASTER DATA SAMPLE (Rows 10 to 18) ---');
for (let r = 8; r <= 16; r++) {
  let rowObj = {
    row: r + 1,
    lokasi: ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v,
    netto: ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v,
    chopper_N: ws[xlsx.utils.encode_cell({ r, c: 13 })]?.v,
    kompos_W: ws[xlsx.utils.encode_cell({ r, c: 22 })]?.v,
    mb5btr_Z: ws[xlsx.utils.encode_cell({ r, c: 25 })]?.v,
    ridger_AR: ws[xlsx.utils.encode_cell({ r, c: 43 })]?.v,
    jalansal_AS: ws[xlsx.utils.encode_cell({ r, c: 44 })]?.v,
  };
  console.log(rowObj);
}
