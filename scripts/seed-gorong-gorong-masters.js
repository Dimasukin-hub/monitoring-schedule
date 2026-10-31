const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// Helper untuk konversi serial date Excel ke JavaScript Date
function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const date = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Helper ekstraksi diameter dari deskripsi bahan SAP
function detectDiameter(text) {
  if (!text) return 40;
  const str = String(text);
  if (str.includes('100')) return 100;
  if (str.includes('80')) return 80;
  if (str.includes('60')) return 60;
  return 40;
}

async function main() {
  console.log('🚀 Memulai Seeding & Sinkronisasi Master Data Gorong-Gorong...');

  const excelDir = path.join(__dirname, '..', 'excel');

  // ==========================================
  // 1. MEMBACA FILE PENDUKUNG (JENIS & KELAS, PROD 2026, PROD 2027)
  // ==========================================
  console.log('\n📖 [1/5] Membaca file pendukung: Jenis & Kelas, Produksi 2026, dan Produksi 2027...');

  // A. Mapping Bibit -> Kelas & Jenis dan Hari Forcing
  const bibitMap = new Map();
  const hariForcingMap = new Map();

  const fileJK = path.join(excelDir, 'Jenis & Kelas.xlsx');
  const wbJK = XLSX.readFile(fileJK);
  const wsJK = wbJK.Sheets[wbJK.SheetNames[0]];

  // Baca tabel Hari Forcing (baris 3 s/d 7)
  for (let r = 3; r <= 8; r++) {
    const sts = wsJK['B' + r] ? String(wsJK['B' + r].v).trim() : '';
    const kls = wsJK['C' + r] ? String(wsJK['C' + r].v).trim() : '';
    const hari = wsJK['D' + r] ? Number(wsJK['D' + r].v) : null;
    if (sts && hari) {
      if (kls) {
        hariForcingMap.set(sts + kls, hari);
      } else {
        hariForcingMap.set(sts, hari);
      }
    }
  }

  // Baca tabel Bibit -> Kelas & Jenis (baris 11 s/d 25)
  for (let r = 11; r <= 30; r++) {
    const bibit = wsJK['B' + r] ? String(wsJK['B' + r].v).trim() : '';
    const kls = wsJK['C' + r] ? String(wsJK['C' + r].v).trim() : '';
    const jns = wsJK['D' + r] ? String(wsJK['D' + r].v).trim() : '';
    if (bibit) {
      bibitMap.set(bibit, { kelas: kls, jenis: jns });
    }
  }
  console.log(`   ✓ Terbaca ${bibitMap.size} aturan bibit dan ${hariForcingMap.size} aturan hari forcing.`);

  // B. Data Forcing Produksi 2026
  const prod26Map = new Map();
  const fileP26 = path.join(excelDir, 'Update Produksi 2026 PG1 New 27 Okt 2026 .xlsx');
  const wbP26 = XLSX.readFile(fileP26);
  const wsP26 = wbP26.Sheets[wbP26.SheetNames[0]];

  for (let r = 9; r <= 2000; r++) {
    const lok = wsP26['J' + r] ? String(wsP26['J' + r].v).trim() : '';
    const sts = wsP26['K' + r] ? String(wsP26['K' + r].v).trim() : '';
    const tgl = wsP26['V' + r] ? parseExcelDate(wsP26['V' + r].v) : null;
    if (lok) {
      prod26Map.set(lok + '-' + sts, tgl);
      if (!prod26Map.has(lok)) prod26Map.set(lok, tgl);
    }
  }
  console.log(`   ✓ Terbaca ${prod26Map.size} jadwal forcing 2026.`);

  // C. Data Forcing Produksi 2027
  const prod27Map = new Map();
  const fileP27 = path.join(excelDir, 'update prod 2027 per 27 Oktober 2026 .xlsx');
  const wbP27 = XLSX.readFile(fileP27);
  const wsP27 = wbP27.Sheets[wbP27.SheetNames[0]];

  for (let r = 9; r <= 2000; r++) {
    const lok = wsP27['G' + r] ? String(wsP27['G' + r].v).trim() : '';
    const sts = wsP27['H' + r] ? String(wsP27['H' + r].v).trim() : '';
    const ket = wsP27['O' + r] ? String(wsP27['O' + r].v).trim() : 'rcn';
    const tgl = wsP27['S' + r] ? parseExcelDate(wsP27['S' + r].v) : null;
    if (lok) {
      prod27Map.set(lok + '-' + sts, { tgl, ket });
      if (!prod27Map.has(lok)) prod27Map.set(lok, { tgl, ket });
    }
  }
  console.log(`   ✓ Terbaca ${prod27Map.size} jadwal forcing 2027.`);

  // ==========================================
  // 2. SEED MASTER STATUS LOKASI (24 KOLOM)
  // ==========================================
  console.log('\n📍 [2/5] Memproses & Menyimpan Master Status Lokasi (24 Kolom)...');
  const fileStatus = path.join(excelDir, 'Status Lokasi PG1.xlsx');
  const wbStatus = XLSX.readFile(fileStatus);
  const wsStatus = wbStatus.Sheets[wbStatus.SheetNames[0]];

  const statusLokasiList = [];
  for (let r = 5; r <= 3000; r++) {
    const cellB = wsStatus['B' + r];
    if (!cellB || !cellB.v) continue;

    const lokasi = String(cellB.v).trim();
    const strucPlant = wsStatus['C' + r] ? String(wsStatus['C' + r].v).trim() : null;
    const wil = strucPlant; // Kolom C adalah Struc Plant (e.g. AW01, AW02) yang merupakan wilayah
    const statusLengkap = wsStatus['D' + r] ? String(wsStatus['D' + r].v).trim() : null;
    const status = statusLengkap ? statusLengkap.substring(0, 4) : null;
    const luasBruto = wsStatus['E' + r] ? Number(wsStatus['E' + r].v) : null;
    const luasAktif = wsStatus['F' + r] ? Number(wsStatus['F' + r].v) : null;
    const luasNetto = wsStatus['G' + r] ? Number(wsStatus['G' + r].v) : null;
    const bibit = wsStatus['H' + r] ? String(wsStatus['H' + r].v).trim() : null;
    const perubahanSts = wsStatus['I' + r] ? String(wsStatus['I' + r].v).trim() : null;
    const tglRawat = wsStatus['J' + r] ? parseExcelDate(wsStatus['J' + r].v) : null;
    const hari = wsStatus['M' + r] ? Number(wsStatus['M' + r].v) : null;
    const bulan = wsStatus['N' + r] ? Number(wsStatus['N' + r].v) : null;
    const umurBulan = wsStatus['X' + r] ? Number(wsStatus['X' + r].v) : null;
    const umurRawat = umurBulan;

    // Mapping Kelas & Jenis dari Bibit
    let kelas = wsStatus['R' + r] ? String(wsStatus['R' + r].v).trim() : null;
    let jenis = wsStatus['S' + r] ? String(wsStatus['S' + r].v).trim() : null;
    if (bibit && bibitMap.has(bibit)) {
      const jk = bibitMap.get(bibit);
      if (!kelas) kelas = jk.kelas;
      if (!jenis) jenis = jk.jenis;
    }

    // Hitung Forcing Standar = tglRawat + hariForcing
    let forcingStd = wsStatus['T' + r] ? parseExcelDate(wsStatus['T' + r].v) : null;
    if (!forcingStd && tglRawat) {
      let addHari = 0;
      if (status && kelas && hariForcingMap.has(status + kelas)) {
        addHari = hariForcingMap.get(status + kelas);
      } else if (status && hariForcingMap.has(status)) {
        addHari = hariForcingMap.get(status);
      }
      if (addHari > 0) {
        forcingStd = new Date(tglRawat.getTime() + addHari * 86400 * 1000);
      }
    }

    // Forcing Prod 2026
    let forcingProd2026 = wsStatus['U' + r] ? parseExcelDate(wsStatus['U' + r].v) : null;
    if (!forcingProd2026 && prod26Map.has(lokasi + '-' + status)) {
      forcingProd2026 = prod26Map.get(lokasi + '-' + status);
    } else if (!forcingProd2026 && prod26Map.has(lokasi)) {
      forcingProd2026 = prod26Map.get(lokasi);
    }

    // Forcing Prod 2027 & Ket Forcing
    let forcing2027 = wsStatus['AC' + r] ? parseExcelDate(wsStatus['AC' + r].v) : null;
    let ketForcing2027 = null;
    if (prod27Map.has(lokasi + '-' + status)) {
      const p27 = prod27Map.get(lokasi + '-' + status);
      forcing2027 = p27.tgl || forcing2027;
      ketForcing2027 = p27.ket;
    } else if (prod27Map.has(lokasi)) {
      const p27 = prod27Map.get(lokasi);
      forcing2027 = p27.tgl || forcing2027;
      ketForcing2027 = p27.ket;
    }

    // Fix Forcing = IF(forcingProd2026 != null, forcingProd2026, forcingStd)
    const fixForcing = forcingProd2026 || forcingStd;

    // Forcing Gabungan = IF(forcing2027 != null, forcing2027, forcingProd2026)
    const forcingGabungan = forcing2027 || forcingProd2026;

    // Umur F Std & Umur F Prod
    const umurFStd = wsStatus['V' + r] ? Number(wsStatus['V' + r].v) : null;
    const umurFProd = wsStatus['W' + r] ? Number(wsStatus['W' + r].v) : null;

    statusLokasiList.push({
      lokasi,
      wil,
      strucPlant,
      statusLengkap,
      status,
      luasBruto,
      luasAktif,
      luasNetto,
      bibit,
      kelas,
      jenis,
      perubahanSts,
      tglRawat,
      hari,
      bulan,
      umurRawat,
      umurBulan,
      forcingStd,
      forcingProd2026,
      forcing2027,
      ketForcing2027,
      fixForcing,
      forcingGabungan,
      umurFStd,
      umurFProd,
    });
  }

  // Hapus data lama dan simpan ulang secara batch
  await prisma.masterStatusLokasi.deleteMany({});
  console.log(`   Menyimpan ${statusLokasiList.length} data Master Status Lokasi...`);
  // Insert batch per 200 rows
  for (let i = 0; i < statusLokasiList.length; i += 200) {
    const chunk = statusLokasiList.slice(i, i + 200);
    await prisma.masterStatusLokasi.createMany({ data: chunk, skipDuplicates: true });
  }
  console.log(`   ✓ Sukses menyimpan ${statusLokasiList.length} baris Master Status Lokasi.`);

  // ==========================================
  // 3. SEED MASTER WATERLOGGING (DSM ST & BK)
  // ==========================================
  console.log('\n🌧️ [3/5] Memproses & Menyimpan Master Waterlogging (DSM ST & BK)...');
  const fileDSM = path.join(excelDir, 'DSM_ST_Dashboard_2025_Jan-2026_Oct.xlsx');
  const wbDSM = XLSX.readFile(fileDSM);
  const wsDSM = wbDSM.Sheets['DSM ST'] || wbDSM.Sheets[wbDSM.SheetNames[0]];

  const waterloggingList = [];
  for (let r = 3; r <= 10000; r++) {
    const d = wsDSM['D' + r];
    if (!d || !d.v || String(d.v).trim().toUpperCase() === 'TOTAL') continue;

    const no = wsDSM['A' + r] ? Number(wsDSM['A' + r].v) : null;
    const pg = wsDSM['B' + r] ? String(wsDSM['B' + r].v).trim() : 'PG1';
    const wilayah = wsDSM['C' + r] ? String(wsDSM['C' + r].v).trim() : null;
    const lokasi = String(d.v).trim();
    const luasHa = wsDSM['E' + r] ? Number(wsDSM['E' + r].v) : null;
    const komoditas = wsDSM['F' + r] ? String(wsDSM['F' + r].v).trim() : null;
    const bulanDsmBk = wsDSM['G' + r] ? String(wsDSM['G' + r].v).trim() : null;
    const tahunDsmBk = wsDSM['H' + r] ? Number(wsDSM['H' + r].v) : null;
    const dsmbkPlot = wsDSM['I' + r] ? String(wsDSM['I' + r].v).trim() : null;
    const dryBk = wsDSM['J' + r] ? String(wsDSM['J' + r].v).trim() : null;
    const bulanDsmSt = wsDSM['K' + r] ? String(wsDSM['K' + r].v).trim() : null;
    const tahunDsmSt = wsDSM['L' + r] ? Number(wsDSM['L' + r].v) : null;
    const dsmPlot = wsDSM['M' + r] ? String(wsDSM['M' + r].v).trim() : null;
    const drySt = wsDSM['N' + r] ? String(wsDSM['N' + r].v).trim() : null;

    waterloggingList.push({
      no,
      pg,
      wilayah,
      lokasi,
      luasHa,
      komoditas,
      bulanDsmBk,
      tahunDsmBk,
      dsmbkPlot,
      dryBk,
      bulanDsmSt,
      tahunDsmSt,
      dsmPlot,
      drySt,
    });
  }

  await prisma.masterWaterlogging.deleteMany({});
  console.log(`   Menyimpan ${waterloggingList.length} data Master Waterlogging...`);
  for (let i = 0; i < waterloggingList.length; i += 200) {
    const chunk = waterloggingList.slice(i, i + 200);
    await prisma.masterWaterlogging.createMany({ data: chunk });
  }
  console.log(`   ✓ Sukses menyimpan ${waterloggingList.length} baris Master Waterlogging.`);

  // ==========================================
  // 4. SEED MASTER REALISASI SAP (FORM 630 - 19 KOLOM)
  // ==========================================
  console.log('\n📑 [4/5] Memproses & Menyimpan Master SAP Gorong-Gorong (19 Kolom Form 630)...');
  const fileSAP = path.join(excelDir, 'Real Gorong2.XLSX');
  const wbSAP = XLSX.readFile(fileSAP);
  const wsSAP = wbSAP.Sheets[wbSAP.SheetNames[0]];

  const sapList = [];
  for (let r = 2; r <= 3000; r++) {
    const cellA = wsSAP['A' + r];
    const cellS = wsSAP['S' + r];
    const lokasi = cellA && cellA.v ? String(cellA.v).trim() : (cellS && cellS.v ? String(cellS.v).trim() : null);
    if (!lokasi) continue;

    const wilayahSap = wsSAP['B' + r] ? String(wsSAP['B' + r].v).trim() : null;
    const plantCostCenter = wsSAP['C' + r] ? String(wsSAP['C' + r].v).trim() : null;
    const statusTanaman = wsSAP['D' + r] ? String(wsSAP['D' + r].v).trim() : null;
    const spkId = wsSAP['E' + r] ? String(wsSAP['E' + r].v).trim() : null;
    const pasDocument = wsSAP['F' + r] ? String(wsSAP['F' + r].v).trim() : null;
    const tanggalRealisasi = parseExcelDate(wsSAP['G' + r] ? wsSAP['G' + r].v : null) || new Date();
    const deskripsiKegiatan = wsSAP['H' + r] ? String(wsSAP['H' + r].v).trim() : null;
    const deskripsiBahan = wsSAP['I' + r] ? String(wsSAP['I' + r].v).trim() : '';
    const jenisData = wsSAP['J' + r] ? String(wsSAP['J' + r].v).trim() : null;
    const kodeBahan = wsSAP['K' + r] ? String(wsSAP['K' + r].v).trim() : null;
    const qty = wsSAP['L' + r] ? Math.round(Number(wsSAP['L' + r].v)) : 0;
    const hasilEfektif = wsSAP['M' + r] ? Number(wsSAP['M' + r].v) : null;
    const totalBiaya = wsSAP['N' + r] ? Number(wsSAP['N' + r].v) : null;
    const penanggungJawab = wsSAP['O' + r] ? String(wsSAP['O' + r].v).trim() : null;
    const waktuPelaksanaan = wsSAP['P' + r] ? Number(wsSAP['P' + r].v) : null;
    const air = wsSAP['Q' + r] ? Number(wsSAP['Q' + r].v) : 0;
    const jumlahAir = wsSAP['R' + r] ? Number(wsSAP['R' + r].v) : 0;
    const referensiLokasi = cellS && cellS.v ? String(cellS.v).trim() : lokasi;
    const diameter = detectDiameter(deskripsiBahan);

    sapList.push({
      lokasi,
      wilayahSap,
      plantCostCenter,
      statusTanaman,
      spkId,
      pasDocument,
      tanggalRealisasi,
      deskripsiKegiatan,
      deskripsiBahan,
      jenisData,
      kodeBahan,
      qty,
      hasilEfektif,
      totalBiaya,
      penanggungJawab,
      waktuPelaksanaan,
      air,
      jumlahAir,
      referensiLokasi,
      diameter,
      fileName: 'Real Gorong2.XLSX',
      uploadedBy: 'system_seed',
    });
  }

  await prisma.masterSapGorongGorong.deleteMany({});
  console.log(`   Menyimpan ${sapList.length} data Master SAP Form 630...`);
  for (let i = 0; i < sapList.length; i += 200) {
    const chunk = sapList.slice(i, i + 200);
    await prisma.masterSapGorongGorong.createMany({ data: chunk });
  }
  console.log(`   ✓ Sukses menyimpan ${sapList.length} baris Master SAP Gorong-Gorong.`);

  // ==========================================
  // 5. SEED TRANSAKSI AWAL GORONG-GORONG (ORDER, DROP, PASANG MANUAL)
  // ==========================================
  console.log('\n📦 [5/5] Memproses & Menyimpan Transaksi Riil Awal Gorong-Gorong (Order, Drop, Pasang Manual)...');
  const fileGorong = path.join(excelDir, 'Monitor Gorong-gorong PG1.xlsx');
  const wbGorong = XLSX.readFile(fileGorong);

  const trxList = [];

  // A. Sheet Data Order
  const wsOrder = wbGorong.Sheets['Data Order'];
  if (wsOrder) {
    for (let r = 7; r <= 2000; r++) {
      const cellC = wsOrder['C' + r];
      if (!cellC || !cellC.v) continue;
      const lokasi = String(cellC.v).trim();
      const wilayah = wsOrder['D' + r] ? String(wsOrder['D' + r].v).trim() : null;
      const tanggal = parseExcelDate(wsOrder['F' + r] ? wsOrder['F' + r].v : null) || new Date();
      const qtyD40 = wsOrder['G' + r] ? Math.round(Number(wsOrder['G' + r].v)) : 0;
      const qtyD60 = wsOrder['H' + r] ? Math.round(Number(wsOrder['H' + r].v)) : 0;
      const qtyD80 = wsOrder['I' + r] ? Math.round(Number(wsOrder['I' + r].v)) : 0;
      const qtyD100 = wsOrder['J' + r] ? Math.round(Number(wsOrder['J' + r].v)) : 0;

      if (qtyD40 > 0 || qtyD60 > 0 || qtyD80 > 0 || qtyD100 > 0) {
        trxList.push({
          jenisTransaksi: 'ORDER',
          lokasi,
          wilayah,
          tanggal,
          qtyD40,
          qtyD60,
          qtyD80,
          qtyD100,
          keterangan: 'Migrasi Awal dari Sheet Data Order',
          createdBy: 'system_seed',
          userRole: 'USER_WILAYAH',
        });
      }
    }
  }

  // B. Sheet Data Drop
  const wsDrop = wbGorong.Sheets['Data Drop'];
  if (wsDrop) {
    for (let r = 7; r <= 2000; r++) {
      const cellC = wsDrop['C' + r];
      if (!cellC || !cellC.v) continue;
      const lokasi = String(cellC.v).trim();
      const wilayah = wsDrop['D' + r] ? String(wsDrop['D' + r].v).trim() : null;
      const rawDateVal = wsDrop['G' + r] ? wsDrop['G' + r].v : null;
      const tanggal = parseExcelDate(rawDateVal);
      // Abaikan baris bertanda 'x' atau tanggal kosong
      if (!tanggal) continue;

      const qtyD40 = wsDrop['I' + r] ? Math.round(Number(wsDrop['I' + r].v)) : 0;
      const qtyD60 = wsDrop['J' + r] ? Math.round(Number(wsDrop['J' + r].v)) : 0;
      const qtyD80 = wsDrop['K' + r] ? Math.round(Number(wsDrop['K' + r].v)) : 0;
      const qtyD100 = wsDrop['L' + r] ? Math.round(Number(wsDrop['L' + r].v)) : 0;

      if (qtyD40 > 0 || qtyD60 > 0 || qtyD80 > 0 || qtyD100 > 0) {
        trxList.push({
          jenisTransaksi: 'DROP',
          lokasi,
          wilayah,
          tanggal,
          qtyD40,
          qtyD60,
          qtyD80,
          qtyD100,
          keterangan: 'Migrasi Awal dari Sheet Data Drop',
          createdBy: 'system_seed',
          userRole: 'ADMIN',
        });
      }
    }
  }

  // C. Sheet Data Pasang Man.
  const wsPasangMan = wbGorong.Sheets['Data Pasang Man.'];
  if (wsPasangMan) {
    for (let r = 7; r <= 2000; r++) {
      const cellC = wsPasangMan['C' + r];
      if (!cellC || !cellC.v) continue;
      const lokasi = String(cellC.v).trim();
      const wilayah = wsPasangMan['D' + r] ? String(wsPasangMan['D' + r].v).trim() : null;
      const rawDateVal = wsPasangMan['F' + r] ? wsPasangMan['F' + r].v : null;
      const tanggal = parseExcelDate(rawDateVal);
      // Abaikan baris bertanda 'x' atau tanggal kosong
      if (!tanggal) continue;

      const qtyD40 = wsPasangMan['G' + r] ? Math.round(Number(wsPasangMan['G' + r].v)) : 0;
      const qtyD60 = wsPasangMan['H' + r] ? Math.round(Number(wsPasangMan['H' + r].v)) : 0;
      const qtyD80 = wsPasangMan['I' + r] ? Math.round(Number(wsPasangMan['I' + r].v)) : 0;
      const qtyD100 = wsPasangMan['J' + r] ? Math.round(Number(wsPasangMan['J' + r].v)) : 0;

      if (qtyD40 > 0 || qtyD60 > 0 || qtyD80 > 0 || qtyD100 > 0) {
        trxList.push({
          jenisTransaksi: 'PASANG_MANUAL',
          lokasi,
          wilayah,
          tanggal,
          qtyD40,
          qtyD60,
          qtyD80,
          qtyD100,
          keterangan: 'Migrasi Awal dari Sheet Data Pasang Man.',
          createdBy: 'system_seed',
          userRole: 'ADMIN',
        });
      }
    }
  }

  await prisma.transaksiGorongGorong.deleteMany({});
  console.log(`   Menyimpan ${trxList.length} data transaksi awal (Order, Drop, Pasang Manual)...`);
  for (let i = 0; i < trxList.length; i += 200) {
    const chunk = trxList.slice(i, i + 200);
    await prisma.transaksiGorongGorong.createMany({ data: chunk });
  }
  console.log(`   ✓ Sukses menyimpan ${trxList.length} baris Transaksi Gorong-Gorong.`);

  console.log('\n🎉 SELURUH TAHAP 2 SEEDING DATA AWAL SELESAI DENGAN SUKSES!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
