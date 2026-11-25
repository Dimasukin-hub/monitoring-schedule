const XLSX = require('xlsx');
const wb = XLSX.readFile('excel/Monitor Gorong-gorong PG1.xlsx');

console.log('=== Sheet List Close ===');
const wsClose = wb.Sheets['List Close'];
const closeRows = XLSX.utils.sheet_to_json(wsClose);
console.log('Total Close rows:', closeRows.length);
console.log('Sample close rows:', closeRows.slice(0, 5));

console.log('=== Sheet Summary ===');
const wsSummary = wb.Sheets['Summary'];
const summaryRows = XLSX.utils.sheet_to_json(wsSummary, { header: 1 });
for (let i = 0; i < Math.min(25, summaryRows.length); i++) {
  console.log(`Row ${i}:`, summaryRows[i]);
}

