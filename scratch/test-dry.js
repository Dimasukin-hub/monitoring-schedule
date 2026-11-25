const fs = require('fs');
const raw = fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8');
const snap = JSON.parse(raw);
const entries = Object.values(snap).filter(item => item && item.lokasi && !item.lokasi.startsWith('TOTAL'));

const data = entries.map(item => ({
  lokasi: item.lokasi.trim().toUpperCase(),
  wilayah: item.wilayah || null,
  luas: item.luas != null ? Number(item.luas) : null,
  statusTanaman: item.statusTanaman || null,
  umurBulan: item.umurBulan != null ? Number(item.umurBulan) : null,
  tanggalOrder: item.tanggalOrder || null,
  aktBk: item.aktBk || null,
  dsmBk: item.dsmBk || null,
  dsmSt: item.dsmSt || null,
  prioritas: item.prioritas || null,
  statusAll: item.statusAll || '-',
  isClosedExcel: item.statusAll === 'Close',
  ratioPerHa: item.ratioPerHa != null ? Number(item.ratioPerHa) : null,
  keteranganClose: item.keteranganClose || null,
  orderD40: item.orderD40 || 0,
  dropD40: item.dropD40 || 0,
  tglDropD40: item.tglDropD40 || null,
  pindahD40: item.pindahD40 || 0,
  pasangManD40: item.pasangManD40 || 0,
  pasangSapD40: item.pasangSapD40 || 0,
  statusD40: item.statusD40 || '-',
  orderD60: item.orderD60 || 0,
  dropD60: item.dropD60 || 0,
  pindahD60: item.pindahD60 || 0,
  pasangManD60: item.pasangManD60 || 0,
  pasangSapD60: item.pasangSapD60 || 0,
  statusD60: item.statusD60 || '-',
  orderD80: item.orderD80 || 0,
  dropD80: item.dropD80 || 0,
  pindahD80: item.pindahD80 || 0,
  pasangManD80: item.pasangManD80 || 0,
  pasangSapD80: item.pasangSapD80 || 0,
  statusD80: item.statusD80 || '-',
  orderD100: item.orderD100 || 0,
  dropD100: item.dropD100 || 0,
  pindahD100: item.pindahD100 || 0,
  pasangManD100: item.pasangManD100 || 0,
  pasangSapD100: item.pasangSapD100 || 0,
  statusD100: item.statusD100 || '-',
}));

console.log('Sample parsed item:', data[0]);
console.log('Total items parsed without error:', data.length);

