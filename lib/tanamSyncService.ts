import { prisma } from '@/lib/prisma';

export interface SyncTanamResult {
  lokasi: string;
  status: string;
  progress: number;
  category: 'PROSES' | 'SELESAI';
  updatedLand: boolean;
  updatedMaster: boolean;
}

/**
 * Menghitung sisa tanam yang benar:
 * Sisa = status === 'SELESAI' ? 0 : Math.max(0, Number((luas - realTanam).toFixed(2)))
 */
export function calculatePlantingSisa(luas: number, realTanam: number, status?: string): number {
  if (status === 'SELESAI') return 0;
  const raw = Number((luas - realTanam).toFixed(2));
  return Math.max(0, raw);
}

/**
 * Helper untuk parse string tanggal ke Date
 */
export function parseDateString(dStr: string | null | undefined): Date | null {
  if (!dStr) return null;
  const trimmed = dStr.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase();
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const m = months[mStr] !== undefined ? months[mStr] : parseInt(mStr, 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    return new Date(y, m, d);
  }
  const slashParts = trimmed.split('/');
  if (slashParts.length === 3) {
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10) - 1;
    let y = parseInt(slashParts[2], 10);
    if (y < 100) y += 2000;
    return new Date(y, m, d);
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateString(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = String(date.getFullYear()).slice(-2);
  return `${d}-${m}-${y}`;
}

/**
 * Menghitung Est. Selesai dan Leadtime berdasarkan rumus pengguna:
 * Est. Selesai = Hari Terakhir Laporan (max tanggal di detail planting) + (Sisa Luas / Kapasitas Tanam per Hari Mayoritas)
 */
export async function calculateEstSelesaiAndLeadtime(params: {
  lokasi: string;
  sisa: number;
  status: string;
  awalTanam?: string | null;
  existingEstSelesai?: string | null;
  jenisBibit?: string | null;
  overrideEstSelesai?: string | null;
}): Promise<{ estSelesai: string | null; leadtime: number | null }> {
  const { lokasi, sisa, status, awalTanam, existingEstSelesai, jenisBibit, overrideEstSelesai } = params;

  // 1. Ambil Hari Terakhir Laporan (max tanggal di detail planting)
  const latestDetail = await prisma.plantingDetail.findFirst({
    where: { tanggalDate: { not: null } },
    orderBy: { tanggalDate: 'desc' },
    select: { tanggalDate: true },
  });
  const maxReportDate = latestDetail?.tanggalDate ? new Date(latestDetail.tanggalDate) : new Date();

  // 2. Tentukan bibit mayoritas dan kapasitasnya
  const details = await prisma.plantingDetail.findMany({
    where: {
      lokasi: { equals: lokasi.trim(), mode: 'insensitive' },
      aktivitas: { contains: 'tanam', mode: 'insensitive' },
    },
    select: { jenisBibit: true, total: true },
  });

  let crownHa = 0;
  let suckerHa = 0;
  for (const d of details) {
    const j = (d.jenisBibit || '').toLowerCase();
    if (j.includes('crown')) crownHa += d.total || 0;
    else if (j.includes('sucker')) suckerHa += d.total || 0;
  }

  let majorityJenis = jenisBibit || 'Sucker';
  if (crownHa > 0 || suckerHa > 0) {
    majorityJenis = crownHa > suckerHa ? 'Crown' : 'Sucker';
  }
  const dailyRate = majorityJenis.toLowerCase().includes('crown') ? 0.2 : 0.1;

  // 3. Hitung Est. Selesai
  let finalEst: string | null = null;
  if (overrideEstSelesai !== undefined && overrideEstSelesai !== null) {
    finalEst = overrideEstSelesai;
  } else if (status === 'SELESAI' || sisa <= 0) {
    if (existingEstSelesai) {
      finalEst = existingEstSelesai;
    } else {
      const locLastTx = await prisma.plantingDetail.findFirst({
        where: {
          lokasi: { equals: lokasi.trim(), mode: 'insensitive' },
          aktivitas: { contains: 'tanam', mode: 'insensitive' },
          tanggalDate: { not: null },
        },
        orderBy: { tanggalDate: 'desc' },
        select: { tanggalDate: true },
      });
      if (locLastTx?.tanggalDate) {
        finalEst = formatDateString(new Date(locLastTx.tanggalDate));
      } else {
        finalEst = formatDateString(maxReportDate);
      }
    }
  } else {
    // Rumus: Sisa Luas / Kapasitas Tanam per Hari Mayoritas + Hari Terakhir Laporan
    const daysNeeded = Math.ceil(sisa / dailyRate);
    const estDate = new Date(maxReportDate);
    estDate.setDate(estDate.getDate() + daysNeeded);
    finalEst = formatDateString(estDate);
  }

  // 4. Hitung Leadtime
  let leadtime: number | null = null;
  if (awalTanam) {
    const startDate = parseDateString(awalTanam);
    if (startDate) {
      if (status === 'SELESAI' && finalEst) {
        const endDate = parseDateString(finalEst);
        if (endDate) {
          const diffTime = endDate.getTime() - startDate.getTime();
          leadtime = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        }
      } else {
        const diffTime = maxReportDate.getTime() - startDate.getTime();
        leadtime = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      }
    }
  }

  return {
    estSelesai: finalEst || null,
    leadtime,
  };
}

/**
 * Sinkronisasi satu lokasi dari data Real Tanam Nanas (Planting)
 * ke tabel StokLahanMaster dan Land secara otomatis.
 */
export async function syncPlantingToStokLahan(lokasi: string): Promise<SyncTanamResult | null> {
  const cleanLokasi = lokasi.trim();
  const planting = await prisma.planting.findFirst({
    where: { lokasi: cleanLokasi },
  });

  if (!planting) return null;

  const luas = planting.luas || 0;
  const real = planting.realTanam || 0;
  let progress = luas > 0 ? Number(((real / luas) * 100).toFixed(1)) : 0;

  // Standar 3 Status: SELESAI >= 100%, CEK SELESAI > 95% s/d < 100%, PROSES <= 95%
  let status = planting.status || 'PROSES';
  if (progress >= 100 || (luas > 0 && real >= luas) || (Math.abs(real - luas) <= 0.05 && real > 0)) {
    status = 'SELESAI';
    progress = 100;
  } else if (progress > 95) {
    status = 'CEK SELESAI';
  } else if (real > 0 || progress > 0) {
    status = 'PROSES';
  } else {
    status = 'BELUM TANAM';
  }

  const sisa = status === 'SELESAI' ? 0 : Math.max(0, Number((luas - real).toFixed(2)));

  // Hitung Est. Selesai dan Leadtime berdasarkan rumus baru
  const { estSelesai, leadtime } = await calculateEstSelesaiAndLeadtime({
    lokasi: cleanLokasi,
    sisa,
    status,
    awalTanam: planting.awalTanam,
    existingEstSelesai: planting.estSelesai,
    jenisBibit: planting.jenisBibit,
  });

  // Update record planting jika ada perubahan
  if (
    planting.sisa !== sisa ||
    planting.status !== status ||
    planting.progress !== progress ||
    planting.estSelesai !== estSelesai ||
    planting.leadtime !== leadtime
  ) {
    await prisma.planting.update({
      where: { id: planting.id },
      data: { sisa, status, progress, estSelesai, leadtime },
    });
  }

  // Tentukan label kategori untuk StokLahanMaster & Land
  const isSelesai = status === 'SELESAI';
  const isCekSelesai = status === 'CEK SELESAI';
  const category = isSelesai ? 'SELESAI' : 'PROSES';
  const aplikasiTerakhir = isSelesai
    ? 'Selesai Tanam'
    : isCekSelesai
    ? 'Cek Selesai'
    : 'Proses Tanam';
  const statusAplikasi = isSelesai
    ? '24.Sls Tanam'
    : isCekSelesai
    ? 'Cek Selesai'
    : '23.Proses Tnm';

  // Update StokLahanMaster jika ada
  let updatedMaster = false;
  const existingMaster = await prisma.stokLahanMaster.findFirst({
    where: { lokasi: cleanLokasi },
  });

  if (existingMaster) {
    await prisma.stokLahanMaster.update({
      where: { id: existingMaster.id },
      data: {
        category,
        progressTanam: progress,
        aplikasiTerakhir,
        statusAplikasi,
        ...(planting.awalTanam && !existingMaster.realMulaiTanam ? { realMulaiTanam: planting.awalTanam } : {}),
        ...(isSelesai && (planting.estSelesai || planting.awalTanam) ? { realSelesaiTanam: planting.estSelesai || planting.awalTanam } : {}),
      },
    });
    updatedMaster = true;
  }

  // Update Land jika ada
  let updatedLand = false;
  const existingLand = await prisma.land.findFirst({
    where: { lokasi: cleanLokasi },
  });

  if (existingLand) {
    await prisma.land.update({
      where: { id: existingLand.id },
      data: {
        progressTanam: progress,
        aplikasiTerakhir,
        statusAplikasi,
        ...(planting.awalTanam && !existingLand.realMulaiTanam ? { realMulaiTanam: planting.awalTanam } : {}),
        ...(isSelesai && (planting.estSelesai || planting.awalTanam) ? { realSelesaiTanam: planting.estSelesai || planting.awalTanam } : {}),
      },
    });
    updatedLand = true;
  }

  return {
    lokasi: cleanLokasi,
    status,
    progress,
    category,
    updatedLand,
    updatedMaster,
  };
}

/**
 * Sinkronisasi seluruh lokasi dari Planting ke StokLahanMaster dan Land
 * sekaligus membersihkan/menormalisasi nilai sisa negatif di database.
 */
export async function syncAllPlantingsToStokLahan(): Promise<{ synced: number; fixedSisa: number }> {
  const plantings = await prisma.planting.findMany();
  let synced = 0;
  let fixedSisa = 0;

  for (const p of plantings) {
    const luas = p.luas || 0;
    const real = p.realTanam || 0;
    let progress = luas > 0 ? Number(((real / luas) * 100).toFixed(1)) : 0;

    let status = p.status || 'PROSES';
    if (progress >= 100 || (luas > 0 && real >= luas) || (Math.abs(real - luas) <= 0.05 && real > 0)) {
      status = 'SELESAI';
      progress = 100;
    } else if (progress > 95) {
      status = 'CEK SELESAI';
    } else if (real > 0 || progress > 0) {
      status = 'PROSES';
    } else {
      status = 'BELUM TANAM';
    }

    const correctSisa = status === 'SELESAI' ? 0 : Math.max(0, Number((luas - real).toFixed(2)));
    if (p.sisa !== correctSisa || p.status !== status || p.progress !== progress) {
      await prisma.planting.update({
        where: { id: p.id },
        data: { sisa: correctSisa, status, progress },
      });
      fixedSisa++;
    }

    const res = await syncPlantingToStokLahan(p.lokasi);
    if (res && (res.updatedLand || res.updatedMaster)) {
      synced++;
    }
  }

  return { synced, fixedSisa };
}
