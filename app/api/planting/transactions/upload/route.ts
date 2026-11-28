import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { parseDateString, syncRawTransactionToPlanting } from '@/lib/tanamSyncService';

export const dynamic = 'force-dynamic';

function cleanNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === '-') return null;
  const normalized = s.replace(/,/g, '');
  const n = Number(normalized);
  return isNaN(n) ? null : n;
}

function parsePercentRatio(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const raw = String(val).trim();
  if (!raw || raw === '-') return null;
  const hasPct = raw.includes('%');
  const num = Number(raw.replace(/%/g, '').replace(/,/g, '').trim());
  if (isNaN(num)) return null;
  if (hasPct || num > 1) {
    return Number((num / 100).toFixed(4));
  }
  return Number(num.toFixed(4));
}

function formatDDMMYYYY(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function parseCellDate(val: unknown): { str: string | null; date: Date | null } {
  if (val === null || val === undefined) return { str: null, date: null };
  if (val instanceof Date && !isNaN(val.getTime())) {
    const dUtc = new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate()));
    return { str: formatDDMMYYYY(dUtc), date: dUtc };
  }
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return { str: formatDDMMYYYY(d), date: d };
    }
  }
  const s = String(val).trim();
  if (!s || s === '-' || s.toLowerCase() === 'null') return { str: null, date: null };
  const parsed = parseDateString(s);
  return { str: s, date: parsed };
}

function cleanText(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s.toLowerCase() === 'null') return null;
  return s;
}

