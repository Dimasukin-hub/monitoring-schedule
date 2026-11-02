import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { parseSnapshotFromWorkbook, saveSnapshotToFile, loadSnapshotFromFile } from '@/lib/lokasiOrderSnapshot';

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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'merge'; // 'merge' | 'full_replace'
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

    // Ekstraksi snapshot Lokasi Order dan List Close jika sheet tersebut tersedia
    let snapshotLocationCount = 0;
    const parsedSnapshot = parseSnapshotFromWorkbook(wb);
    const snapshotKeys = Object.keys(parsedSnapshot);
    if (snapshotKeys.length > 0) {
      if (mode === 'merge') {
        const existingSnap = loadSnapshotFromFile();
        saveSnapshotToFile({ ...existingSnap, ...parsedSnapshot });
      } else {
        saveSnapshotToFile(parsedSnapshot);
      }
      snapshotLocationCount = snapshotKeys.length;
    }

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
    const wsStatusLokasi = findSheet(['Status Lokasi', 'Master Lokasi']);

    const newTransactions: any[] = [];
    const touchedLocations = new Set<string>();
    const updatedStatusLokasiList: any[] = [];

    // =========================================================================
    // SKENARIO 1: Sheet Transaksi Mentah (Data Order, Data Drop, Data Pasang Man)
    // =========================================================================
    const hasRawSheets = !!(wsDataOrder || wsDataDrop || wsDataPasangMan);

    if (wsDataOrder) {
      // Data Order: Lokasi di Col C, Wilayah di Col D, Tanggal di Col F, Qty D40:G, D60:H, D80:I, D100:J (Row 6/7 ke atas)
      for (let r = 5; r <= 3000; r++) {
        const cellC = wsDataOrder['C' + r] || wsDataOrder['B' + r];
        if (!cellC || !cellC.v) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL')) continue;

        const wilayah = wsDataOrder['D' + r] ? String(wsDataOrder['D' + r].v).trim() : null;
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

    if (wsDataDrop) {
      // Data Drop: Lokasi di Col C, Wilayah di Col D, Tanggal di Col G, Qty D40:I, D60:J, D80:K, D100:L (Row 6/7 ke atas)
      for (let r = 5; r <= 3000; r++) {
        const cellC = wsDataDrop['C' + r] || wsDataDrop['B' + r];
        if (!cellC || !cellC.v) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL')) continue;

        const wilayah = wsDataDrop['D' + r] ? String(wsDataDrop['D' + r].v).trim() : null;
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

    if (wsDataPasangMan) {
      // Data Pasang Man.: Lokasi di Col C, Wilayah di Col D, Tanggal di Col F, Qty D40:G, D60:H, D80:I, D100:J (Row 6/7 ke atas)
      for (let r = 5; r <= 3000; r++) {
        const cellC = wsDataPasangMan['C' + r] || wsDataPasangMan['B' + r];
        if (!cellC || !cellC.v) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL')) continue;

        const wilayah = wsDataPasangMan['D' + r] ? String(wsDataPasangMan['D' + r].v).trim() : null;
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

    // =========================================================================
    // SKENARIO 2: Sheet Lokasi Order (Rekapitulasi per Lokasi)
    // Jika sheet mentah tidak ada, atau sheet Lokasi Order disediakan secara eksplisit
    // =========================================================================
    if (!hasRawSheets && wsLokasiOrder) {
      // Cari kolom Lokasi (biasanya Col B atau Col A)
      for (let r = 6; r <= 3000; r++) {
        const cellB = wsLokasiOrder['B' + r] || wsLokasiOrder['A' + r];
        if (!cellB || !cellB.v) continue;
        const lokStr = String(cellB.v).trim().toUpperCase();
        if (
          !lokStr ||
          lokStr === 'LOKASI' ||
          lokStr === 'GRAND TOTAL' ||
          lokStr === 'TOTAL' ||
          lokStr.startsWith('GORONG')
        ) {
          continue;
        }

        const isColB = wsLokasiOrder['B' + r] && wsLokasiOrder['B' + r].v === cellB.v;
        const getCell = (colBLetter: string, colALetter: string) => {
          const letter = isColB ? colBLetter : colALetter;
          return wsLokasiOrder[letter + r];
        };

        const wilayahCell = getCell('C', 'B');
        const wilayah = wilayahCell ? String(wilayahCell.v).trim() : null;

        const tglOrderCell = getCell('G', 'F');
        const tglOrder = parseExcelDate(tglOrderCell ? tglOrderCell.v : null);

        const tglDropCell = getCell('T', 'S');
        const tglDrop = parseExcelDate(tglDropCell ? tglDropCell.v : null);

        // Diameter 40
        const ord40 = cleanQty(getCell('R', 'Q')?.v);
        const drp40 = cleanQty(getCell('S', 'R')?.v);
        const psg40 = cleanQty(getCell('X', 'W')?.v);

        // Diameter 60
        const ord60 = cleanQty(getCell('AD', 'AC')?.v);
        const drp60 = cleanQty(getCell('AE', 'AD')?.v);
        const psg60 = cleanQty(getCell('AI', 'AH')?.v);

        // Diameter 80
        const ord80 = cleanQty(getCell('AO', 'AN')?.v);
        const drp80 = cleanQty(getCell('AP', 'AO')?.v);
        const psg80 = cleanQty(getCell('AT', 'AS')?.v);

        // Diameter 100
        const ord100 = cleanQty(getCell('AZ', 'AY')?.v);
        const drp100 = cleanQty(getCell('BA', 'AZ')?.v);
        const psg100 = cleanQty(getCell('BE', 'BD')?.v);

        touchedLocations.add(lokStr);

        // Buat record ORDER jika ada kuantiti atau ada tanggal order
        if (ord40 > 0 || ord60 > 0 || ord80 > 0 || ord100 > 0) {
          newTransactions.push({
            jenisTransaksi: 'ORDER',
            lokasi: lokStr,
            wilayah,
            tanggal: tglOrder,
            qtyD40: ord40,
            qtyD60: ord60,
            qtyD80: ord80,
            qtyD100: ord100,
            keterangan: 'Upload Excel (Sheet Lokasi Order)',
            createdBy: uploadedBy,
            userRole: 'ADMIN',
          });
        }

        // Buat record DROP jika ada kuantiti drop
        if (drp40 > 0 || drp60 > 0 || drp80 > 0 || drp100 > 0) {
          newTransactions.push({
            jenisTransaksi: 'DROP',
            lokasi: lokStr,
            wilayah,
            tanggal: tglDrop,
            qtyD40: drp40,
            qtyD60: drp60,
            qtyD80: drp80,
            qtyD100: drp100,
            keterangan: 'Upload Excel (Sheet Lokasi Order)',
            createdBy: uploadedBy,
            userRole: 'ADMIN',
          });
        }

        // Buat record PASANG_MANUAL jika ada kuantiti pasang manual
        if (psg40 > 0 || psg60 > 0 || psg80 > 0 || psg100 > 0) {
          newTransactions.push({
            jenisTransaksi: 'PASANG_MANUAL',
            lokasi: lokStr,
            wilayah,
            tanggal: tglDrop || tglOrder,
            qtyD40: psg40,
            qtyD60: psg60,
            qtyD80: psg60,
            qtyD100: psg100,
            keterangan: 'Upload Excel (Sheet Lokasi Order)',
            createdBy: uploadedBy,
            userRole: 'ADMIN',
          });
        }
      }
    }

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

    // Validasi apakah ada data yang terbaca
    if (newTransactions.length === 0 && updatedStatusLokasiList.length === 0 && snapshotLocationCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Tidak ditemukan data transaksi order/drop/pasang atau master status lokasi pada sheet yang valid. Pastikan sheet berisi "Lokasi Order", "Data Order", "Data Drop", atau "Status Lokasi".',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // EKSEKUSI DATABASE SESUAI MODE
    // =========================================================================
    const affectedLocationsArray = Array.from(touchedLocations);

    if (mode === 'full_replace') {
      // 1. Full Replace: Hapus SELURUH transaksi lama
      await prisma.transaksiGorongGorong.deleteMany({});
    } else {
      // 2. Smart Merge / Update Parsial:
      // Hanya hapus transaksi untuk lokasi-lokasi yang ada di dalam file Excel yang diunggah
      if (affectedLocationsArray.length > 0) {
        await prisma.transaksiGorongGorong.deleteMany({
          where: {
            lokasi: { in: affectedLocationsArray },
          },
        });
      }
    }

    // Masukkan transaksi baru dalam batch 200 baris
    if (newTransactions.length > 0) {
      for (let i = 0; i < newTransactions.length; i += 200) {
        const chunk = newTransactions.slice(i, i + 200);
        await prisma.transaksiGorongGorong.createMany({ data: chunk });
      }
    }

    // Upsert Master Status Lokasi jika terdapat data sheet Status Lokasi
    let statusLokasiUpsertedCount = 0;
    if (updatedStatusLokasiList.length > 0) {
      for (const item of updatedStatusLokasiList) {
        if (mode === 'merge' && affectedLocationsArray.length > 0 && !touchedLocations.has(item.lokasi)) {
          continue;
        }

        await prisma.masterStatusLokasi.upsert({
          where: { lokasi: item.lokasi },
          update: {
            wil: item.wil || undefined,
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
            wil: item.wil,
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

    // Hitung ringkasan transaksi
    let orderCount = 0;
    let dropCount = 0;
    let pasangManCount = 0;
    let totalPcs = 0;

    for (const trx of newTransactions) {
      const sumDia = trx.qtyD40 + trx.qtyD60 + trx.qtyD80 + trx.qtyD100;
      totalPcs += sumDia;
      if (trx.jenisTransaksi === 'ORDER') orderCount++;
      else if (trx.jenisTransaksi === 'DROP') dropCount++;
      else if (trx.jenisTransaksi === 'PASANG_MANUAL') pasangManCount++;
    }

    return NextResponse.json({
      success: true,
      message:
        mode === 'full_replace'
          ? `Replace Seluruh Data Berhasil: Database disinkronisasi ulang dengan ${newTransactions.length} transaksi untuk ${affectedLocationsArray.length} lokasi!`
          : `Update Parsial Berhasil: ${affectedLocationsArray.length} lokasi diperbarui (${newTransactions.length} transaksi baru disimpan, data lokasi lain tetap utuh)!`,
      summary: {
        mode,
        totalLocations: affectedLocationsArray.length,
        totalTransactions: newTransactions.length,
        orderCount,
        dropCount,
        pasangManCount,
        totalPcs,
        statusLokasiUpsertedCount,
        snapshotLocationCount,
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
