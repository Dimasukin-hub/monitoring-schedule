import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { 
  parseSnapshotFromWorkbook, 
  saveSnapshotToFile, 
  loadSnapshotFromFile, 
  isExcludedGorongGorongLocation, 
  isLocationWithoutWilayah,
  syncLokasiOrderToDb,
  syncLokasiBelumOrderToDb,
  syncLokasiBelumOrderFromWorkbook,
  syncMasterDataOrderFromWorkbook,
  syncMasterDataDropFromWorkbook,
  ensureMasterSapLoaded
} from '@/lib/lokasiOrderSnapshot';

function parseExcelDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '-') return new Date();
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function cleanQty(val: any): number {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round(num);
}

export async function POST(request: NextRequest) {
  try {
    await ensureMasterSapLoaded();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace'; // 'full_replace' | 'partial' | 'merge'
    const isPartial = mode === 'partial' || mode === 'merge';
    const uploadedBy = (formData.get('uploadedBy') as string) || 'admin';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File Excel (.xlsx/.xls) wajib diunggah.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });

    const sheetNames = wb.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return NextResponse.json(
        { success: false, message: 'File Excel tidak memiliki sheet yang dapat dibaca.' },
        { status: 400 }
      );
    }

    // Ekstraksi snapshot Lokasi Order: Full Replace vs Partial Merge
    let snapshotLocationCount = 0;
    let belumOrderLocationCount = 0;
    const parsedSnapshot = parseSnapshotFromWorkbook(wb);
    const snapshotKeys = Object.keys(parsedSnapshot);
    if (snapshotKeys.length > 0) {
      if (isPartial) {
        const existingSnap = loadSnapshotFromFile();
        saveSnapshotToFile({ ...existingSnap, ...parsedSnapshot });
      } else {
        saveSnapshotToFile(parsedSnapshot);
      }
      // Simpan langsung ke database permanen PostgreSQL
      snapshotLocationCount = await syncLokasiOrderToDb(parsedSnapshot, isPartial ? 'partial' : 'full_replace');
      belumOrderLocationCount = await syncLokasiBelumOrderFromWorkbook(wb, isPartial ? 'partial' : 'full_replace');

      // Sinkronisasi MasterStatusLokasi hanya untuk petak yang sudah terdaftar (tidak menambah petak baru agar master tetap 1.110 lokasi)
      for (const item of Object.values(parsedSnapshot)) {
        const lok = item.lokasi.trim().toUpperCase();
        if (isExcludedGorongGorongLocation(lok)) continue;
        await prisma.masterStatusLokasi.updateMany({
          where: { lokasi: lok },
          data: {
            ...(item.wilayah ? { strucPlant: item.wilayah } : {}),
            ...(item.statusTanaman ? { status: item.statusTanaman } : {}),
            ...(item.luas != null ? { luasNetto: item.luas } : {}),
            ...(item.umurBulan != null ? { umurBulan: item.umurBulan, umurRawat: item.umurBulan } : {}),
          },
        });
      }
    } else {
      // Jika berkas tidak memuat sheet rekap Lokasi Order, coba cek apakah memuat sheet Lokasi Belum Order
      belumOrderLocationCount = await syncLokasiBelumOrderFromWorkbook(wb, isPartial ? 'partial' : 'full_replace');
    }

    // Sinkronisasi Master Data Order (Lookup Otomatis) jika sheet Data Order ada
    let masterDataOrderCount = 0;
    masterDataOrderCount = await syncMasterDataOrderFromWorkbook(wb, isPartial ? 'partial' : 'full_replace');

    // Sinkronisasi Master Data Drop (Lookup Otomatis Tanpa 'x') jika sheet Data Drop ada
    let masterDataDropCount = 0;
    masterDataDropCount = await syncMasterDataDropFromWorkbook(wb, isPartial ? 'partial' : 'full_replace');

    // Identifikasi sheet berdasarkan nama
    const findSheet = (patterns: string[]) => {
      const match = sheetNames.find((name) =>
        patterns.some((p) => name.trim().toLowerCase().includes(p.toLowerCase()))
      );
      return match ? wb.Sheets[match] : null;
    };

    const wsLokasiOrder = findSheet(['Lokasi Order', 'Gorong2 Per Lokasi', 'Monitoring Gorong']);
    const wsDataOrder = findSheet(['Data Order']);
    const wsDataDrop = findSheet(['Data Drop']);
    const wsDataPasangMan = findSheet(['Data Pasang Man', 'Data Pasang Manual']);
    const wsDataPasangSap = findSheet(['Data Pasang SAP', 'Data SAP', 'Pasang SAP']);
    const wsStatusLokasi = findSheet(['Status Lokasi', 'Master Lokasi']);

    const newTransactions: any[] = [];
    const newSapRecords: any[] = [];
    const touchedLocations = new Set<string>();
    snapshotKeys.forEach((loc) => touchedLocations.add(loc));
    const updatedStatusLokasiList: any[] = [];

    // =========================================================================
    // SKENARIO 1: Sheet Transaksi Mentah (Data Order, Data Drop, Data Pasang Man, Data Pasang SAP)
    // HANYA diproses jika workbook TIDAK membawa sheet Master Rekap Lokasi Order,
    // untuk mencegah duplikasi (double-counting) antara master snapshot dan transaksi.
    // =========================================================================
    const hasRekapSheet = snapshotKeys.length > 0;

    if (!hasRekapSheet && wsDataOrder) {
      // Data Order: Lokasi di Col C, Wilayah di Col D, Tanggal di Col F, Qty D40:G, D60:H, D80:I, D100:J (Row 6/7 ke atas)
      for (let r = 5; r <= 3500; r++) {
        const cellC = wsDataOrder['C' + r] || wsDataOrder['B' + r];
        if (!cellC || !cellC.v) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL') || isExcludedGorongGorongLocation(lokStr)) continue;

        const rawWil = wsDataOrder['D' + r] ? String(wsDataOrder['D' + r].v).trim().toUpperCase() : '';
        const wilayah = isLocationWithoutWilayah(lokStr) ? null : (/^AW0[1-7]$/.test(rawWil) ? rawWil : (/^W0[1-7]$/.test(rawWil) ? 'A' + rawWil : rawWil || null));
        const rawDate = wsDataOrder['F' + r] ? wsDataOrder['F' + r].v : null;
        const tanggal = parseExcelDate(rawDate);

        const qtyD40 = cleanQty(wsDataOrder['G' + r] ? wsDataOrder['G' + r].v : 0);
        const qtyD60 = cleanQty(wsDataOrder['H' + r] ? wsDataOrder['H' + r].v : 0);
        const qtyD80 = cleanQty(wsDataOrder['I' + r] ? wsDataOrder['I' + r].v : 0);
        const qtyD100 = cleanQty(wsDataOrder['J' + r] ? wsDataOrder['J' + r].v : 0);

        if (qtyD40 > 0 || qtyD60 > 0 || qtyD80 > 0 || qtyD100 > 0) {
          touchedLocations.add(lokStr);
          newTransactions.push({
            jenisTransaksi: 'ORDER',
            lokasi: lokStr,
            wilayah,
            tanggal,
            qtyD40,
            qtyD60,
            qtyD80,
            qtyD100,
            keterangan: 'Upload Excel (Sheet Data Order)',
            createdBy: uploadedBy,
            userRole: 'ADMIN',
          });
        }
      }
    }

    if (!hasRekapSheet && wsDataDrop) {
      // Data Drop: Lokasi di Col C, Wilayah di Col D, Tanggal di Col G, Qty D40:I, D60:J, D80:K, D100:L (Row 6/7 ke atas)
      for (let r = 5; r <= 3500; r++) {
        const cellC = wsDataDrop['C' + r] || wsDataDrop['B' + r];
        if (!cellC || !cellC.v) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL') || isExcludedGorongGorongLocation(lokStr)) continue;

        const rawWil = wsDataDrop['D' + r] ? String(wsDataDrop['D' + r].v).trim().toUpperCase() : '';
        const wilayah = isLocationWithoutWilayah(lokStr) ? null : (/^AW0[1-7]$/.test(rawWil) ? rawWil : (/^W0[1-7]$/.test(rawWil) ? 'A' + rawWil : rawWil || null));
        const rawDate = wsDataDrop['G' + r] ? wsDataDrop['G' + r].v : null;
        const tanggal = parseExcelDate(rawDate);

        const qtyD40 = cleanQty(wsDataDrop['I' + r] ? wsDataDrop['I' + r].v : 0);
        const qtyD60 = cleanQty(wsDataDrop['J' + r] ? wsDataDrop['J' + r].v : 0);
        const qtyD80 = cleanQty(wsDataDrop['K' + r] ? wsDataDrop['K' + r].v : 0);
        const qtyD100 = cleanQty(wsDataDrop['L' + r] ? wsDataDrop['L' + r].v : 0);

        if (qtyD40 > 0 || qtyD60 > 0 || qtyD80 > 0 || qtyD100 > 0) {
          touchedLocations.add(lokStr);
          newTransactions.push({
            jenisTransaksi: 'DROP',
            lokasi: lokStr,
            wilayah,
            tanggal,
            qtyD40,
            qtyD60,
            qtyD80,
            qtyD100,
            keterangan: 'Upload Excel (Sheet Data Drop)',
            createdBy: uploadedBy,
            userRole: 'ADMIN',
          });
        }
      }
    }

    if (!hasRekapSheet && wsDataPasangMan) {
      // Data Pasang Man.: Lokasi di Col C, Wilayah di Col D, Tanggal di Col F, Qty D40:G, D60:H, D80:I, D100:J (Row 6/7 ke atas)
      for (let r = 5; r <= 3500; r++) {
        const cellC = wsDataPasangMan['C' + r] || wsDataPasangMan['B' + r];
        if (!cellC || !cellC.v) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL') || isExcludedGorongGorongLocation(lokStr)) continue;

        const rawWil = wsDataPasangMan['D' + r] ? String(wsDataPasangMan['D' + r].v).trim().toUpperCase() : '';
        const wilayah = isLocationWithoutWilayah(lokStr) ? null : (/^AW0[1-7]$/.test(rawWil) ? rawWil : (/^W0[1-7]$/.test(rawWil) ? 'A' + rawWil : rawWil || null));
        const rawDate = wsDataPasangMan['F' + r] ? wsDataPasangMan['F' + r].v : null;
        const tanggal = parseExcelDate(rawDate);

        const qtyD40 = cleanQty(wsDataPasangMan['G' + r] ? wsDataPasangMan['G' + r].v : 0);
        const qtyD60 = cleanQty(wsDataPasangMan['H' + r] ? wsDataPasangMan['H' + r].v : 0);
        const qtyD80 = cleanQty(wsDataPasangMan['I' + r] ? wsDataPasangMan['I' + r].v : 0);
        const qtyD100 = cleanQty(wsDataPasangMan['J' + r] ? wsDataPasangMan['J' + r].v : 0);

        if (qtyD40 > 0 || qtyD60 > 0 || qtyD80 > 0 || qtyD100 > 0) {
          touchedLocations.add(lokStr);
          newTransactions.push({
            jenisTransaksi: 'PASANG_MANUAL',
            lokasi: lokStr,
            wilayah,
            tanggal,
            qtyD40,
            qtyD60,
            qtyD80,
            qtyD100,
            keterangan: 'Upload Excel (Sheet Data Pasang Man.)',
            createdBy: uploadedBy,
            userRole: 'ADMIN',
          });
        }
      }
    }

    if (!hasRekapSheet && wsDataPasangSap) {
      // Data Pasang SAP: Lokasi di Col C, Wilayah di Col D, Tanggal di Col F, Qty D40:G, D60:H, D80:I, D100:J, Ref Lokasi di Col N
      for (let r = 5; r <= 3500; r++) {
        const cellC = wsDataPasangSap['C' + r] || wsDataPasangSap['B' + r];
        if (!cellC || !cellC.v) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL') || isExcludedGorongGorongLocation(lokStr)) continue;

        const rawWil = wsDataPasangSap['D' + r] ? String(wsDataPasangSap['D' + r].v).trim().toUpperCase() : '';
        const wilayah = isLocationWithoutWilayah(lokStr) ? null : (/^AW0[1-7]$/.test(rawWil) ? rawWil : (/^W0[1-7]$/.test(rawWil) ? 'A' + rawWil : rawWil || null));
        const rawDate = wsDataPasangSap['F' + r] ? wsDataPasangSap['F' + r].v : null;
        const tanggal = parseExcelDate(rawDate);

        const qtyD40 = cleanQty(wsDataPasangSap['G' + r] ? wsDataPasangSap['G' + r].v : 0);
        const qtyD60 = cleanQty(wsDataPasangSap['H' + r] ? wsDataPasangSap['H' + r].v : 0);
        const qtyD80 = cleanQty(wsDataPasangSap['I' + r] ? wsDataPasangSap['I' + r].v : 0);
        const qtyD100 = cleanQty(wsDataPasangSap['J' + r] ? wsDataPasangSap['J' + r].v : 0);

        const cellN = wsDataPasangSap['N' + r];
        const refLok = cellN ? String(cellN.v).trim().toUpperCase() : lokStr;

        const pj = wilayah ? (wilayah.startsWith('AW0') ? 'Wilayah ' + parseInt(wilayah.replace(/\D/g, ''), 10) : wilayah) : null;

        const diaList: [number, number][] = [
          [40, qtyD40],
          [60, qtyD60],
          [80, qtyD80],
          [100, qtyD100],
        ];

        for (const [dia, qty] of diaList) {
          if (qty > 0) {
            touchedLocations.add(lokStr);
            newSapRecords.push({
              lokasi: lokStr,
              wilayahSap: wilayah,
              penanggungJawab: pj,
              tanggalRealisasi: tanggal,
              deskripsiBahan: `GORONG-GORONG;Ø${dia}CM`,
              deskripsiKegiatan: 'Bantu pasang gorong2',
              qty,
              diameter: dia,
              referensiLokasi: refLok || lokStr,
              fileName: file.name,
              uploadedBy,
            });
          }
        }
      }
    }

    // =========================================================================
    // SKENARIO 2: Sheet Rekapitulasi Lokasi Order (Universal Snapshot)
    // Jika sheet transaksi mentah tidak ada, sistem otomatis menggunakan parsedSnapshot
    // yang mendukung baik format 1-baris, 2-baris header bertingkat, maupun Master PG1.
    // =========================================================================

    // =========================================================================
    // SKENARIO 3: Sheet Status Lokasi (Master Luas, Umur Bulan, Status Tanaman)
    // =========================================================================
    if (wsStatusLokasi) {
      for (let r = 5; r <= 3500; r++) {
        const cellB = wsStatusLokasi['B' + r] || wsStatusLokasi['A' + r];
        if (!cellB || !cellB.v) continue;
        const lokStr = String(cellB.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL')) continue;

        const strucPlant = wsStatusLokasi['C' + r] ? String(wsStatusLokasi['C' + r].v).trim() : null;
        const wil = strucPlant;
        const statusLengkap = wsStatusLokasi['D' + r] ? String(wsStatusLokasi['D' + r].v).trim() : null;
        const status = statusLengkap ? statusLengkap.substring(0, 4) : null;
        const luasBruto = wsStatusLokasi['E' + r] ? Number(wsStatusLokasi['E' + r].v) : null;
        const luasAktif = wsStatusLokasi['F' + r] ? Number(wsStatusLokasi['F' + r].v) : null;
        const luasNetto = wsStatusLokasi['G' + r] ? Number(wsStatusLokasi['G' + r].v) : null;
        const umurBulan = wsStatusLokasi['X' + r] ? Math.round(Number(wsStatusLokasi['X' + r].v)) : null;

        const validLuasNetto = luasNetto != null && !isNaN(luasNetto) ? luasNetto : (luasAktif != null && !isNaN(luasAktif) ? luasAktif : null);
        const validUmur = umurBulan != null && !isNaN(umurBulan) ? umurBulan : null;

        updatedStatusLokasiList.push({
          lokasi: lokStr,
          wil,
          statusLengkap,
          status,
          luasBruto: luasBruto != null && !isNaN(luasBruto) ? luasBruto : null,
          luasAktif: luasAktif != null && !isNaN(luasAktif) ? luasAktif : null,
          luasNetto: validLuasNetto,
          umurBulan: validUmur,
          umurRawat: validUmur,
        });
      }
    }

    // =========================================================================
    // SKENARIO 2: Sheet Rekapitulasi Lokasi Order (Universal Snapshot)
    // Snapshot disimpan langsung ke file lokasi-order-snapshot.json sebagai baseline.
    // Database transaksiGorongGorong hanya menyimpan transaksi mentah / Form Input,
    // sehingga tidak terjadi double-counting antara snapshot baseline dan transaksi.
    // =========================================================================

    // Validasi ramah: Hanya jika berkas benar-benar kosong 0 baris
    if (newTransactions.length === 0 && updatedStatusLokasiList.length === 0 && snapshotLocationCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Berkas Excel tidak memiliki baris data lokasi yang valid untuk diproses.',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // EKSEKUSI DATABASE SESUAI MODE
    // =========================================================================
    // EKSEKUSI DATABASE: FULL REPLACE vs REPLACE PARSIAL (PER BARIS / LOKASI)
    // =========================================================================
    const affectedLocationsArray = Array.from(touchedLocations);

    if (isPartial) {
      // Replace Parsial: Hanya hapus transaksi & data SAP untuk lokasi-lokasi yang ada di dalam berkas Excel
      if (affectedLocationsArray.length > 0) {
        await prisma.transaksiGorongGorong.deleteMany({
          where: {
            lokasi: { in: affectedLocationsArray },
          },
        });
        if (newSapRecords.length > 0) {
          await prisma.masterSapGorongGorong.deleteMany({
            where: {
              lokasi: { in: affectedLocationsArray },
            },
          });
        }
      }
    } else {
      // Full Replace: Hapus SELURUH transaksi order/drop/pasang manual lama
      await prisma.transaksiGorongGorong.deleteMany({});
      // HANYA hapus masterSapGorongGorong jika berkas yang diunggah memang membawa data SAP baru!
      if (newSapRecords.length > 0) {
        await prisma.masterSapGorongGorong.deleteMany({});
      }
    }

    // Masukkan transaksi baru dalam batch 200 baris
    if (newTransactions.length > 0) {
      for (let i = 0; i < newTransactions.length; i += 200) {
        const chunk = newTransactions.slice(i, i + 200);
        await prisma.transaksiGorongGorong.createMany({ data: chunk });
      }
    }

    // Masukkan record SAP baru dalam batch 200 baris jika ada
    if (newSapRecords.length > 0) {
      for (let i = 0; i < newSapRecords.length; i += 200) {
        const chunk = newSapRecords.slice(i, i + 200);
        await prisma.masterSapGorongGorong.createMany({ data: chunk });
      }
    }

    // Upsert Master Status Lokasi jika terdapat data sheet Status Lokasi
    let statusLokasiUpsertedCount = 0;
    if (updatedStatusLokasiList.length > 0) {
      for (const item of updatedStatusLokasiList) {
        if (isPartial && affectedLocationsArray.length > 0 && !touchedLocations.has(item.lokasi)) {
          continue;
        }

        await prisma.masterStatusLokasi.upsert({
          where: { lokasi: item.lokasi },
          update: {
            strucPlant: item.strucPlant || item.wil || undefined,
            statusLengkap: item.statusLengkap || undefined,
            status: item.status || undefined,
            luasBruto: item.luasBruto ?? undefined,
            luasAktif: item.luasAktif ?? undefined,
            luasNetto: item.luasNetto ?? undefined,
            umurBulan: item.umurBulan ?? undefined,
            umurRawat: item.umurRawat ?? undefined,
          },
          create: {
            lokasi: item.lokasi,
            strucPlant: item.strucPlant || item.wil || null,
            statusLengkap: item.statusLengkap,
            status: item.status,
            luasBruto: item.luasBruto,
            luasAktif: item.luasAktif,
            luasNetto: item.luasNetto,
            umurBulan: item.umurBulan,
            umurRawat: item.umurRawat,
          },
        });
        statusLokasiUpsertedCount++;
      }
    }

    // Hitung ringkasan akumulasi data yang tersimpan
    let snapshotOrderPcs = 0;
    let snapshotDropPcs = 0;
    for (const item of Object.values(parsedSnapshot)) {
      snapshotOrderPcs += (item.orderD40 || 0) + (item.orderD60 || 0) + (item.orderD80 || 0) + (item.orderD100 || 0);
      snapshotDropPcs += (item.dropD40 || 0) + (item.dropD60 || 0) + (item.dropD80 || 0) + (item.dropD100 || 0);
    }

    let rawTrxPcs = 0;
    let orderCount = 0;
    let dropCount = 0;
    let pasangManCount = 0;

    for (const trx of newTransactions) {
      const sumDia = trx.qtyD40 + trx.qtyD60 + trx.qtyD80 + trx.qtyD100;
      rawTrxPcs += sumDia;
      if (trx.jenisTransaksi === 'ORDER') orderCount++;
      else if (trx.jenisTransaksi === 'DROP') dropCount++;
      else if (trx.jenisTransaksi === 'PASANG_MANUAL') pasangManCount++;
    }

    // Ambil total pcs dari master data order tahun 2026 jika ada
    let dataOrderPcs2026 = 0;
    const dataOrderRows2026 = await prisma.masterDataOrderGorongGorong.findMany({
      where: {
        tanggal: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-12-31T23:59:59.999Z'),
        },
      },
    });
    for (const d of dataOrderRows2026) {
      dataOrderPcs2026 += d.diameter40 + d.diameter60 + d.diameter80 + d.diameter100;
    }

    const finalTotalPcs = dataOrderPcs2026 > 0 ? dataOrderPcs2026 : (snapshotOrderPcs > 0 ? snapshotOrderPcs : rawTrxPcs);
    const finalLocationsCount = snapshotLocationCount > 0 ? snapshotLocationCount : affectedLocationsArray.length;

    // Ambil total data SAP di database saat ini agar di notifikasi pop-up selalu terkonfirmasi aman
    const currentSapCount = await prisma.masterSapGorongGorong.count();

    return NextResponse.json({
      success: true,
      message: isPartial
        ? `Replace Parsial Berhasil: ${finalLocationsCount} lokasi diperbarui (lokasi lain tetap aman dan tidak terhapus)!`
        : `Replace Seluruh Data Berhasil: Database dan tabel lokasi telah diperbarui 100% sekaligus dari berkas Excel!`,
      summary: {
        mode: isPartial ? 'partial' : 'full_replace',
        totalLocations: finalLocationsCount,
        snapshotLocationCount: finalLocationsCount,
        belumOrderLocationCount,
        masterDataOrderCount,
        masterDataDropCount,
        totalOrderPcs: finalTotalPcs,
        totalPcs: finalTotalPcs,
        totalTransactions: newTransactions.length > 0 ? newTransactions.length : finalLocationsCount,
        orderCount: masterDataOrderCount > 0 ? masterDataOrderCount : (orderCount > 0 ? orderCount : finalLocationsCount),
        dropCount: masterDataDropCount > 0 ? masterDataDropCount : dropCount,
        pasangManCount,
        sapRecordCount: newSapRecords.length > 0 ? newSapRecords.length : currentSapCount,
        statusLokasiUpsertedCount: snapshotKeys.length > 0 ? snapshotKeys.length : statusLokasiUpsertedCount,
      },
    });
  } catch (error: any) {
    console.error('Error uploading Monitor Gorong-Gorong Excel:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal memproses file upload Excel Monitor Gorong-Gorong',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
