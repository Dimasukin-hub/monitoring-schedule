const xlsx = require('xlsx');
const path = require('path');

function inspect() {
  const f1 = path.join(__dirname, '..', 'excel', 'Monitor Siap Nanas Update.xlsx');
  const wb1 = xlsx.readFile(f1, { bookSheets: true });
  console.log('Monitor Siap Nanas Update.xlsx sheets:', wb1.SheetNames);

  const f2 = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb2 = xlsx.readFile(f2, { bookSheets: true });
  console.log('Schedule 2026 Update 09.xlsx sheets:', wb2.SheetNames);
}

inspect();
