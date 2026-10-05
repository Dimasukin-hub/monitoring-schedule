const { execSync } = require('child_process');
try {
  const out = execSync('powershell "Get-Process node | Select-Object Id, Path"').toString();
  console.log(out);
} catch (e) {
  console.error(e);
}
