import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';

export const dynamic = 'force-dynamic';

function cleanNum(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim().replace(/,/g, '');
  if (!s || s === '-' || s === '#N/A' || s === '#VALUE!') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function cleanStr(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s === '#N/A' || s === '#VALUE!' || s === '#REF!') return null;
  return s;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace';
    const isPartial = mode === 'partial';

    if (!file) {
      return NextResponse.json({ success: false, message: 'Berkas Excel wajib diunggah!' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = wb.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return NextResponse.json({ success: false, message: 'Berkas Excel tidak memuat lembar kerja!' }, { status: 400 });
    }

    const sheetName =
      sheetNames.find((s) => s.toLowerCase().includes('waterlogging') || s.toLowerCase().includes('dsm')) ||
      sheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) {
      return NextResponse.json({ success: false, message: 'Lembar kerja kosong!' }, { status: 400 });
    }

    const range = XLSX.utils.decode_range(ws['!ref']);

    let headerRow = -1;
    let colMap: Record<string, number> = {};

    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell || cell.v == null) continue;
        const text = String(cell.v).trim().toLowerCase();
        if (text === 'lokasi' || text === 'petak') {
          headerRow = r;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow === -1) {
      headerRow = 0;
    }

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
      if (!cell || cell.v == null) continue;
      const text = String(cell.v).trim().toLowerCase();

      if (text === 'no' || text === 'no.') colMap.no = c;
      else if (text === 'pg') colMap.pg = c;
      else if (text === 'wilayah' || text === 'wil') colMap.wilayah = c;
      else if (text === 'lokasi' || text === 'petak') colMap.lokasi = c;
      else if (text.includes('luas')) colMap.luasHa = c;
      else if (text.includes('komoditas') || text === 'kom') colMap.komoditas = c;
      else if (text.includes('bulan') && text.includes('bk')) colMap.bulanDsmBk = c;
      else if (text.includes('tahun') && text.includes('bk')) colMap.tahunDsmBk = c;
      else if (text.includes('dsm') && text.includes('bk')) colMap.dsmbkPlot = c;
      else if (text.includes('dry') && text.includes('bk')) colMap.dryBk = c;
      else if (text.includes('bulan') && text.includes('st')) colMap.bulanDsmSt = c;
      else if (text.includes('tahun') && text.includes('st')) colMap.tahunDsmSt = c;
      else if (text.includes('dsm') && text.includes('st')) colMap.dsmPlot = c;
      else if (text.includes('dry') && text.includes('st')) colMap.drySt = c;
    }

    // Fallback format DSM PG1 layout jika header tidak terlabel sempurna (Col D=Lokasi)
    if (colMap.lokasi === undefined) {
      colMap = {
        no: 0,
        pg: 1,
        wilayah: 2,
        lokasi: 3,
        luasHa: 4,
        komoditas: 5,
        bulanDsmBk: 6,
        tahunDsmBk: 7,
        dsmbkPlot: 8,
        dryBk: 9,
        bulanDsmSt: 10,
        tahunDsmSt: 11,
        dsmPlot: 12,
        drySt: 13,
      };
    }

    let startRow = headerRow + 1;
    if (startRow <= range.e.r) {
      const checkCell = ws[XLSX.utils.encode_cell({ r: startRow, c: colMap.lokasi })];
      const val = checkCell && checkCell.v != null ? String(checkCell.v).trim() : '';
      if (val === '1' || val === '2') {
        startRow++;
      }
    }

    const getVal = (r: number, col?: number) => {
      if (col === undefined || col < 0) return null;
      const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
      return cell && cell.v != null ? cell.v : null;
    };

    const parsedRecords: any[] = [];
    const seenLokasi = new Set<string>();

    for (let r = startRow; r <= range.e.r; r++) {
      const rawLok = getVal(r, colMap.lokasi);
      if (!rawLok) continue;
      const lokasi = String(rawLok).trim().toUpperCase();
      if (!lokasi || /^\d+$/.test(lokasi) || lokasi === 'LOKASI' || lokasi.startsWith('TOTAL')) continue;
      if (seenLokasi.has(lokasi)) continue;
      seenLokasi.add(lokasi);

      const no = cleanNum(getVal(r, colMap.no));
      const pg = cleanStr(getVal(r, colMap.pg)) || 'PG1';
      const wilayah = cleanStr(getVal(r, colMap.wilayah));
      const luasHa = cleanNum(getVal(r, colMap.luasHa));
      const komoditas = cleanStr(getVal(r, colMap.komoditas));
      const bulanDsmBk = cleanStr(getVal(r, colMap.bulanDsmBk));
      const tahunDsmBk = cleanNum(getVal(r, colMap.tahunDsmBk));
      const dsmbkPlot = cleanStr(getVal(r, colMap.dsmbkPlot));
      const dryBk = cleanStr(getVal(r, colMap.dryBk));
      const bulanDsmSt = cleanStr(getVal(r, colMap.bulanDsmSt));
      const tahunDsmSt = cleanNum(getVal(r, colMap.tahunDsmSt));
      const dsmPlot = cleanStr(getVal(r, colMap.dsmPlot));
      const drySt = cleanStr(getVal(r, colMap.drySt));

      parsedRecords.push({
        no: no != null ? Math.round(no) : null,
        pg,
        wilayah,
        lokasi,
        luasHa,
        komoditas,
        bulanDsmBk,
        tahunDsmBk: tahunDsmBk != null ? Math.round(tahunDsmBk) : null,
        dsmbkPlot,
        dryBk,
        bulanDsmSt,
        tahunDsmSt: tahunDsmSt != null ? Math.round(tahunDsmSt) : null,
        dsmPlot,
        drySt,
      });
    }

    if (parsedRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data waterlogging valid yang terbaca dari berkas Excel!' },
        { status: 400 }
      );
    }

    if (!isPartial) {
      // REPLACE ALL: Hapus seluruh data lama dan simpan ulang secara batch
      await prisma.masterWaterlogging.deleteMany({});
      for (let i = 0; i < parsedRecords.length; i += 200) {
        const chunk = parsedRecords.slice(i, i + 200);
        await prisma.masterWaterlogging.createMany({ data: chunk });
      }
    } else {
      // REPLACE PARSIAL: Hapus lokasi yang ada di file, lalu insert baru
      const touchedLoks = parsedRecords.map((p) => p.lokasi);
      await prisma.masterWaterlogging.deleteMany({
        where: { lokasi: { in: touchedLoks } },
      });
      for (let i = 0; i < parsedRecords.length; i += 200) {
        const chunk = parsedRecords.slice(i, i + 200);
        await prisma.masterWaterlogging.createMany({ data: chunk });
      }
    }

    const currentTotal = await prisma.masterWaterlogging.count();

    try {
      await syncLokasiOrderDatabase();
    } catch (syncErr) {
      console.warn('Warning syncing database after master waterlogging upload:', syncErr);
    }

    return NextResponse.json({
      success: true,
      message: isPartial
        ? `Tambah Data Berhasil: ${parsedRecords.length} data waterlogging berhasil ditambahkan. Total data master: ${currentTotal} lokasi.`
        : `Replace All Berhasil: Seluruh data lama digantikan dengan ${parsedRecords.length} lokasi waterlogging baru dari Excel. Total data master: ${currentTotal} lokasi.`,
      data: {
        processedCount: parsedRecords.length,
        totalCount: currentTotal,
        mode: isPartial ? 'partial' : 'full_replace',
      },
    });
  } catch (error: any) {
    console.error('Error uploading master waterlogging:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunggah data master waterlogging: ' + error.message },
      { status: 500 }
    );
  }
}

