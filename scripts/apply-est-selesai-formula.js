const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseDateString(dStr) {
  if (!dStr) return null;
  const trimmed = dStr.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase();
    const months = {
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

function formatDateString(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = String(date.getFullYear()).slice(-2);
  return `${d}-${m}-${y}`;
}

async function main() {
  console.log('=== MEMULAI SINKRONISASI RUMUS EST. SELESAI PENGGUNA ===');

  // 1. Ambil Hari Terakhir Laporan (max tanggal di detail planting)
  const latestDetail = await prisma.plantingDetail.findFirst({
    where: { tanggalDate: { not: null } },
    orderBy: { tanggalDate: 'desc' },
    select: { tanggalDate: true, tanggal: true },
  });

  if (!latestDetail || !latestDetail.tanggalDate) {
    console.error('Tidak ditemukan transaksi dengan tanggalDate di PlantingDetail');
    return;
  }

  const maxReportDate = new Date(latestDetail.tanggalDate);
  console.log(`Hari Terakhir Laporan (Max Tanggal Detail Planting): ${formatDateString(maxReportDate)} (${latestDetail.tanggal})`);

  // 2. Ambil seluruh data Planting
  const plantings = await prisma.planting.findMany({
    orderBy: { lokasi: 'asc' },
  });
  console.log(`Total lokasi di tabel Planting: ${plantings.length}`);

  // 3. Ambil seluruh transaksi tanam di PlantingDetail untuk penentuan bibit mayoritas
  const allTanamDetails = await prisma.plantingDetail.findMany({
    where: { aktivitas: { contains: 'tanam', mode: 'insensitive' } },
    select: { lokasi: true, jenisBibit: true, total: true, tanggalDate: true },
  });

  const detailsByLoc = new Map();
  for (const d of allTanamDetails) {
    if (!d.lokasi) continue;
    const loc = d.lokasi.trim().toUpperCase();
    if (!detailsByLoc.has(loc)) detailsByLoc.set(loc, []);
    detailsByLoc.get(loc).push(d);
  }

  let updatedCount = 0;
  let prosesLogs = [];

  for (const p of plantings) {
    const locKey = p.lokasi.trim().toUpperCase();
    const locDetails = detailsByLoc.get(locKey) || [];

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

    const sisa = status === 'SELESAI' ? 0 : Math.max(0, Number((luas - real).toFixed(2)));

    // Bibit mayoritas
    let crownHa = 0;
    let suckerHa = 0;
    for (const d of locDetails) {
      const j = (d.jenisBibit || '').toLowerCase();
      if (j.includes('crown')) crownHa += d.total || 0;
      else if (j.includes('sucker')) suckerHa += d.total || 0;
    }

    let majorityJenis = p.jenisBibit || 'Sucker';
    if (crownHa > 0 || suckerHa > 0) {
      majorityJenis = crownHa > suckerHa ? 'Crown' : 'Sucker';
    }
    const dailyRate = majorityJenis.toLowerCase().includes('crown') ? 0.2 : 0.1;

    let newEst = p.estSelesai;
    if (status === 'SELESAI' || sisa <= 0) {
      if (!newEst) {
        // Ambil tanggal tanam terakhir lokasi tersebut
        const sorted = [...locDetails].sort((a, b) => (b.tanggalDate?.getTime() || 0) - (a.tanggalDate?.getTime() || 0));
        if (sorted[0]?.tanggalDate) {
          newEst = formatDateString(new Date(sorted[0].tanggalDate));
        } else {
          newEst = formatDateString(maxReportDate);
        }
      }
    } else {
      // Rumus Pengguna: Max Tanggal Detail + (Sisa Luas / Kapasitas Mayoritas)
      const daysNeeded = Math.ceil(sisa / dailyRate);
      const estDate = new Date(maxReportDate);
      estDate.setDate(estDate.getDate() + daysNeeded);
      newEst = formatDateString(estDate);
    }

    // Leadtime
    let newLead = p.leadtime;
    if (p.awalTanam) {
      const startDate = parseDateString(p.awalTanam);
      if (startDate) {
        if (status === 'SELESAI' && newEst) {
          const endDate = parseDateString(newEst);
          if (endDate) {
            const diffTime = endDate.getTime() - startDate.getTime();
            newLead = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
          }
        } else {
          const diffTime = maxReportDate.getTime() - startDate.getTime();
          newLead = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
        }
      }
    }

    if (
      p.sisa !== sisa ||
      p.status !== status ||
      p.progress !== progress ||
      p.estSelesai !== newEst ||
      p.leadtime !== newLead
    ) {
      await prisma.planting.update({
        where: { id: p.id },
        data: {
          sisa,
          status,
          progress,
          estSelesai: newEst,
          leadtime: newLead,
        },
      });
      updatedCount++;

      if (status !== 'SELESAI') {
        prosesLogs.push({
          lokasi: p.lokasi,
          luas,
          real,
          sisa,
          status,
          bibit: majorityJenis,
          rate: dailyRate,
          oldEst: p.estSelesai,
          newEst,
          leadtime: newLead,
        });
      }
    }
  }

  console.log(`\nBerhasil memperbarui ${updatedCount} baris di tabel Planting.`);
  console.log('\nRincian lokasi aktif (PROSES/CEK SELESAI/BELUM TANAM) yang dihitung dengan rumus baru:');
  prosesLogs.forEach((l, i) => {
    console.log(
      `${i + 1}. [${l.lokasi}] Status: ${l.status} | Sisa: ${l.sisa} Ha | Mayoritas: ${l.bibit} (${l.rate} Ha/hr) | Est. Selesai: ${l.oldEst} -> ${l.newEst} | Leadtime: ${l.leadtime} hr`
    );
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error in script:', err);
  process.exit(1);
});
