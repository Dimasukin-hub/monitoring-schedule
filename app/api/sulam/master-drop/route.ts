import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).trim().replace(/,/g, '');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
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

// GET: Ambil master data drop bibit sulam (10 kolom dengan kalkulasi otomatis)
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
        { jenisUnit: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Ambil data referensi order & spek bibit untuk enrichment real-time
    const [total, rawDrops, orders, speks] = await Promise.all([
      prisma.masterDataDropBibitSulam.count({ where }),
      prisma.masterDataDropBibitSulam.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.masterDataOrderSulam.findMany({
        select: { lokasi: true, spekBibit: true, tanggalOrder: true },
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    // Map order per lokasi (ambil data pertama yang cocok)
    const orderMap = new Map<string, { spekBibit: string | null; tanggalOrder: Date | null }>();
    for (const ord of orders) {
      const lok = ord.lokasi.trim().toUpperCase();
      if (!orderMap.has(lok)) {
        orderMap.set(lok, { spekBibit: ord.spekBibit, tanggalOrder: ord.tanggalOrder });
      }
    }

    // Map spek bibit -> CD
    const spekMap = new Map<string, number>();
    for (const sp of speks) {
      spekMap.set(sp.spekBBSulamBtg.trim().toLowerCase(), sp.cd);
    }

    const data = rawDrops.map((d) => {
      const cleanLok = d.lokasi.trim().toUpperCase();
      const matchedOrder = orderMap.get(cleanLok);

      // 5. Bibit Ordered: dari order / list sulam
      const bibitOrdered = matchedOrder?.spekBibit || d.bibitOrdered || null;

      // 6. Std Rit: cari nilai CD dari Master Data Spek Bibit Sulam
      let stdRit: number | null = null;
      if (bibitOrdered) {
        const foundCd = spekMap.get(bibitOrdered.trim().toLowerCase());
        if (foundCd !== undefined && foundCd !== null) {
          stdRit = foundCd;
        }
      }
      if (stdRit === null && d.stdRit) {
        stdRit = d.stdRit;
      }

      // 7. Jumlah Rit: ROUND((Hasil Ha * 73423) / Std Rit, 0)
      let jumlahRit: number | string = '-';
      if (d.hasilHa && d.hasilHa > 0 && stdRit && stdRit > 0) {
        jumlahRit = Math.round((d.hasilHa * 73423) / stdRit);
      } else if (d.jumlahRit !== null && d.jumlahRit !== undefined) {
        jumlahRit = d.jumlahRit;
      }

      // 9. Tanggal Order: dari order
      const tanggalOrder = matchedOrder?.tanggalOrder || d.tanggalOrder || null;

      // 10. Status Drop: perbandingan Tanggal vs Tanggal Order
      let statusDrop = '-';
      if (tanggalOrder && d.tanggal) {
        const tDrop = new Date(d.tanggal).getTime();
        const tOrder = new Date(tanggalOrder).getTime();
        if (tDrop > tOrder) {
          statusDrop = 'V';
        } else {
          statusDrop = '-';
        }
      } else if (d.statusDrop) {
        statusDrop = d.statusDrop;
      }

      return {
        id: d.id,
        lokasi: d.lokasi,
        hasilHa: d.hasilHa,
        hasilBtg: d.hasilBtg,
        tanggal: d.tanggal,
        bibitOrdered: bibitOrdered || 'data tidak ditemukan',
        stdRit: stdRit !== null ? stdRit : '-',
        jumlahRit: jumlahRit,
        jenisUnit: d.jenisUnit || 'CD',
        tanggalOrder: tanggalOrder,
        statusDrop: statusDrop,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/master-drop:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master data drop bibit sulam.' },
      { status: 500 }
    );
  }
}

// POST: Upload Excel Drop Bibit
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
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('drop')) || wb.SheetNames[0];
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

    // Ambil referensi order & spek bibit untuk perhitungan otomatis
    const [orders, speks] = await Promise.all([
      prisma.masterDataOrderSulam.findMany({
        select: { lokasi: true, spekBibit: true, tanggalOrder: true },
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    const orderMap = new Map<string, { spekBibit: string | null; tanggalOrder: Date | null }>();
    for (const ord of orders) {
      const lok = ord.lokasi.trim().toUpperCase();
      if (!orderMap.has(lok)) {
        orderMap.set(lok, { spekBibit: ord.spekBibit, tanggalOrder: ord.tanggalOrder });
      }
    }

    const spekMap = new Map<string, number>();
    for (const sp of speks) {
      spekMap.set(sp.spekBBSulamBtg.trim().toLowerCase(), sp.cd);
    }

    let headerRowIdx = 0;
    let cLokasi = -1, cHa = -1, cBtg = -1, cTanggal = -1, cUnit = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '').toLowerCase().trim();
        if (str === 'lokasi' || str === 'petak') { cLokasi = c; headerRowIdx = r; }
        else if (str.includes('ha') || str.includes('luas')) cHa = c;
        else if (str.includes('btg') || str.includes('batang')) cBtg = c;
        else if (str.includes('tgl') || str.includes('tanggal') || str.includes('date')) cTanggal = c;
        else if (str.includes('unit') || str.includes('kendaraan')) cUnit = c;
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
      const hasilBtg = cBtg !== -1 ? Math.round(cleanNum(row[cBtg])) : 0;
      const tglDrop = cTanggal !== -1 ? parseExcelDate(row[cTanggal]) : new Date();
      const jenisUnit = cUnit !== -1 && row[cUnit] ? String(row[cUnit]).trim() : 'CD';

      // 5. Bibit Ordered
      const matchedOrder = orderMap.get(lok);
      const bibitOrdered = matchedOrder?.spekBibit || null;

      // 6. Std Rit
      let stdRit: number | null = null;
      if (bibitOrdered) {
        const found = spekMap.get(bibitOrdered.trim().toLowerCase());
        if (found !== undefined && found !== null) stdRit = found;
      }

      // 7. Jumlah Rit: ROUND((Hasil Ha * 73423) / Std Rit, 0)
      let jumlahRit: number | null = null;
      if (hasilHa && hasilHa > 0 && stdRit && stdRit > 0) {
        jumlahRit = Math.round((hasilHa * 73423) / stdRit);
      }

      // 9. Tanggal Order
      const tanggalOrder = matchedOrder?.tanggalOrder || null;

      // 10. Status Drop
      let statusDrop = '-';
      if (tanggalOrder && tglDrop) {
        if (tglDrop.getTime() > tanggalOrder.getTime()) {
          statusDrop = 'V';
        } else {
          statusDrop = '-';
        }
      }

      records.push({
        lokasi: lok,
        hasilHa,
        hasilBtg,
        tanggal: tglDrop,
        bibitOrdered,
        stdRit,
        jumlahRit,
        jenisUnit,
        tanggalOrder,
        statusDrop,
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data drop bibit yang valid untuk diimpor.' },
        { status: 400 }
      );
    }

    if (mode === 'full_replace') {
      await prisma.masterDataDropBibitSulam.deleteMany({});
      for (let i = 0; i < records.length; i += 200) {
        await prisma.masterDataDropBibitSulam.createMany({ data: records.slice(i, i + 200) });
      }
    } else {
      for (const rec of records) {
        await prisma.masterDataDropBibitSulam.create({ data: rec });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${records.length} data master drop bibit sulam (${mode === 'full_replace' ? 'Replace All' : 'Tambah Data'}).`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/sulam/master-drop:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses unggahan data master drop bibit sulam.' },
      { status: 500 }
    );
  }
}
