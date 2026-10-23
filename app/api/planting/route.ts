import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncPlantingToStokLahan, calculateEstSelesaiAndLeadtime } from '@/lib/tanamSyncService';

const MONTHS_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDateTimestamp(str: string | null | undefined): number | null {
  if (!str || str === '-' || str.trim() === '') return null;
  const s = str.trim();
  const parts = s.split('-');
  if (parts.length === 3) {
    if (isNaN(Number(parts[0]))) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d).getTime();
    } else {
      const d = parseInt(parts[0], 10);
      const mStr = parts[1].toLowerCase().slice(0, 3);
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      const m = MONTHS_MAP[mStr];
      if (!isNaN(d) && m !== undefined && !isNaN(y)) return new Date(y, m, d).getTime();
    }
  } else if (parts.length === 2) {
    const d = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const m = MONTHS_MAP[mStr];
    if (!isNaN(d) && m !== undefined) return new Date(2026, m, d).getTime();
  }
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const jenisBibit = searchParams.get('jenisBibit') || 'ALL';
    const kelasBibit = searchParams.get('kelasBibit') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const isAll = searchParams.get('all') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = isAll ? 5000 : Math.min(500, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = (searchParams.get('sortOrder') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    const where: any = {};

    // Multi-select jenisBibit
    if (jenisBibit && jenisBibit !== 'ALL') {
      const list = jenisBibit.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        where.jenisBibit = list[0];
      } else if (list.length > 1) {
        where.jenisBibit = { in: list };
      }
    }

    // Multi-select kelasBibit
    if (kelasBibit && kelasBibit !== 'ALL') {
      const list = kelasBibit.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        where.kelasBibit = list[0];
      } else if (list.length > 1) {
        where.kelasBibit = { in: list };
      }
    }

    // Multi-select status
    if (status && status !== 'ALL') {
      const list = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        where.status = list[0];
      } else if (list.length > 1) {
        where.status = { in: list };
      }
    }

    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { jenisBibit: { contains: search, mode: 'insensitive' } },
        { kelasBibit: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { estSelesai: { contains: search, mode: 'insensitive' } },
        { awalTanam: { contains: search, mode: 'insensitive' } },
      ];
    }

    const isDateSort = sortBy === 'awalTanam' || sortBy === 'estSelesai';

    // Parallel fetch: data, total count, and summary stats
    let total = 0;
    let data: any[] = [];
    let allSummary: any[] = [];
    let distinctJenis: any[] = [];
    let distinctKelas: any[] = [];
    let distinctStatus: any[] = [];

    if (isDateSort) {
      const [totalCount, allMatchingRows, summaryRows, dJenis, dKelas, dStatus] = await Promise.all([
        prisma.planting.count({ where }),
        prisma.planting.findMany({ where }),
        prisma.planting.findMany({
          select: {
            luas: true,
            realTanam: true,
            sisa: true,
            progress: true,
            leadtime: true,
            status: true,
            awalTanam: true,
          },
        }),
        prisma.planting.findMany({
          where: { jenisBibit: { not: null } },
          distinct: ['jenisBibit'],
          select: { jenisBibit: true },
        }),
        prisma.planting.findMany({
          where: { kelasBibit: { not: null } },
          distinct: ['kelasBibit'],
          select: { kelasBibit: true },
        }),
        prisma.planting.findMany({
          where: { status: { not: null } },
          distinct: ['status'],
          select: { status: true },
        }),
      ]);

      total = totalCount;
      allSummary = summaryRows;
      distinctJenis = dJenis;
      distinctKelas = dKelas;
      distinctStatus = dStatus;

      allMatchingRows.sort((a: any, b: any) => {
        const ta = parseDateTimestamp(a[sortBy]);
        const tb = parseDateTimestamp(b[sortBy]);
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1;
        if (tb === null) return -1;
        return sortOrder === 'asc' ? ta - tb : tb - ta;
      });

      data = isAll ? allMatchingRows : allMatchingRows.slice((page - 1) * limit, page * limit);
    } else {
      // Build orderBy
      const orderBy: any = {};
      if (['lokasi', 'luas', 'realTanam', 'sisa', 'progress', 'leadtime', 'status', 'id', 'jenisBibit', 'kelasBibit'].includes(sortBy)) {
        orderBy[sortBy] = sortOrder;
      } else {
        orderBy.id = 'asc';
      }

      const [totalCount, queryData, summaryRows, dJenis, dKelas, dStatus] = await Promise.all([
        prisma.planting.count({ where }),
        prisma.planting.findMany({
          where,
          skip: isAll ? 0 : (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        prisma.planting.findMany({
          select: {
            luas: true,
            realTanam: true,
            sisa: true,
            progress: true,
            leadtime: true,
            status: true,
            awalTanam: true,
          },
        }),
        prisma.planting.findMany({
          where: { jenisBibit: { not: null } },
          distinct: ['jenisBibit'],
          select: { jenisBibit: true },
        }),
        prisma.planting.findMany({
          where: { kelasBibit: { not: null } },
          distinct: ['kelasBibit'],
          select: { kelasBibit: true },
        }),
        prisma.planting.findMany({
          where: { status: { not: null } },
          distinct: ['status'],
          select: { status: true },
        }),
      ]);

      total = totalCount;
      data = queryData;
      allSummary = summaryRows;
      distinctJenis = dJenis;
      distinctKelas = dKelas;
      distinctStatus = dStatus;
    }

    // KPI Metrics calculation
    const totalLokasi = allSummary.length;
    let totalLuas = 0;
    let totalRealTanam = 0; // Poin 2 (Opsi A): Hitungan 1 tahun (2026)
    let totalRealTanamAll = 0; // Akumulatif seluruh tahun
    let totalSisa = 0;
    let prosesProgressSum = 0;
    let prosesProgressCount = 0;
    let leadtimeSum = 0;
    let leadtimeCount = 0;
    let selesaiCount = 0;
    let cekSelesaiCount = 0;
    let prosesCount = 0;
    let belumCount = 0;

    const isYear2026 = (awal: string | null | undefined): boolean => {
      if (!awal) return false;
      const parts = awal.trim().split('-');
      if (parts.length === 3) {
        const yr = parts[2].trim();
        return yr === '26' || yr === '2026';
      }
      return false;
    };

    for (const item of allSummary) {
      totalLuas += item.luas || 0;
      totalRealTanamAll += item.realTanam || 0;

      // Poin 2 (Opsi A): Hitungan Real Tanam dalam 1 tahun (2026)
      if (isYear2026(item.awalTanam)) {
        totalRealTanam += item.realTanam || 0;
      }

      const cleanSisa = item.status === 'SELESAI' ? 0 : Math.max(0, Number(((item.luas || 0) - (item.realTanam || 0)).toFixed(2)));
      totalSisa += cleanSisa;

      // Poin 4: Rerata progress hanya untuk yang statusnya masih proses (PROSES / CEK SELESAI / < 100%)
      if (item.status === 'PROSES' || item.status === 'CEK SELESAI' || (item.progress > 0 && item.progress < 100)) {
        prosesProgressSum += item.progress || 0;
        prosesProgressCount++;
      }

      // Poin 5: Rerata leadtime hanya untuk petak yang progressnya 100% (SELESAI)
      if ((item.progress >= 100 || item.status === 'SELESAI') && item.leadtime !== null && item.leadtime !== undefined) {
        leadtimeSum += item.leadtime;
        leadtimeCount++;
      }

      if (item.status === 'SELESAI') selesaiCount++;
      else if (item.status === 'CEK SELESAI') cekSelesaiCount++;
      else if (item.status === 'PROSES') prosesCount++;
      else belumCount++;
    }

    const avgProgress = prosesProgressCount > 0 ? Number((prosesProgressSum / prosesProgressCount).toFixed(1)) : 0;
    const avgLeadtime = leadtimeCount > 0 ? Math.round(leadtimeSum / leadtimeCount) : 0;

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalLokasi,
        totalLuas: Number(totalLuas.toFixed(3)),
        totalRealTanam: Number(totalRealTanam.toFixed(2)),
        totalRealTanamAll: Number(totalRealTanamAll.toFixed(2)),
        totalSisa: Number(totalSisa.toFixed(2)),
        avgProgress,
        avgLeadtime,
        selesaiCount,
        cekSelesaiCount,
        prosesCount,
        belumCount,
      },
      filters: {
        jenisBibit: distinctJenis.map((d) => d.jenisBibit).filter(Boolean),
        kelasBibit: distinctKelas.map((d) => d.kelasBibit).filter(Boolean),
        status: distinctStatus.map((d) => d.status).filter(Boolean),
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching planting data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, luas, realTanam, jenisBibit, kelasBibit, awalTanam, estSelesai } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const existing = await prisma.planting.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Data not found' }, { status: 404 });
    }

    const finalLuas = luas !== undefined ? Number(Number(luas).toFixed(2)) : existing.luas;
    const finalReal = realTanam !== undefined ? Number(Number(realTanam).toFixed(2)) : (existing.realTanam || 0);
    const finalJenis = jenisBibit !== undefined ? jenisBibit : existing.jenisBibit;
    const finalKelas = kelasBibit !== undefined ? kelasBibit : existing.kelasBibit;
    let finalAwal = awalTanam !== undefined ? (awalTanam ? String(awalTanam).trim() : null) : existing.awalTanam;
    let finalEst = estSelesai !== undefined ? (estSelesai ? String(estSelesai).trim() : null) : existing.estSelesai;

    // RUMUS 2: % Progress (Kolom K) = (Real Tanam / Luas) * 100
    let progress = 0;
    if (finalLuas > 0) {
      progress = Number(((finalReal / finalLuas) * 100).toFixed(1));
    }

    // STATUS OTOMATIS (3 Status: SELESAI >= 100%, CEK SELESAI > 95% s/d < 100%, PROSES <= 95%)
    let status = 'PROSES';
    if (progress >= 100 || (finalLuas > 0 && finalReal >= finalLuas)) {
      status = 'SELESAI';
      if (progress < 100) progress = 100;
    } else if (progress > 95) {
      status = 'CEK SELESAI';
    } else if (finalReal > 0 || progress > 0) {
      status = 'PROSES';
    } else {
      status = 'BELUM TANAM';
    }

    // RUMUS 1: Sisa (Kolom I) = Luas - Real Tanam (Khusus PROSES / CEK SELESAI bernilai positif sisa, SELESAI = 0)
    const sisa = status === 'SELESAI' ? 0 : Math.max(0, Number((finalLuas - finalReal).toFixed(2)));

    // RUMUS 3 & 4: Proyeksi Estimasi Selesai & Leadtime (Rumus Pengguna: Max Tanggal Detail + Sisa / Kapasitas Mayoritas)
    const { estSelesai: calculatedEst, leadtime: calculatedLead } = await calculateEstSelesaiAndLeadtime({
      lokasi: existing.lokasi,
      sisa,
      status,
      awalTanam: finalAwal,
      existingEstSelesai: existing.estSelesai,
      overrideEstSelesai: estSelesai !== undefined ? (estSelesai ? String(estSelesai).trim() : null) : undefined,
      jenisBibit: finalJenis,
    });
    finalEst = calculatedEst;
    const leadtime = calculatedLead;

    const updated = await prisma.planting.update({
      where: { id: Number(id) },
      data: {
        luas: finalLuas,
        realTanam: finalReal,
        jenisBibit: finalJenis,
        kelasBibit: finalKelas,
        awalTanam: finalAwal,
        estSelesai: finalEst,
        sisa,
        progress,
        status,
        leadtime,
      },
    });

    // Auto-sync real-time ke StokLahanMaster dan Land
    try {
      await syncPlantingToStokLahan(existing.lokasi);
    } catch (syncErr) {
      console.error('Error syncing planting to stok lahan:', syncErr);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Data berhasil diperbarui dengan rumus otomatis',
    });
  } catch (error: any) {
    console.error('Error updating planting record:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lokasi, luas, jenisBibit, kelasBibit, awalTanam, wilayah } = body;

    if (!lokasi || String(lokasi).trim() === '') {
      return NextResponse.json({ success: false, error: 'Nama lokasi wajib diisi.' }, { status: 400 });
    }
    const cleanLokasi = String(lokasi).trim().toUpperCase();

    const cleanLuas = Number(Number(luas).toFixed(2));
    if (isNaN(cleanLuas) || cleanLuas <= 0) {
      return NextResponse.json({ success: false, error: 'Luas lahan harus berupa angka lebih dari 0.' }, { status: 400 });
    }

    // Cek apakah lokasi sudah ada di Planting
    const existing = await prisma.planting.findFirst({
      where: { lokasi: cleanLokasi },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Petak lokasi ${cleanLokasi} sudah terdaftar di tabel Real Tanam Nanas.` },
        { status: 400 }
      );
    }

    const cleanJenis = jenisBibit ? String(jenisBibit).trim() : 'Crown';
    const cleanKelas = kelasBibit ? String(kelasBibit).trim() : 'Standar';
    const cleanAwal = awalTanam ? String(awalTanam).trim() : null;
    const realTanam = 0;
    const sisa = cleanLuas;
    const progress = 0;
    const status = 'BELUM TANAM';

    // Hitung Est. Selesai dan Leadtime berdasarkan rumus
    const { estSelesai, leadtime } = await calculateEstSelesaiAndLeadtime({
      lokasi: cleanLokasi,
      sisa,
      status,
      awalTanam: cleanAwal,
      jenisBibit: cleanJenis,
    });

    const created = await prisma.planting.create({
      data: {
        lokasi: cleanLokasi,
        luas: cleanLuas,
        realTanam,
        sisa,
        progress,
        status,
        jenisBibit: cleanJenis,
        kelasBibit: cleanKelas,
        awalTanam: cleanAwal,
        estSelesai,
        leadtime,
      },
    });

    // Auto-sync ke StokLahanMaster dan Land jika ada
    try {
      await syncPlantingToStokLahan(cleanLokasi);
    } catch (syncErr) {
      console.error('Error syncing new planting to stok lahan:', syncErr);
    }

    return NextResponse.json({
      success: true,
      data: created,
      message: `Petak lokasi ${cleanLokasi} berhasil ditambahkan ke Real Tanam Nanas.`,
    });
  } catch (error: any) {
    console.error('Error creating planting record:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
