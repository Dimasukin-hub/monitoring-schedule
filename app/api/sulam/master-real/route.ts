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

// GET: Ambil data master real sulam
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { bibitOrdered: { contains: search, mode: 'insensitive' } },
      ];
    }

    const yearParam = searchParams.get('year');
    const startMonthParam = searchParams.get('startMonth');
    const endMonthParam = searchParams.get('endMonth');
    if (yearParam !== null && startMonthParam !== null && endMonthParam !== null) {
      const year = parseInt(yearParam, 10);
      const startMonth = parseInt(startMonthParam, 10);
      const endMonth = parseInt(endMonthParam, 10);
      if (!isNaN(year) && !isNaN(startMonth) && !isNaN(endMonth)) {
        const minM = Math.min(startMonth, endMonth);
        const maxM = Math.max(startMonth, endMonth);
        const startDate = new Date(Date.UTC(year, minM, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, maxM + 1, 0, 23, 59, 59, 999));
        where.tanggal = { gte: startDate, lte: endDate };
      }
    }

    const [total, rawData, listSulam, allSpek] = await Promise.all([
      prisma.masterDataRealSulam.count({ where }),
      prisma.masterDataRealSulam.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.listSulam.findMany({
        select: { lokasi: true, spekBibit: true },
      }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    // Map List Sulam untuk lookup Bibit Ordered
    const listSulamMap = new Map<string, string>();
    for (const l of listSulam) {
      if (l.spekBibit) listSulamMap.set(l.lokasi.trim().toUpperCase(), l.spekBibit.trim());
    }

    // Map Spek BB untuk lookup Std Rit CD
    const spekMap = new Map<string, number>();
    for (const s of allSpek) {
      spekMap.set(s.spekBBSulamBtg.toLowerCase().trim(), s.cd);
    }

    // Transform data sesuai aturan 5, 6, 7
    const transformed = rawData.map((d) => {
      const cleanLok = d.lokasi.trim().toUpperCase();

      // Aturan 5: Bibit Ordered
      // Sistem mengambil data Spek BB secara otomatis berdasarkan lokasi dari List Sulam
      let bibitOrdered = d.bibitOrdered;
      if (!bibitOrdered || bibitOrdered === '-' || bibitOrdered === '0') {
        bibitOrdered = listSulamMap.get(cleanLok) || '-';
      }

      // Aturan 6: Std Rit (Nilai CD dari Spek BB)
      let stdRit = d.stdRit;
      if (!stdRit || stdRit === 0) {
        if (bibitOrdered && bibitOrdered !== '-') {
          stdRit = spekMap.get(bibitOrdered.toLowerCase().trim()) || null;
        }
      }

      // Aturan 7: Rit Planted
      // Math.ceil(Hasil Btg / Std Rit)
      let ritPlanted = d.ritPlanted;
      if (ritPlanted === null || ritPlanted === undefined) {
        if (stdRit && stdRit > 0 && d.hasilBtg > 0) {
          ritPlanted = Math.ceil(d.hasilBtg / stdRit);
        } else {
          ritPlanted = null;
        }
      }

      return {
        id: d.id,
        lokasi: d.lokasi,
        hasilHa: d.hasilHa,
        hasilBtg: d.hasilBtg,
        tanggal: d.tanggal,
        bibitOrdered: bibitOrdered || '-',
        stdRit: stdRit !== null && stdRit !== undefined ? stdRit : '-',
        ritPlanted: ritPlanted !== null && ritPlanted !== undefined ? ritPlanted : '-',
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
    console.error('Error in GET /api/sulam/master-real:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master data real sulam.' },
      { status: 500 }
    );
  }
}

// POST: Upload Excel Master Data Real Sulam
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
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('real') && !s.toLowerCase().includes('drop')) || wb.SheetNames[0];
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

    // Ambil referensi List Sulam & Spek BB untuk kalkulasi otomatis
    const [listSulam, allSpek] = await Promise.all([
      prisma.listSulam.findMany({ select: { lokasi: true, spekBibit: true } }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);
    const listSulamMap = new Map<string, string>();
    for (const l of listSulam) {
      if (l.spekBibit) listSulamMap.set(l.lokasi.trim().toUpperCase(), l.spekBibit.trim());
    }
    const spekMap = new Map<string, number>();
    for (const s of allSpek) {
      spekMap.set(s.spekBBSulamBtg.toLowerCase().trim(), s.cd);
    }

    let headerRowIdx = 0;
    let cLokasi = -1, cHa = -1, cBtg = -1, cTgl = -1, cBibitOrdered = -1, cStdRit = -1, cRitPlanted = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '').toLowerCase().trim();
        if (str === 'lokasi' || str === 'petak') { cLokasi = c; headerRowIdx = r; }
        else if (str.includes('ha') || str.includes('luas')) cHa = c;
        else if (str.includes('btg') || str.includes('batang')) cBtg = c;
        else if (str.includes('tgl') || str.includes('tanggal') || str.includes('date')) cTgl = c;
        else if (str.includes('ordered') || str.includes('bibit')) cBibitOrdered = c;
        else if (str.includes('std rit') || str.includes('std')) cStdRit = c;
        else if (str.includes('planted') || str.includes('rit')) cRitPlanted = c;
      }
      if (cLokasi !== -1) break;
    }

    if (cLokasi === -1) cLokasi = 0;

    const records: any[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[cLokasi]) continue;
      const lok = String(row[cLokasi]).trim().toUpperCase();
      if (!lok || lok === 'TOTAL' || lok.startsWith('TOTAL')) continue;

      const hasilHa = cHa !== -1 && row[cHa] ? parseFloat(row[cHa]) || null : null;
      const hasilBtg = cBtg !== -1 ? cleanNum(row[cBtg]) : 0;
      const tgl = cTgl !== -1 ? parseExcelDate(row[cTgl]) : new Date();

      // Aturan 5: Bibit Ordered
      let bibitOrdered = cBibitOrdered !== -1 && row[cBibitOrdered] ? String(row[cBibitOrdered]).trim() : null;
      if (!bibitOrdered || bibitOrdered === '-' || bibitOrdered === '0') {
        bibitOrdered = listSulamMap.get(lok) || null;
      }

      // Aturan 6: Std Rit (CD dari Spek BB)
      let stdRit = cStdRit !== -1 && row[cStdRit] ? cleanNum(row[cStdRit]) : null;
      if (!stdRit || stdRit === 0) {
        if (bibitOrdered) {
          stdRit = spekMap.get(bibitOrdered.toLowerCase().trim()) || null;
        }
      }

      // Aturan 7: Rit Planted
      let ritPlanted = cRitPlanted !== -1 && row[cRitPlanted] ? cleanNum(row[cRitPlanted]) : null;
      if (!ritPlanted || ritPlanted === 0) {
        if (stdRit && stdRit > 0 && hasilBtg > 0) {
          ritPlanted = Math.ceil(hasilBtg / stdRit);
        } else {
          ritPlanted = null;
        }
      }

      records.push({
        lokasi: lok,
        hasilHa,
        hasilBtg,
        tanggal: tgl,
        bibitOrdered,
        stdRit,
        ritPlanted,
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data real sulam yang valid untuk diimpor.' },
        { status: 400 }
      );
    }

    if (mode === 'full_replace') {
      await prisma.masterDataRealSulam.deleteMany({});
      for (let i = 0; i < records.length; i += 200) {
        await prisma.masterDataRealSulam.createMany({ data: records.slice(i, i + 200) });
      }
    } else {
      for (const rec of records) {
        await prisma.masterDataRealSulam.create({ data: rec });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${records.length} data master real sulam (${mode === 'full_replace' ? 'Replace All' : 'Tambah Data'}).`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/sulam/master-real:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses unggahan data master real sulam.' },
      { status: 500 }
    );
  }
}

