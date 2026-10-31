const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper untuk parse tanggal
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

async function syncAllRawToPlanting() {
  console.log('--- RECONCILING RAW TRANSACTIONS (Input Real Tanam) TO PLANTING ---');
  
  // Ambil semua lokasi unik beraktivitas tanam dari PlantingDetail
  const rawLocs = await prisma.plantingDetail.findMany({
    where: { aktivitas: { contains: 'tanam', mode: 'insensitive' } },
    distinct: ['lokasi'],
    select: { lokasi: true }
  });

  console.log(`Ditemukan ${rawLocs.length} lokasi dengan transaksi tanam di PlantingDetail.`);

  // Hari Terakhir Laporan
  const latestDetail = await prisma.plantingDetail.findFirst({
    where: { tanggalDate: { not: null } },
    orderBy: { tanggalDate: 'desc' },
    select: { tanggalDate: true },
  });
  const maxReportDate = latestDetail?.tanggalDate ? new Date(latestDetail.tanggalDate) : new Date();

  let updatedCount = 0;

  for (const { lokasi } of rawLocs) {
    const cleanLokasi = lokasi.trim();
    if (!cleanLokasi) continue;

    const tanamTxs = await prisma.plantingDetail.findMany({
      where: {
        lokasi: { equals: cleanLokasi, mode: 'insensitive' },
        aktivitas: { contains: 'tanam', mode: 'insensitive' },
      },
      orderBy: [
        { tanggalDate: 'asc' },
        { id: 'asc' },
      ],
    });

    const sumRealTanam = Number(
      tanamTxs.reduce((sum, t) => sum + (t.total || 0), 0).toFixed(2)
    );

    let planting = await prisma.planting.findFirst({
      where: { lokasi: { equals: cleanLokasi, mode: 'insensitive' } },
    });

    let targetLuas = planting?.luas || 0;
    if (!targetLuas) {
      const land = await prisma.land.findFirst({
        where: { lokasi: { equals: cleanLokasi, mode: 'insensitive' } },
        select: { luasNetto: true, luasBruto: true },
      });
      if (land) {
        targetLuas = land.luasNetto || land.luasBruto || 0;
      } else if (tanamTxs.length > 0 && tanamTxs[0].luasNetto) {
        targetLuas = tanamTxs[0].luasNetto || 0;
      }
    }

    let progress = targetLuas > 0 ? Number(((sumRealTanam / targetLuas) * 100).toFixed(1)) : (sumRealTanam > 0 ? 100 : 0);

    let status = 'BELUM TANAM';
    if (progress >= 100 || (targetLuas > 0 && sumRealTanam >= targetLuas) || (targetLuas > 0 && Math.abs(sumRealTanam - targetLuas) <= 0.05 && sumRealTanam > 0)) {
      status = 'SELESAI';
      progress = 100;
    } else if (progress > 95) {
      status = 'CEK SELESAI';
    } else if (sumRealTanam > 0 || progress > 0) {
      status = 'PROSES';
    }

    const sisa = status === 'SELESAI' ? 0 : Math.max(0, Number((targetLuas - sumRealTanam).toFixed(2)));

    // Awal tanam
    let awalTanam = planting?.awalTanam || null;
    if (!awalTanam && tanamTxs.length > 0) {
      const firstTx = tanamTxs[0];
      if (firstTx.awalTanam) {
        awalTanam = firstTx.awalTanam;
      } else if (firstTx.tanggalDate) {
        awalTanam = formatDateString(new Date(firstTx.tanggalDate));
      } else if (firstTx.tanggal) {
        awalTanam = firstTx.tanggal;
      }
    }

    // Jenis bibit mayoritas
    let crownHa = 0;
    let suckerHa = 0;
    for (const tx of tanamTxs) {
      const j = (tx.jenisBibit || '').toLowerCase();
      if (j.includes('crown')) crownHa += tx.total || 0;
      else if (j.includes('sucker')) suckerHa += tx.total || 0;
    }
    const majorityJenis = (crownHa > 0 || suckerHa > 0) ? (crownHa >= suckerHa ? 'Crown' : 'Sucker') : (planting?.jenisBibit || 'Crown');
    const dailyRate = majorityJenis.toLowerCase().includes('crown') ? 0.2 : 0.1;

    // Est. Selesai
    let finalEst = null;
    if (status === 'SELESAI' || sisa <= 0) {
      if (planting?.estSelesai) {
        finalEst = planting.estSelesai;
      } else {
        const lastTx = tanamTxs[tanamTxs.length - 1];
        if (lastTx?.tanggalDate) {
          finalEst = formatDateString(new Date(lastTx.tanggalDate));
        } else {
          finalEst = formatDateString(maxReportDate);
        }
      }
    } else {
      const daysNeeded = Math.ceil(sisa / dailyRate);
      const estDate = new Date(maxReportDate);
      estDate.setDate(estDate.getDate() + daysNeeded);
      finalEst = formatDateString(estDate);
    }

    // Leadtime
    let leadtime = null;
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

    // Simpan ke Planting
    if (planting) {
      if (
        planting.realTanam !== sumRealTanam ||
        planting.sisa !== sisa ||
        planting.progress !== progress ||
        planting.status !== status ||
        planting.estSelesai !== finalEst ||
        planting.leadtime !== leadtime
      ) {
        await prisma.planting.update({
          where: { id: planting.id },
          data: {
            realTanam: sumRealTanam,
            luas: targetLuas,
            sisa,
            progress,
            status,
            awalTanam,
            estSelesai: finalEst,
            leadtime,
            ...(majorityJenis && !planting.jenisBibit ? { jenisBibit: majorityJenis } : {}),
          },
        });
        updatedCount++;
      }
    } else if (targetLuas > 0 || sumRealTanam > 0) {
      await prisma.planting.create({
        data: {
          lokasi: cleanLokasi,
          luas: targetLuas || sumRealTanam,
          realTanam: sumRealTanam,
          sisa,
          progress,
          status,
          awalTanam,
          estSelesai: finalEst,
          leadtime,
          jenisBibit: majorityJenis,
          kelasBibit: 'Standar',
        },
      });
      updatedCount++;
    }

    // Perbarui running akumTanam & % Tanam di PlantingDetail
    let runningAkum = 0;
    for (const tx of tanamTxs) {
      runningAkum = Number((runningAkum + (tx.total || 0)).toFixed(2));
      const runningPersen = targetLuas > 0 ? Number(((runningAkum / targetLuas) * 100).toFixed(1)) : 0;
      if (tx.akumTanam !== runningAkum || tx.persenTanam !== runningPersen || (tx.luasNetto !== targetLuas && targetLuas > 0)) {
        await prisma.plantingDetail.update({
          where: { id: tx.id },
          data: {
            akumTanam: runningAkum,
            persenTanam: runningPersen,
            ...(tx.luasNetto !== targetLuas && targetLuas > 0 ? { luasNetto: targetLuas } : {}),
          },
        });
      }
    }
  }

  console.log(`Berhasil menyinkronkan data raw ke tabel Monitoring Planting! Total lokasi diperbarui: ${updatedCount}`);
  await prisma.$disconnect();
}

syncAllRawToPlanting().catch(console.error);
