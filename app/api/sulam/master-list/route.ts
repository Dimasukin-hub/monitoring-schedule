import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const s = String(val).trim().replace(/,/g, '');
  const n = Number(s);
  return isNaN(n) ? 0 : Math.round(n);
}

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// GET: Ambil master data List Sulam (dengan perhitungan umur forcing otomatis)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { spekBB: { contains: search, mode: 'insensitive' } },
        { keterangan: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      where.wilayah = { in: wilList };
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const today = new Date();
    const [total, rawData] = await Promise.all([
      prisma.listSulam.count({ where }),
      prisma.listSulam.findMany({
        where,
        orderBy: [{ lokasi: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    const transformed = rawData.map((d) => {
      // Hitung Umur Forcing otomatis: Math.round((today - tglFMax) / 30.4)
      let umurForcing = d.umurForcing;
      if (d.tglFMax) {
        const diffMs = today.getTime() - new Date(d.tglFMax).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        umurForcing = Math.round(diffDays / 30.4);
      }

      return {
        id: d.id,
        wilayah: d.wilayah || '-',
        lokasi: d.lokasi,
        jenisBB: d.jenisBB || '-',
        kelasBB: d.kelasBB || '-',
        spekBB: d.spekBB || '-',
        tglRawat: d.tglRawat,
        tglStdForcing: d.tglStdForcing,
        tglFProd: d.tglFProd,
        tglFMax: d.tglFMax,
        tglOrder: d.tglOrder,
        umurForcing: umurForcing !== null && umurForcing !== undefined ? umurForcing : '-',
        permintaanRitaseBtg: d.permintaanRitaseBtg || 0,
        permintaanRitaseRit: d.permintaanRitaseRit || 0,
        keterangan: d.keterangan || '-',
        status: d.status || 'Open',
      };
    });

    return NextResponse.json({
      success: true,
      data: transformed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/master-list:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master list sulam.' },
      { status: 500 }
    );
  }
}

// POST: Upload Excel List Sulam
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Berkas Excel wajib diunggah!' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('list') || s.toLowerCase().includes('sulam')) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) {
      return NextResponse.json(
        { success: false, message: 'Lembar kerja Excel kosong!' },
        { status: 400 }
      );
    }

    const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Format data Excel tidak valid atau kosong.' },
        { status: 400 }
      );
    }

    let headerRowIdx = 0;
    let cWil = -1, cLok = -1, cJenis = -1, cKelas = -1, cRawat = -1, cStdFrc = -1, cFProd = -1, cFMax = -1, cOrder = -1, cBtg = -1, cRit = -1, cSpek = -1, cKet = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '').toLowerCase().trim();
        if (str === 'wil' || str === 'wilayah') cWil = c;
        else if (str === 'lokasi' || str === 'petak') { cLok = c; headerRowIdx = r; }
        else if (str === 'jenis' || str === 'jenis bb') cJenis = c;
        else if (str === 'kelas' || str === 'kelas bb') cKelas = c;
        else if (str.includes('rawat')) cRawat = c;
        else if (str.includes('std forcing') || str.includes('std frc')) cStdFrc = c;
        else if (str.includes('f prod') || str.includes('frc prod')) cFProd = c;
        else if (str.includes('f max') || str.includes('frc max')) cFMax = c;
        else if (str.includes('order')) cOrder = c;
        else if (str.includes('spek')) cSpek = c;
        else if (str.includes('btg') || str.includes('jumlah')) cBtg = c;
        else if (str.includes('rit')) cRit = c;
        else if (str.includes('ket')) cKet = c;
      }
      if (cLok !== -1) break;
    }

    if (cLok === -1) cLok = 0;

    const today = new Date();
    const records: any[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[cLok]) continue;
      const lok = String(row[cLok]).trim().toUpperCase();
      if (!lok || lok === 'TOTAL' || lok.startsWith('TOTAL')) continue;

      const wil = cWil !== -1 && row[cWil] ? String(row[cWil]).trim().toUpperCase() : null;
      const jenisBB = cJenis !== -1 && row[cJenis] ? String(row[cJenis]).trim() : null;
      const kelasBB = cKelas !== -1 && row[cKelas] ? String(row[cKelas]).trim() : null;
      const tglRawat = cRawat !== -1 ? parseExcelDate(row[cRawat]) : null;
      const tglStdForcing = cStdFrc !== -1 ? parseExcelDate(row[cStdFrc]) : null;
      const tglFProd = cFProd !== -1 ? parseExcelDate(row[cFProd]) : null;
      const tglFMax = cFMax !== -1 ? parseExcelDate(row[cFMax]) : null;
      const tglOrder = cOrder !== -1 ? parseExcelDate(row[cOrder]) : null;

      let umurForcing = null;
      if (tglFMax) {
        const diffMs = today.getTime() - tglFMax.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        umurForcing = Math.round(diffDays / 30.4);
      }

      const spekBB = cSpek !== -1 && row[cSpek] ? String(row[cSpek]).trim() : (jenisBB && kelasBB ? `${jenisBB} ${kelasBB}` : 'Sucker No. 2');
      const btg = cBtg !== -1 ? cleanNum(row[cBtg]) : 0;
      const rit = cRit !== -1 ? cleanNum(row[cRit]) : 0;
      const ket = cKet !== -1 && row[cKet] ? String(row[cKet]).trim() : null;

      records.push({
        wilayah: wil,
        lokasi: lok,
        jenisBB,
        kelasBB,
        spekBB,
        tglRawat,
        tglStdForcing,
        tglFProd,
        tglFMax,
        tglOrder,
        umurForcing,
        permintaanRitaseBtg: btg,
        permintaanRitaseRit: rit,
        keterangan: ket,
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data list sulam yang valid untuk diimpor.' },
        { status: 400 }
      );
    }

    if (mode === 'full_replace') {
      await prisma.listSulam.deleteMany({});
      for (let i = 0; i < records.length; i += 200) {
        await prisma.listSulam.createMany({ data: records.slice(i, i + 200) });
      }
    } else {
      for (const rec of records) {
        await prisma.listSulam.upsert({
          where: { lokasi: rec.lokasi },
          create: rec,
          update: rec,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${records.length} data list sulam (${mode === 'full_replace' ? 'Replace All' : 'Tambah Data'}).`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/sulam/master-list:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses unggahan data list sulam.' },
      { status: 500 }
    );
  }
}