/**
 * POST: Upload Excel for PlantingDetail (Input Real Tanam & Petik Nanas).
 * Supports two modes:
 * - 'full_replace': replaces all rows in PlantingDetail with uploaded Excel rows
 * - 'append': inserts new rows without modifying existing PlantingDetail rows
 * Both modes synchronize affected locations to Real Tanam Nanas (Planting) via syncRawTransactionToPlanting.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Berkas Excel wajib diunggah!' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName =
      wb.SheetNames.find(
        (s) =>
          s.toLowerCase().includes('input') ||
          s.toLowerCase().includes('tanam') ||
          s.toLowerCase().includes('petik')
      ) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) {
      return NextResponse.json(
        { success: false, error: 'Lembar kerja Excel kosong!' },
        { status: 400 }
      );
    }

    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Format data Excel kosong atau belum memiliki baris data.' },
        { status: 400 }
      );
    }

    // Detect header row matching table/template & export variants
    let headerRowIdx = 0;
    let cTanggal = -1;
    let cLokasi = -1;
    let cLuasNetto = -1;
    let cAktivitas = -1;
    let cStandar = -1;
    let cBesar = -1;
    let cSedang = -1;
    let cKecil = -1;
    let cExtraKecil = -1;
    let cTotal = -1;
    let cJenisBibit = -1;
    let cWilayah = -1;
    let cAwalTanam = -1;
    let cSelesaiTanam = -1;
    let cAkumTanam = -1;
    let cPersenTanam = -1;
    let cPetikKe = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
        if (str === 'tanggal' || str === 'tgl') cTanggal = c;
        else if (str === 'lokasi' || str === 'petak') {
          cLokasi = c;
          headerRowIdx = r;
        } else if (str.includes('luas netto')) cLuasNetto = c;
        else if (str === 'aktivitas') cAktivitas = c;
        else if (str === 'standar' || str === 'standar (ha)') cStandar = c;
        else if (str === 'besar' || str === 'besar (ha)') cBesar = c;
        else if (str === 'sedang' || str === 'sedang (ha)') cSedang = c;
        else if (str === 'kecil' || str === 'kecil (ha)') cKecil = c;
        else if (str.includes('extra kecil')) cExtraKecil = c;
        else if (str === 'total (ha)' || str === 'total ha' || str === 'total') cTotal = c;
        else if (str.includes('jenis bibit')) cJenisBibit = c;
        else if (str === 'wilayah' || str === 'wil') cWilayah = c;
        else if (str.includes('awal tanam')) cAwalTanam = c;
        else if (str.includes('selesai tanam')) cSelesaiTanam = c;
        else if (str.includes('akum tanam')) cAkumTanam = c;
        else if (str.includes('% tanam') || str.includes('persen tanam')) cPersenTanam = c;
        else if (str.includes('petik ke')) cPetikKe = c;
      }
      if (cLokasi !== -1) break;
    }

    // Fallback to exact 18-column template positions if header detection fell back
    if (cLokasi === -1) {
      cTanggal = 1;
      cLokasi = 2;
      cLuasNetto = 3;
      cAktivitas = 4;
      cStandar = 5;
      cBesar = 6;
      cSedang = 7;
      cKecil = 8;
      cExtraKecil = 9;
      cTotal = 10;
      cJenisBibit = 11;
      cWilayah = 12;
      cAwalTanam = 13;
      cSelesaiTanam = 14;
      cAkumTanam = 15;
      cPersenTanam = 16;
      cPetikKe = 17;
    }

    const records: any[] = [];
    const affectedLocations = new Set<string>();

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || !row[cLokasi]) continue;
      const lok = String(row[cLokasi]).trim().toUpperCase();
      if (!lok || lok === 'TOTAL' || lok.startsWith('TOTAL')) continue;

      const { str: tglStr, date: tglDate } =
        cTanggal !== -1 ? parseCellDate(row[cTanggal]) : { str: null, date: null };
      const luasNetto = cLuasNetto !== -1 ? cleanNum(row[cLuasNetto]) : null;
      const aktivitas = (cAktivitas !== -1 ? cleanText(row[cAktivitas]) : null) || 'Tanam Bibit';
      const standar = (cStandar !== -1 ? cleanNum(row[cStandar]) : null) ?? 0;
      const besar = (cBesar !== -1 ? cleanNum(row[cBesar]) : null) ?? 0;
      const sedang = (cSedang !== -1 ? cleanNum(row[cSedang]) : null) ?? 0;
      const kecil = (cKecil !== -1 ? cleanNum(row[cKecil]) : null) ?? 0;
      const extraKecil = (cExtraKecil !== -1 ? cleanNum(row[cExtraKecil]) : null) ?? 0;

      const rawTotal = cTotal !== -1 ? cleanNum(row[cTotal]) : null;
      const computedSum = Number((standar + besar + sedang + kecil + extraKecil).toFixed(2));
      const total = rawTotal !== null ? Number(rawTotal.toFixed(2)) : computedSum;

      const jenisBibit = cJenisBibit !== -1 ? cleanText(row[cJenisBibit]) : null;
      const wilayah = cWilayah !== -1 ? cleanText(row[cWilayah]) : null;
      const awalTanam = cAwalTanam !== -1 ? parseCellDate(row[cAwalTanam]).str : null;
      const selesaiTanam = cSelesaiTanam !== -1 ? parseCellDate(row[cSelesaiTanam]).str : null;
      const akumTanam = cAkumTanam !== -1 ? cleanNum(row[cAkumTanam]) : null;
      const persenTanam = cPersenTanam !== -1 ? parsePercentRatio(row[cPersenTanam]) : null;
      const petikKe = cPetikKe !== -1 ? cleanText(row[cPetikKe]) : null;

      records.push({
        lokasi: lok,
        tanggal: tglStr,
        tanggalDate: tglDate,
        luasNetto,
        aktivitas,
        standar,
        besar,
        sedang,
        kecil,
        extraKecil,
        total,
        jenisBibit,
        wilayah,
        awalTanam,
        selesaiTanam,
        akumTanam,
        persenTanam,
        petikKe,
        sourceFile: file.name || 'Excel Upload',
        sourceSheet: sheetName,
      });

      if (aktivitas.toLowerCase().includes('tanam')) {
        affectedLocations.add(lok);
      }
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada baris data valid yang ditemukan di dalam file Excel.' },
        { status: 400 }
      );
    }

    const isReplaceAll = mode === 'full_replace';
    if (isReplaceAll) {
      const prevLocations = await prisma.plantingDetail.findMany({
        select: { lokasi: true },
        distinct: ['lokasi'],
      });
      for (const item of prevLocations) {
        if (item.lokasi) affectedLocations.add(item.lokasi.trim().toUpperCase());
      }
      await prisma.plantingDetail.deleteMany({});
    }

    // Batch insert (both Replace All and Tambah Data insert cleanly without altering existing rows)
    for (let i = 0; i < records.length; i += 200) {
      await prisma.plantingDetail.createMany({ data: records.slice(i, i + 200) });
    }

    // Synchronize Real Tanam Nanas (Planting) & StokLahanMaster / Land without modifying existing PlantingDetail rows
    for (const lok of affectedLocations) {
      try {
        await syncRawTransactionToPlanting(lok, { skipDetailRewrite: true });
      } catch (syncErr) {
        console.warn(`Sync planting warning for ${lok}:`, syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: records.length,
      mode: isReplaceAll ? 'full_replace' : 'append',
      message: `Berhasil mengunggah ${records.length} data Input Real Tanam & Petik Nanas (${
        isReplaceAll ? 'Replace All' : 'Tambah Data'
      }) dan menyinkronkan Real Tanam Nanas.`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/planting/transactions/upload:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memproses unggahan Excel.' },
      { status: 500 }
    );
  }
}

