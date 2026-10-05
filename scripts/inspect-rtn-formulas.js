const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false, cellFormula: true });
const ws = wb.Sheets['RTN'];

console.log('Row 5:');
console.log('c9 (Est. Sls):', ws['I5']);
console.log('c10 (% Prog):', ws['J5']);
console.log('c11 (Awal Tnm):', ws['K5']);
console.log('c12 (Leadtime):', ws['L5']);

console.log('\nRow 25:');
console.log('c9 (Est. Sls):', ws['I25']);
console.log('c10 (% Prog):', ws['J25']);
console.log('c11 (Awal Tnm):', ws['K25']);
console.log('c12 (Leadtime):', ws['L25']);

console.log('\nRow 364:');
console.log('c9 (Est. Sls):', ws['I364']);
console.log('c10 (% Prog):', ws['J364']);
console.log('c11 (Awal Tnm):', ws['K364']);
console.log('c12 (Leadtime):', ws['L364']);
