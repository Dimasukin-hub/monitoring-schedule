const XLSX = require('xlsx');
const wb = XLSX.readFile('excel/Monitor Gorong-gorong PG1.xlsx');
const wsSum2 = wb.Sheets['Sum2'];
const sum2Rows = XLSX.utils.sheet_to_json(wsSum2, { header: 1 });
for (let i = 0; i < Math.min(30, sum2Rows.length); i++) {
  console.log(`Row ${i}:`, sum2Rows[i]);
}

