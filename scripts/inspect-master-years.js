const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');

let yearCounts = {
  chopperRenc: {},
  chopperReal: {},
  jalansalRenc: {},
  jalansalReal: {},
};

function getYear(val) {
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const d = xlsx.SSF.parse_date_code(val);
    return d.y;
  }
  return null;
}

for (let r = 11; r <= range.e.r; r++) {
  const chRenc = ws[xlsx.utils.encode_cell({ r, c: 13 })]?.v; // N
  const chReal = ws[xlsx.utils.encode_cell({ r, c: 74 })]?.v; // BW
  const jsRenc = ws[xlsx.utils.encode_cell({ r, c: 44 })]?.v; // AS
  const jsReal = ws[xlsx.utils.encode_cell({ r, c: 102 })]?.v; // CY
  
  const yChR = getYear(chRenc);
  if (yChR) yearCounts.chopperRenc[yChR] = (yearCounts.chopperRenc[yChR] || 0) + 1;
  const yChA = getYear(chReal);
  if (yChA) yearCounts.chopperReal[yChA] = (yearCounts.chopperReal[yChA] || 0) + 1;

  const yJsR = getYear(jsRenc);
  if (yJsR) yearCounts.jalansalRenc[yJsR] = (yearCounts.jalansalRenc[yJsR] || 0) + 1;
  const yJsA = getYear(jsReal);
  if (yJsA) yearCounts.jalansalReal[yJsA] = (yearCounts.jalansalReal[yJsA] || 0) + 1;
}

console.log('Year counts in Master:');
console.log(yearCounts);
