import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    let totalRealTanam = 0;
    let totalSisa = 0;
    let progressSum = 0;
    let leadtimeSum = 0;
    let leadtimeCount = 0;
    let selesaiCount = 0;
    let cekSelesaiCount = 0;
    let prosesCount = 0;
    let belumCount = 0;

    for (const item of allSummary) {
      totalLuas += item.luas || 0;
      totalRealTanam += item.realTanam || 0;
      totalSisa += item.sisa || 0;
      progressSum += item.progress || 0;

      if (item.leadtime !== null && item.leadtime !== undefined) {
        leadtimeSum += item.leadtime;
        leadtimeCount++;
      }

      if (item.status === 'SELESAI') selesaiCount++;
      else if (item.status === 'CEK SELESAI') cekSelesaiCount++;
      else if (item.status === 'PROSES') prosesCount++;
      else belumCount++;
    }

    const avgProgress = totalLokasi > 0 ? Number((progressSum / totalLokasi).toFixed(1)) : 0;
    const avgLeadtime = leadtimeCount > 0 ? Math.round(leadtimeSum / leadtimeCount) : 0;

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalLokasi,
        totalLuas: Number(totalLuas.toFixed(3)),
        totalRealTanam: Number(totalRealTanam.toFixed(2)),
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

    // RUMUS 1: Sisa (Kolom I) = Real Tanam - Luas
    const sisa = Number((finalReal - finalLuas).toFixed(2));

    // RUMUS 3: Proyeksi Estimasi Selesai (Jika belum ada & sisa > 0)
    // Sucker: kecepatan 0.1 Ha/hari | Crown: kecepatan 0.2 Ha/hari
    if (!finalEst && sisa > 0) {
      const dailyRate = (finalJenis && finalJenis.toLowerCase().includes('crown')) ? 0.2 : 0.1;
      const daysNeeded = Math.ceil(sisa / dailyRate);
      const estDate = new Date();
      estDate.setDate(estDate.getDate() + daysNeeded);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      finalEst = `${estDate.getDate()}-${months[estDate.getMonth()]}-${String(estDate.getFullYear()).slice(-2)}`;
    }

    // RUMUS 4: Leadtime (Kolom M) = IF(progress=100%, Est_Selesai - Awal_Tanam, TODAY() - Awal_Tanam)
    let leadtime = existing.leadtime;
    if (finalAwal) {
      const parseDate = (dStr: string) => {
        if (!dStr) return null;
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const d = parseInt(parts[0], 10);
          const mStr = parts[1].toLowerCase();
          const months: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
          };
          const m = months[mStr] !== undefined ? months[mStr] : parseInt(mStr, 10) - 1;
          let y = parseInt(parts[2], 10);
          if (y < 100) y += 2000;
          return new Date(y, m, d);
        }
        const parsed = new Date(dStr);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const startDate = parseDate(finalAwal);
      if (startDate) {
        if (status === 'SELESAI' && finalEst) {
          const endDate = parseDate(finalEst);
          if (endDate) {
            const diffTime = endDate.getTime() - startDate.getTime();
            leadtime = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          }
        } else {
          const today = new Date();
          const diffTime = today.getTime() - startDate.getTime();
          leadtime = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        }
      }
    }

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
