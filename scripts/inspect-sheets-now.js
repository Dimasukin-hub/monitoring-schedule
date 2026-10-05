const xlsx = require('xlsx');
const path = require('path');
const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { bookSheets: true });
console.log('Sheets found:', wb.SheetNames);
