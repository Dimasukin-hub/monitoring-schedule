import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recalculateAndPersistStageStocks, syncStokLahanMasterForLand } from '@/lib/stageStockCalculator';
import { computeAktivitasTerakhir, computeRencanaBeroBongkar, isValidDate } from '@/lib/landActivityUtils';
import { getLandStokCategory } from '@/lib/landClassification';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const wilayahParam = searchParams.get('wilayah');
    const searchParam = searchParams.get('search')?.trim();

    const targetYear = yearParam ? parseInt(yearParam, 10) : 2026;

    const where: any = {};
    if (targetYear) {
      where.year = targetYear;
    }
    if (wilayahParam && wilayahParam !== 'ALL') {
      const wList = wilayahParam.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        where.wilayah = wList[0];
      } else if (wList.length > 1) {
        where.wilayah = { in: wList };
      }
    }
    if (searchParam) {
      where.OR = [
        { lokasi: { contains: searchParam, mode: 'insensitive' } },
        { wilayah: { contains: searchParam, mode: 'insensitive' } },
        { status: { contains: searchParam, mode: 'insensitive' } },
      ];
    }

    const lands = await prisma.land.findMany({
      where,
      select: {
        id: true,
        lokasi: true,
        wilayah: true,
        year: true,
        luasBruto: true,
        luasNetto: true,
        status: true,
        eks: true,
        sejarah: true,
        jenisBibit: true,
        kelasBibit: true,
        bulanTanam: true,
        aplikasiTerakhir: true,
        statusAplikasi: true,
        rencBkr: true,
        rencBajak: true,
        realBkr: true,
        realBajak: true,
        bulanSn: true,
        realMulaiTanam: true,
        realSelesaiTanam: true,
        rencMulaiTanam: true,
        rencSelesaiTanam: true,
        progressTanam: true,
        aplikasiDetails: true,
        activities: {
          select: {
            code: true,
            name: true,
            rencanaDate: true,
            realisasiDate: true,
            status: true,
          },
          orderBy: { stepOrder: 'asc' },
        },
      },
      orderBy: { lokasi: 'asc' },
    });

    // Format lands for smart selector
    const formattedLands = lands.map((l) => {
      const app = (typeof l.aplikasiDetails === 'object' && l.aplikasiDetails !== null) ? (l.aplikasiDetails as any) : {};
      const cat = getLandStokCategory(l);
      const computedLastAct = computeAktivitasTerakhir(l);

      return {
        ...l,
        status: l.status ? l.status.replace(/\d+/g, '').trim() : null,
        category: cat,
        computedLastAct,
        realChopper: app.realChopper || l.realBkr || null,
        realBajakMb5Btr: app.realBajakAwalMb5Btr || l.realBajak || null,
        realSiapTanam: app.realSiapTanam || app.realJalanSal || l.bulanSn || null,
        realMulaiTanam: l.realMulaiTanam || app.realMulaiTanam || null,
        realSelesaiTanam: l.realSelesaiTanam || app.realSelesaiTanam || null,
        rencMulaiTanam: l.rencMulaiTanam || app.rencMulaiTanam || null,
        rencSelesaiTanam: l.rencSelesaiTanam || app.rencSelesaiTanam || null,
      };
    });

    const distinctYears = await prisma.land.findMany({
      select: { year: true },
      distinct: ['year'],
      where: { year: { not: null } },
      orderBy: { year: 'desc' },
    });

    const availableYears = distinctYears.map((y) => y.year).filter((y): y is number => y !== null);

    const standardWilayahs = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'];

    return NextResponse.json({
      success: true,
      data: formattedLands,
      filters: {
        years: [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028],
        wilayahs: standardWilayahs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching quick update lands:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      landId,
      activityKey,
      type = 'real',
      date,
      realDate,
      rencanaDate,
      note,
      updatedBy,
      jenisBibit,
      kelasBibit,
      progressTanam,
      volumeStandar,
      volumeBesar,
      volumeSedang,
      volumeKecil,
      volumeExtraKecil,
      deleteDetailId,
      isUndo,
    } = body;

    let createdDetailIdResult: number | null = null;
    let totalVolumeResult = 0;

    if (!landId) {
      return NextResponse.json({ success: false, error: 'Nomor ID lahan wajib disertakan' }, { status: 400 });
    }
    if (!activityKey) {
      return NextResponse.json({ success: false, error: 'Jenis aktivitas wajib dipilih' }, { status: 400 });
    }

    const normalizeDate = (d: any) => {
      if (!d || String(d).trim() === '' || String(d).trim() === '-') return null;
      let s = String(d).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, dNum] = s.split('-');
        return `${dNum}/${m}/${y}`;
      }
      return s;
    };

    let cleanDate = normalizeDate(date);
    const hasSpecificDates = realDate !== undefined || rencanaDate !== undefined;
    const finalRealDate = hasSpecificDates ? (realDate !== undefined ? normalizeDate(realDate) : undefined) : (type === 'real' ? cleanDate : undefined);
    const finalRencDate = hasSpecificDates ? (rencanaDate !== undefined ? normalizeDate(rencanaDate) : undefined) : (type === 'rencana' ? cleanDate : undefined);

    const existingLand = await prisma.land.findUnique({
      where: { id: parseInt(String(landId), 10) },
      include: { activities: true },
    });

    if (!existingLand) {
      return NextResponse.json({ success: false, error: 'Data petak lahan tidak ditemukan' }, { status: 404 });
    }

    // Mapping key aktivitas ke field aplikasiDetails dan kode LandActivity
    const ACTIVITY_DEFINITIONS: Record<
      string,
      {
        name: string;
        code?: string;
        detailsRealKey: string;
        detailsRencKey: string;
        landRealCol?: string;
        landRencCol?: string;
        isBajak?: boolean;
        isSn?: boolean;
        isTanamMulai?: boolean;
        isTanamSelesai?: boolean;
      }
    > = {
      // Bongkar
      chopper: { name: 'Chopper', code: '01.CHOPPER', detailsRealKey: 'realChopper', detailsRencKey: 'chopper', landRealCol: 'realBkr', landRencCol: 'rencBkr' },
      chopperLu: { name: 'Chopper Lu', code: '02.CHOPPER_LU', detailsRealKey: 'realChopperLu', detailsRencKey: 'chopperLu' },
      rh1: { name: 'RH1', code: '03.RH1', detailsRealKey: 'realRh1', detailsRencKey: 'rh1' },
      cuttingBanana: { name: 'Cutting Banana', code: '04.CUTTING_BANANA', detailsRealKey: 'realCuttingBanana', detailsRencKey: 'cuttingBanana' },
      dolomit: { name: 'Aplikasi Dolomit', code: '05.DOLOMIT', detailsRealKey: 'realDolomit', detailsRencKey: 'dolomit' },
      dp1: { name: 'DP 1', code: '06.DP1', detailsRealKey: 'realDp1', detailsRencKey: 'dp1' },
      dpCross: { name: 'DP Cross', code: '07.DP_CROSS', detailsRealKey: 'realDpCross', detailsRencKey: 'dpCross' },
      dp2: { name: 'DP 2', code: '08.DP2', detailsRealKey: 'realDp2', detailsRencKey: 'dp2' },
      belerang: { name: 'Aplikasi Belerang', code: '09.BELERANG', detailsRealKey: 'realBelerang', detailsRencKey: 'belerang' },
      kompos: { name: 'Aplikasi Kompos', code: '10.KOMPOS', detailsRealKey: 'realKompos', detailsRencKey: 'kompos' },

      // Bajak
      bajakAwalMb5Btr: { name: 'Bajak MB 5 BTR', code: '11.BAJAK_AWAL', detailsRealKey: 'realBajakAwalMb5Btr', detailsRencKey: 'rencAwalMb5Btr', landRealCol: 'realBajak', landRencCol: 'rencBajak', isBajak: true },
      bajakAwalMb25: { name: 'Bajak MB 2.5', code: '11.BAJAK_AWAL', detailsRealKey: 'realBajakAwalMb25', detailsRencKey: 'bajakAwalMb25', landRealCol: 'realBajak', isBajak: true },
      bajakAwalMph: { name: 'Bajak MPH (Howard)', code: '11.BAJAK_AWAL', detailsRealKey: 'realBajakAwalHoward', detailsRencKey: 'bajakAwalMph', landRealCol: 'realBajak', isBajak: true },
      bajakAwalNardi: { name: 'Bajak Nardi', code: '11.BAJAK_AWAL', detailsRealKey: 'realBajakAwalNardi', detailsRencKey: 'bajakAwalNardi', landRealCol: 'realBajak', isBajak: true },
      hrEksMb: { name: 'HR Eks MB', code: '11.BAJAK_AWAL', detailsRealKey: 'realHrEksMb', detailsRencKey: 'hrEksMb', landRealCol: 'realBajak', isBajak: true },
      subsoilerSs1: { name: 'Subsoiler SS1', code: '17.SUBSOILER', detailsRealKey: 'realSubsoilerSs1', detailsRencKey: 'subsoilerSs1' },
      subsoilerSs2: { name: 'Subsoiler SS2', code: '17.SUBSOILER', detailsRealKey: 'realSubsoilerSs2', detailsRencKey: 'subsoilerSs2' },
      finishingRotaryFh1: { name: 'Finishing Rotary FH1', code: '19.FINISHING_ROTARY', detailsRealKey: 'realFinishingRotaryFh1', detailsRencKey: 'finishingRotaryFh1' },
      finishingRotaryFh2: { name: 'Finishing Rotary FH2', code: '20.ROTARY_FH2', detailsRealKey: 'realRotaryFh2', detailsRencKey: 'finishingRotaryFh2' },
      ridger: { name: 'Ridger', code: '21.RIDGER', detailsRealKey: 'realRidger', detailsRencKey: 'ridger' },

      // Siap Tanam
      jalanSal: { name: 'Jalan & Saluran', code: '22.JALAN_SAL', detailsRealKey: 'realJalanSal', detailsRencKey: 'jalanSal', isSn: true },
      siapTanam: { name: 'Siap Tanam', code: '22.SIAP_TANAM', detailsRealKey: 'realSiapTanam', detailsRencKey: 'siapTanam', isSn: true },

      // Tanam
      prosesTanam: { name: 'Mulai / Proses Tanam', code: '23.PROSES_TNM', detailsRealKey: 'realMulaiTanam', detailsRencKey: 'rencMulaiTanam', landRealCol: 'realMulaiTanam', landRencCol: 'rencMulaiTanam', isTanamMulai: true },
      selesaiTanam: { name: 'Selesai Tanam', code: '24.SLS_TANAM', detailsRealKey: 'realSelesaiTanam', detailsRencKey: 'rencSelesaiTanam', landRealCol: 'realSelesaiTanam', landRencCol: 'rencSelesaiTanam', isTanamSelesai: true },
    };

    const def = ACTIVITY_DEFINITIONS[activityKey];
    if (!def) {
      return NextResponse.json({ success: false, error: `Aktivitas '${activityKey}' tidak dikenali` }, { status: 400 });
    }

    const currentDetails = (typeof existingLand.aplikasiDetails === 'object' && existingLand.aplikasiDetails !== null)
      ? { ...(existingLand.aplikasiDetails as any) }
      : {};

    const updateData: any = {};

    if (finalRealDate !== undefined) {
      currentDetails[def.detailsRealKey] = finalRealDate;
      if (def.landRealCol) updateData[def.landRealCol] = finalRealDate;
      if (def.isBajak) updateData.realBajak = finalRealDate;
      if (def.isSn) {
        if (finalRealDate) {
          const parts = finalRealDate.split('/');
          if (parts.length === 3) {
            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const mIdx = parseInt(parts[1], 10) - 1;
            const yr = parts[2].slice(-2);
            if (mIdx >= 0 && mIdx < 12) {
              updateData.bulanSn = `${MONTH_NAMES[mIdx]}-${yr}`;
            }
          }
        }
      }
      if (def.isTanamMulai) {
        updateData.realMulaiTanam = finalRealDate;
        if (finalRealDate) {
          if (!existingLand.realSelesaiTanam) updateData.progressTanam = progressTanam ? Number(progressTanam) : 50;
        } else {
          updateData.progressTanam = existingLand.realSelesaiTanam ? 100 : 0;
        }
      }
      if (def.isTanamSelesai) {
        updateData.realSelesaiTanam = finalRealDate;
        if (finalRealDate) {
          updateData.progressTanam = 100;
        } else {
          updateData.progressTanam = (updateData.realMulaiTanam || existingLand.realMulaiTanam) ? 50 : 0;
        }
      }
    }

    if (jenisBibit !== undefined) {
      updateData.jenisBibit = jenisBibit && String(jenisBibit).trim() !== '' ? String(jenisBibit).trim() : null;
    }
    if (kelasBibit !== undefined) {
      updateData.kelasBibit = kelasBibit && String(kelasBibit).trim() !== '' ? String(kelasBibit).trim() : null;
    }

    if (finalRencDate !== undefined) {
      currentDetails[def.detailsRencKey] = finalRencDate;
      if (def.landRencCol) updateData[def.landRencCol] = finalRencDate;
    }

    updateData.aplikasiDetails = currentDetails;

    // Update record Land
    const updatedLand = await prisma.land.update({
      where: { id: existingLand.id },
      data: updateData,
    });

    // Update LandActivity jika ada kodenya
    if (def.code) {
      const existingAct = await prisma.landActivity.findFirst({
        where: { landId: existingLand.id, code: def.code },
      });

      const actData: any = {};
      if (finalRealDate !== undefined) {
        actData.realisasiDate = finalRealDate;
        actData.status = finalRealDate ? 'COMPLETED' : (existingAct?.rencanaDate ? 'IN_PROGRESS' : 'PENDING');
      }
      if (finalRencDate !== undefined) {
        actData.rencanaDate = finalRencDate;
        if (!actData.status && !existingAct?.realisasiDate) {
          actData.status = finalRencDate ? 'IN_PROGRESS' : 'PENDING';
        }
      }

      if (existingAct) {
        if (Object.keys(actData).length > 0) {
          await prisma.landActivity.update({
            where: { id: existingAct.id },
            data: actData,
          });
        }
      } else {
        await prisma.landActivity.create({
          data: {
            landId: existingLand.id,
            code: def.code,
            name: def.name,
            stepOrder: 99,
            ...actData,
          },
        });
      }
    }

    // Hitung ulang aktivitas terakhir
    const freshLand = await prisma.land.findUnique({
      where: { id: existingLand.id },
      include: { activities: true },
    });
    if (freshLand) {
      const newAktivitasTerakhir = computeAktivitasTerakhir(freshLand);
      await prisma.land.update({
        where: { id: existingLand.id },
        data: { aplikasiTerakhir: newAktivitasTerakhir },
      });
    }

    // Recalculate StageStockSummary & StokLahanMaster
    try {
      await recalculateAndPersistStageStocks(existingLand.year || 2026);
      await syncStokLahanMasterForLand(existingLand.id);

      // Sync Planting table and create PlantingDetail transaction if this is a planting activity
      if (def.isTanamMulai || def.isTanamSelesai) {
        const pRecord = await prisma.planting.findFirst({
          where: { lokasi: existingLand.lokasi },
        });
        const effectiveSelesai = updateData.realSelesaiTanam !== undefined ? updateData.realSelesaiTanam : existingLand.realSelesaiTanam;
        const effectiveMulai = updateData.realMulaiTanam !== undefined ? updateData.realMulaiTanam : existingLand.realMulaiTanam;
        const luasVal = Number(existingLand.luasNetto) || 0;

        const numStandar = Number(parseFloat(volumeStandar) || 0);
        const numBesar = Number(parseFloat(volumeBesar) || 0);
        const numSedang = Number(parseFloat(volumeSedang) || 0);
        const numKecil = Number(parseFloat(volumeKecil) || 0);
        const numExtraKecil = Number(parseFloat(volumeExtraKecil) || 0);
        const totalVol = Math.round((numStandar + numBesar + numSedang + numKecil + numExtraKecil) * 100) / 100;

        let createdDetailRecord: any = null;

        // Delete previous detail if this is an undo action
        if (deleteDetailId) {
          try {
            await prisma.plantingDetail.delete({
              where: { id: parseInt(String(deleteDetailId), 10) },
            });
          } catch (delErr) {
            console.warn('Could not delete plantingDetail with id:', deleteDetailId);
          }
        }

        // Create transaction in PlantingDetail if volume > 0 and not in undo mode
        if (totalVol > 0 && finalRealDate && !isUndo) {
          const parseDmy = (dStr: string) => {
            const p = dStr.split('/');
            if (p.length === 3) {
              return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10), 12, 0, 0);
            }
            return new Date();
          };

          const prevDetails = await prisma.plantingDetail.findMany({
            where: { lokasi: existingLand.lokasi, aktivitas: { contains: 'tanam', mode: 'insensitive' } },
          });
          const prevAkum = prevDetails.reduce((sum, d) => sum + (d.total || 0), 0);
          const newAkum = Math.round((prevAkum + totalVol) * 100) / 100;
          const nettoForPct = luasVal > 0 ? luasVal : newAkum;
          const newPct = nettoForPct > 0 ? Number(((newAkum / nettoForPct) * 100).toFixed(1)) : 100;

          let resolvedKelas = kelasBibit;
          if (!resolvedKelas) {
            if (numExtraKecil > 0) resolvedKelas = 'Extra Kecil';
            else if (numKecil > 0) resolvedKelas = 'Kecil';
            else if (numSedang > 0) resolvedKelas = 'Sedang';
            else if (numBesar > 0) resolvedKelas = 'Besar';
            else if (numStandar > 0) resolvedKelas = 'Standar';
          }

          createdDetailRecord = await prisma.plantingDetail.create({
            data: {
              lokasi: existingLand.lokasi,
              tanggal: finalRealDate,
              tanggalDate: parseDmy(finalRealDate),
              luasNetto: luasVal || null,
              aktivitas: 'Tanam Bibit',
              standar: numStandar,
              besar: numBesar,
              sedang: numSedang,
              kecil: numKecil,
              extraKecil: numExtraKecil,
              total: totalVol,
              jenisBibit: jenisBibit || existingLand.jenisBibit || 'Crown',
              wilayah: existingLand.wilayah,
              awalTanam: effectiveMulai,
              selesaiTanam: effectiveSelesai,
              akumTanam: newAkum,
              persenTanam: newPct,
              petikKe: null,
              sourceFile: 'Form Quick Update Tanam',
              sourceSheet: 'Quick Update',
            },
          });
        }

        // Recalculate Planting master from all PlantingDetail transactions if any exist, or from volume
        const allDetailsForLoc = await prisma.plantingDetail.findMany({
          where: { lokasi: existingLand.lokasi, aktivitas: { contains: 'tanam', mode: 'insensitive' } },
        });

        let realTanamVal: number;
        let finalProgress: number;
        let finalStatus: string;

        if (allDetailsForLoc.length > 0) {
          const sumDetail = allDetailsForLoc.reduce((acc, d) => acc + (d.total || 0), 0);
          realTanamVal = Math.round(sumDetail * 100) / 100;
          finalProgress = luasVal > 0 ? Number(((realTanamVal / luasVal) * 100).toFixed(1)) : (effectiveSelesai ? 100 : 50);
          finalStatus = (effectiveSelesai || finalProgress >= 100) ? 'SELESAI' : (realTanamVal > 0 ? 'PROSES' : 'BELUM');
        } else {
          finalProgress = updateData.progressTanam !== undefined ? updateData.progressTanam : (existingLand.progressTanam ?? 0);
          realTanamVal = finalProgress === 100 ? luasVal : (finalProgress === 50 ? Math.round(luasVal * 0.5 * 100) / 100 : 0);
          finalStatus = effectiveSelesai ? 'SELESAI' : (effectiveMulai ? 'PROSES' : 'BELUM');
        }

        const sisaVal = Math.max(0, Math.round((luasVal - realTanamVal) * 100) / 100);

        const plantingPayload: any = {
          lokasi: existingLand.lokasi,
          luas: luasVal,
          status: finalStatus,
          progress: finalProgress,
          realTanam: realTanamVal,
          sisa: sisaVal,
          awalTanam: effectiveMulai || null,
        };
        if (jenisBibit !== undefined) plantingPayload.jenisBibit = jenisBibit && String(jenisBibit).trim() !== '' ? String(jenisBibit).trim() : null;
        if (kelasBibit !== undefined) plantingPayload.kelasBibit = kelasBibit && String(kelasBibit).trim() !== '' ? String(kelasBibit).trim() : null;

        if (pRecord) {
          await prisma.planting.update({
            where: { id: pRecord.id },
            data: plantingPayload,
          });
        } else {
          await prisma.planting.create({
            data: plantingPayload,
          });
        }

        createdDetailIdResult = createdDetailRecord?.id || null;
        totalVolumeResult = totalVol;
      }
    } catch (calcErr) {
      console.error('Error recalculating stocks after quick update:', calcErr);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui ${def.name} untuk petak ${existingLand.lokasi}`,
      data: {
        landId: existingLand.id,
        lokasi: existingLand.lokasi,
        wilayah: existingLand.wilayah,
        activityName: def.name,
        type,
        date: cleanDate,
        createdDetailId: createdDetailIdResult,
        totalVolume: totalVolumeResult,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error executing quick update:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
