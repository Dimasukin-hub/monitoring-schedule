import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeAktivitasTerakhir } from '@/lib/landActivityUtils';
import { recalculateAndPersistStageStocks, syncStokLahanMasterForLand, parseDateVal } from '@/lib/stageStockCalculator';
import lands2026BaselinesJson from '@/lib/lands2026Baselines.json';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const landId = parseInt(id, 10);

    let land;
    if (!isNaN(landId)) {
      land = await prisma.land.findUnique({
        where: { id: landId },
        include: {
          activities: {
            orderBy: { stepOrder: 'asc' },
          },
        },
      });
    }

    if (!land) {
      // Try finding by lokasi string (e.g. /api/lands/049C1)
      land = await prisma.land.findFirst({
        where: { lokasi: id },
        include: {
          activities: {
            orderBy: { stepOrder: 'asc' },
          },
        },
      });
    }

    if (!land) {
      return NextResponse.json({ success: false, error: 'Land not found' }, { status: 404 });
    }

    const completedCount = land.activities.filter((a) => a.status === 'COMPLETED').length;
    const totalActivities = land.activities.length;
    const preparationProgress = totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

    const actDict: Record<string, { rencana: string | null; real: string | null; status: string }> = {};
    land.activities.forEach((act) => {
      actDict[act.code] = {
        rencana: act.rencanaDate,
        real: act.realisasiDate,
        status: act.status,
      };
    });

    const jalanSal =
      (typeof land.aplikasiDetails === 'object' && land.aplikasiDetails !== null
        ? (land.aplikasiDetails as any)?.jalanSal
        : null) || actDict['22.JALAN_SAL']?.real || null;
    const siapTanam = actDict['22.SIAP_TANAM']?.real || null;
    const prosesTanam = actDict['23.PROSES_TNM']?.real || land.realMulaiTanam || null;
    const selesaiTanam = actDict['24.SLS_TANAM']?.real || land.realSelesaiTanam || null;

    return NextResponse.json({
      success: true,
      data: {
        ...land,
        status: land.status ? land.status.replace(/\d+/g, '').trim() : null,
        statusProduksi: land.statusProduksi ? land.statusProduksi.replace(/\d+/g, '').trim() : null,
        preparationProgress,
        completedActivitiesCount: completedCount,
        totalActivitiesCount: totalActivities,
        jalanSal,
        siapTanam,
        prosesTanam,
        selesaiTanam,
      },
    });
  } catch (error: any) {
    console.error('Error fetching land detail:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const landId = parseInt(id, 10);
    const body = await request.json();

    // Verify target land exists
    let existingLand: any;
    if (!isNaN(landId)) {
      existingLand = await prisma.land.findUnique({ where: { id: landId } });
    }
    if (!existingLand) {
      existingLand = await prisma.land.findFirst({ where: { lokasi: id } });
    }

    if (!existingLand) {
      return NextResponse.json({ success: false, error: 'Lahan tidak ditemukan' }, { status: 404 });
    }

    const currentId = existingLand.id;

    // Prepare update data for Land model
    const updateData: any = {};

    if (body.wilayah !== undefined) updateData.wilayah = String(body.wilayah).trim();
    if (body.lokasi !== undefined) updateData.lokasi = String(body.lokasi).trim();
    if (body.luasBruto !== undefined) updateData.luasBruto = Number(body.luasBruto) || 0;
    if (body.luasNetto !== undefined) updateData.luasNetto = Number(body.luasNetto) || 0;
    if (body.status !== undefined) updateData.status = body.status ? String(body.status).trim() : null;
    if (body.eks !== undefined) updateData.eks = body.eks ? String(body.eks).trim() : null;
    if (body.sejarah !== undefined) updateData.sejarah = body.sejarah ? String(body.sejarah).trim() : null;
    if (body.phBk !== undefined) updateData.phBk = body.phBk !== null && body.phBk !== '' ? Number(body.phBk) : null;
    if (body.phSn !== undefined) updateData.phSn = body.phSn !== null && body.phSn !== '' ? Number(body.phSn) : null;
    if (body.bulanSn !== undefined) updateData.bulanSn = body.bulanSn ? String(body.bulanSn).trim() : null;

    if (body.jenisBibit !== undefined) updateData.jenisBibit = body.jenisBibit ? String(body.jenisBibit).trim() : null;
    if (body.kelasBibit !== undefined) updateData.kelasBibit = body.kelasBibit ? String(body.kelasBibit).trim() : null;
    if (body.bulanTanam !== undefined) updateData.bulanTanam = body.bulanTanam ? String(body.bulanTanam).trim() : null;
    if (body.rencMulaiTanam !== undefined) updateData.rencMulaiTanam = body.rencMulaiTanam ? String(body.rencMulaiTanam).trim() : null;
    if (body.rencSelesaiTanam !== undefined) updateData.rencSelesaiTanam = body.rencSelesaiTanam ? String(body.rencSelesaiTanam).trim() : null;
    if (body.realMulaiTanam !== undefined) updateData.realMulaiTanam = body.realMulaiTanam ? String(body.realMulaiTanam).trim() : null;
    if (body.realSelesaiTanam !== undefined) updateData.realSelesaiTanam = body.realSelesaiTanam ? String(body.realSelesaiTanam).trim() : null;
    if (body.hariWaktu !== undefined) updateData.hariWaktu = body.hariWaktu !== null && body.hariWaktu !== '' ? parseInt(body.hariWaktu, 10) : null;
    if (body.progressTanam !== undefined) updateData.progressTanam = Number(body.progressTanam) || 0;

    if (body.statusProduksi !== undefined) updateData.statusProduksi = body.statusProduksi ? String(body.statusProduksi).trim() : null;
    if (body.bulanPanen !== undefined) updateData.bulanPanen = body.bulanPanen ? String(body.bulanPanen).trim() : null;
    if (body.stdPanen !== undefined) updateData.stdPanen = body.stdPanen ? String(body.stdPanen).trim() : null;
    if (body.deviasiMonth !== undefined) updateData.deviasiMonth = body.deviasiMonth !== null && body.deviasiMonth !== '' ? parseInt(body.deviasiMonth, 10) : null;
    if (body.aplikasiTerakhir !== undefined) updateData.aplikasiTerakhir = body.aplikasiTerakhir ? String(body.aplikasiTerakhir).trim() : null;
    if (body.statusAplikasi !== undefined) updateData.statusAplikasi = body.statusAplikasi ? String(body.statusAplikasi).trim() : null;

    // Prepare existing aplikasiDetails
    const landDetails = (existingLand as any)?.aplikasiDetails;
    const existingDetails = (typeof landDetails === 'object' && landDetails !== null) ? { ...landDetails } : {};
    const existingReal = (typeof existingDetails.realisasiAplikasi === 'object' && existingDetails.realisasiAplikasi !== null)
      ? { ...existingDetails.realisasiAplikasi }
      : {};

    // Activity to aplikasiDetails and Land direct columns mapping
    const ACTIVITY_SYNC_MAP: Record<string, { detailsRealKey: string; detailsRencKey?: string; landRealCol?: string; landRencCol?: string }> = {
      '01.CHOPPER': { detailsRealKey: 'realChopper', detailsRencKey: 'chopper', landRealCol: 'realBkr', landRencCol: 'rencBkr' },
      '02.CHOPPER_LU': { detailsRealKey: 'realChopperLu', detailsRencKey: 'chopperLu' },
      '03.RH1': { detailsRealKey: 'realRh1', detailsRencKey: 'rh1' },
      '04.CUTTING_BANANA': { detailsRealKey: 'realCuttingBanana', detailsRencKey: 'cuttingBanana' },
      '05.DOLOMIT': { detailsRealKey: 'realDolomit', detailsRencKey: 'dolomit' },
      '06.DP1': { detailsRealKey: 'realDp1', detailsRencKey: 'dp1' },
      '07.DP_CROSS': { detailsRealKey: 'realDpCross', detailsRencKey: 'dpCross' },
      '08.DP2': { detailsRealKey: 'realDp2', detailsRencKey: 'dp2' },
      '09.BELERANG': { detailsRealKey: 'realBelerang', detailsRencKey: 'belerang' },
      '10.KOMPOS': { detailsRealKey: 'realKompos', detailsRencKey: 'kompos' },
      '11.BAJAK_AWAL': { detailsRealKey: 'realBajak', detailsRencKey: 'bajakAwal', landRealCol: 'realBajak', landRencCol: 'rencBajak' },
      '17.SUBSOILER': { detailsRealKey: 'realSubsoilerSs1', detailsRencKey: 'subsoiler' },
      '18.FINISHING_HARROW': { detailsRealKey: 'realFhHarrow', detailsRencKey: 'finishingHarrow' },
      '19.FINISHING_ROTARY': { detailsRealKey: 'realFinishingRotaryFh1', detailsRencKey: 'finishingRotary' },
      '20.ROTARY_FH2': { detailsRealKey: 'realRotaryFh2', detailsRencKey: 'rotaryFh2' },
      '21.RIDGER': { detailsRealKey: 'realRidger', detailsRencKey: 'ridger' },
      '22.JALAN_SAL': { detailsRealKey: 'realJalanSal', detailsRencKey: 'jalanSal' },
      '22.SIAP_TANAM': { detailsRealKey: 'realSiapTanam', detailsRencKey: 'siapTanam' },
      '23.PROSES_TNM': { detailsRealKey: 'realMulaiTanam', detailsRencKey: 'rencMulaiTanam', landRealCol: 'realMulaiTanam', landRencCol: 'rencMulaiTanam' },
      '24.SLS_TANAM': { detailsRealKey: 'realSelesaiTanam', detailsRencKey: 'rencSelesaiTanam', landRealCol: 'realSelesaiTanam', landRencCol: 'rencSelesaiTanam' },
    };

    const DETAILS_REAL_TO_CODE: Record<string, string> = {};
    for (const [code, info] of Object.entries(ACTIVITY_SYNC_MAP)) {
      DETAILS_REAL_TO_CODE[info.detailsRealKey] = code;
    }
    // Additional aliases in aplikasiDetails
    DETAILS_REAL_TO_CODE['realBajakAwalMb5Btr'] = '11.BAJAK_AWAL';
    DETAILS_REAL_TO_CODE['realBajakAwalMb25'] = '11.BAJAK_AWAL';
    DETAILS_REAL_TO_CODE['realBajakAwalHoward'] = '11.BAJAK_AWAL';
    DETAILS_REAL_TO_CODE['realBajakAwalNardi'] = '11.BAJAK_AWAL';
    DETAILS_REAL_TO_CODE['realHrEksMb'] = '11.BAJAK_AWAL';
    DETAILS_REAL_TO_CODE['realSubsoilerSs2'] = '17.SUBSOILER';
    DETAILS_REAL_TO_CODE['realFinishingFhkRent'] = '19.FINISHING_ROTARY';

    let mergedDetails: any = { ...existingDetails };
    if (body.aplikasiDetails !== undefined && typeof body.aplikasiDetails === 'object' && body.aplikasiDetails !== null) {
      const incomingReal = (typeof body.aplikasiDetails.realisasiAplikasi === 'object' && body.aplikasiDetails.realisasiAplikasi !== null)
        ? { ...existingReal, ...body.aplikasiDetails.realisasiAplikasi }
        : existingReal;
      mergedDetails = {
        ...mergedDetails,
        ...body.aplikasiDetails,
        realisasiAplikasi: incomingReal,
      };

      // Sync aliases direct into mergedDetails root if sent flat
      for (const [k, v] of Object.entries(body.aplikasiDetails)) {
        if (k !== 'realisasiAplikasi') {
          mergedDetails[k] = v;
        }
      }
    }

    // Sync direct Land columns from mergedDetails if not explicitly provided
    if (body.realBajak !== undefined) {
      updateData.realBajak = body.realBajak ? String(body.realBajak).trim() : null;
    } else {
      const effectiveRealBajak =
        mergedDetails.realBajak ||
        mergedDetails.realBajakAwalMb5Btr ||
        mergedDetails.realBajakAwalMb25 ||
        mergedDetails.realBajakAwalHoward ||
        mergedDetails.realBajakAwalNardi ||
        mergedDetails.realHrEksMb ||
        null;
      if (effectiveRealBajak !== undefined && effectiveRealBajak !== existingLand.realBajak) {
        updateData.realBajak = effectiveRealBajak && effectiveRealBajak !== '-' && effectiveRealBajak !== '0'
          ? String(effectiveRealBajak).trim()
          : null;
      }
    }

    if (body.realBkr !== undefined) {
      updateData.realBkr = body.realBkr ? String(body.realBkr).trim() : null;
    } else {
      const effectiveRealBkr = mergedDetails.realChopper || mergedDetails.realRh1 || null;
      if (effectiveRealBkr !== undefined && effectiveRealBkr !== existingLand.realBkr) {
        updateData.realBkr = effectiveRealBkr && effectiveRealBkr !== '-' && effectiveRealBkr !== '0'
          ? String(effectiveRealBkr).trim()
          : null;
      }
    }

    if (body.bulanSn !== undefined) {
      updateData.bulanSn = body.bulanSn ? String(body.bulanSn).trim() : null;
    } else {
      const effectiveSn = mergedDetails.realSiapTanam;
      if (effectiveSn && effectiveSn !== '-' && effectiveSn !== '0') {
        const snDateParts = String(effectiveSn).trim().split('/');
        if (snDateParts.length === 3) {
          const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          const mIdx = parseInt(snDateParts[1], 10) - 1;
          const yr = snDateParts[2].slice(-2);
          if (mIdx >= 0 && mIdx < 12) {
            updateData.bulanSn = `${MONTH_NAMES[mIdx]}-${yr}`;
          }
        }
      } else if (
        body.aplikasiDetails &&
        (body.aplikasiDetails.realSiapTanam === null ||
          body.aplikasiDetails.realSiapTanam === '' ||
          body.aplikasiDetails.siapTanam === null ||
          body.aplikasiDetails.siapTanam === '')
      ) {
        const base = (lands2026BaselinesJson as Record<string, any>)[existingLand.lokasi];
        const defaultBulanSn = base?.baseBulanSn || base?.bulanSn || existingLand.bulanTanam;
        if (defaultBulanSn) {
          const dBase = parseDateVal(defaultBulanSn);
          if (dBase) {
            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            updateData.bulanSn = `${MONTH_NAMES[dBase.getMonth()]}-${String(dBase.getFullYear()).slice(-2)}`;
          } else {
            updateData.bulanSn = String(defaultBulanSn).trim();
          }
        }
      }
    }

    // Sync direct Land columns to mergedDetails
    if (body.realMulaiTanam !== undefined) {
      mergedDetails.realMulaiTanam = body.realMulaiTanam ? String(body.realMulaiTanam).trim() : null;
    }
    if (body.realSelesaiTanam !== undefined) {
      mergedDetails.realSelesaiTanam = body.realSelesaiTanam ? String(body.realSelesaiTanam).trim() : null;
    }

    // If body.activities is provided, also sync to mergedDetails and direct Land columns
    if (Array.isArray(body.activities)) {
      for (const act of body.activities) {
        if (!act.code) continue;
        const syncInfo = ACTIVITY_SYNC_MAP[act.code];
        if (syncInfo) {
          if (act.realisasiDate !== undefined) {
            const cleanReal = act.realisasiDate && act.realisasiDate !== '-' && act.realisasiDate !== '0' ? String(act.realisasiDate).trim() : null;
            mergedDetails[syncInfo.detailsRealKey] = cleanReal;
            if (syncInfo.landRealCol) {
              updateData[syncInfo.landRealCol] = cleanReal;
            }
          }
          if (act.rencanaDate !== undefined) {
            const cleanRenc = act.rencanaDate && act.rencanaDate !== '-' && act.rencanaDate !== '0' ? String(act.rencanaDate).trim() : null;
            if (syncInfo.detailsRencKey) {
              mergedDetails[syncInfo.detailsRencKey] = cleanRenc;
            }
            if (syncInfo.landRencCol) {
              updateData[syncInfo.landRencCol] = cleanRenc;
            }
          }
        }
      }
    }

    // Dynamic Progress Tanam calculation
    const currentRealSelesai = updateData.realSelesaiTanam !== undefined ? updateData.realSelesaiTanam : existingLand.realSelesaiTanam;
    const currentRealMulai = updateData.realMulaiTanam !== undefined ? updateData.realMulaiTanam : existingLand.realMulaiTanam;
    if (body.progressTanam !== undefined) {
      updateData.progressTanam = Number(body.progressTanam) || 0;
    } else if (currentRealSelesai && currentRealSelesai !== '-' && currentRealSelesai !== '0') {
      updateData.progressTanam = 100;
    } else if (currentRealMulai && currentRealMulai !== '-' && currentRealMulai !== '0') {
      updateData.progressTanam = 50;
    }

    updateData.aplikasiDetails = mergedDetails;

    // Update Land
    await prisma.land.update({
      where: { id: currentId },
      data: updateData,
    });

    // Update LandActivity records from body.activities
    if (Array.isArray(body.activities)) {
      for (const act of body.activities) {
        if (!act.code) continue;

        const existingAct = await prisma.landActivity.findFirst({
          where: { landId: currentId, code: act.code },
        });

        const targetRencana = act.rencanaDate !== undefined ? (act.rencanaDate || null) : (existingAct?.rencanaDate || null);
        const targetReal = act.realisasiDate !== undefined ? (act.realisasiDate || null) : (existingAct?.realisasiDate || null);

        let actStatus = act.status;
        if (!actStatus) {
          if (targetReal && targetReal !== '-' && targetReal !== '0') {
            actStatus = 'COMPLETED';
          } else if (targetRencana && targetRencana !== '-' && targetRencana !== '0') {
            actStatus = 'IN_PROGRESS';
          } else {
            actStatus = 'PENDING';
          }
        }

        if (existingAct) {
          await prisma.landActivity.update({
            where: { id: existingAct.id },
            data: {
              rencanaDate: act.rencanaDate !== undefined ? (act.rencanaDate || null) : existingAct.rencanaDate,
              realisasiDate: act.realisasiDate !== undefined ? (act.realisasiDate || null) : existingAct.realisasiDate,
              status: actStatus,
            },
          });
        } else {
          await prisma.landActivity.create({
            data: {
              landId: currentId,
              code: act.code,
              name: act.name || act.code,
              stepOrder: act.stepOrder || 99,
              rencanaDate: act.rencanaDate || null,
              realisasiDate: act.realisasiDate || null,
              status: actStatus,
            },
          });
        }
      }
    }

    // Sync any updated fields in aplikasiDetails to LandActivity as well
    if (body.aplikasiDetails !== undefined && typeof body.aplikasiDetails === 'object' && body.aplikasiDetails !== null) {
      for (const [key, val] of Object.entries(body.aplikasiDetails)) {
        const code = DETAILS_REAL_TO_CODE[key];
        if (code) {
          const cleanReal = val && val !== '-' && val !== '0' ? String(val).trim() : null;
          const existingAct = await prisma.landActivity.findFirst({
            where: { landId: currentId, code },
          });
          if (existingAct) {
            await prisma.landActivity.update({
              where: { id: existingAct.id },
              data: {
                realisasiDate: cleanReal,
                status: cleanReal ? 'COMPLETED' : (existingAct.rencanaDate ? 'IN_PROGRESS' : 'PENDING'),
              },
            });
          }
        }
      }
    }

    // Fetch the fresh updated record with activities
    let freshLand = await prisma.land.findUnique({
      where: { id: currentId },
      include: {
        activities: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!freshLand) {
      return NextResponse.json({ success: false, error: 'Lahan tidak ditemukan' }, { status: 404 });
    }

    // Automatically recalculate and persist dynamic Aktivitas Terakhir (Bab 17 PRD)
    const newAktivitasTerakhir = computeAktivitasTerakhir(freshLand);
    if (freshLand.aplikasiTerakhir !== newAktivitasTerakhir) {
      freshLand = await prisma.land.update({
        where: { id: currentId },
        data: {
          aplikasiTerakhir: newAktivitasTerakhir,
        },
        include: {
          activities: {
            orderBy: { stepOrder: 'asc' },
          },
        },
      });
    }

    // Automatically recalculate StageStockSummary (Stok Bongkar, Stok Bajak, Stok SN)
    // and sync StokLahanMaster category & details for real-time dashboard updates
    try {
      await recalculateAndPersistStageStocks(2026);
      await syncStokLahanMasterForLand(currentId);
    } catch (calcErr) {
      console.error('Error recalculating stage stocks:', calcErr);
    }

    const actDict: Record<string, any> = {};
    for (const a of freshLand.activities) {
      actDict[a.code] = a;
    }

    const app = (typeof freshLand.aplikasiDetails === 'object' && freshLand.aplikasiDetails !== null)
      ? freshLand.aplikasiDetails as any
      : {};

    const emptyAct = { rencana: null, real: null, status: 'PENDING' };

    return NextResponse.json({
      success: true,
      message: 'Data lahan berhasil diperbarui',
      data: {
        ...freshLand,
        aktivitasTerakhir: newAktivitasTerakhir,
        chopper: actDict['01.CHOPPER'] ? { rencana: actDict['01.CHOPPER'].rencanaDate, real: actDict['01.CHOPPER'].realisasiDate, status: actDict['01.CHOPPER'].status } : emptyAct,
        chopperLu: actDict['02.CHOPPER_LU'] ? { rencana: actDict['02.CHOPPER_LU'].rencanaDate, real: actDict['02.CHOPPER_LU'].realisasiDate, status: actDict['02.CHOPPER_LU'].status } : emptyAct,
        rh1: actDict['03.RH1'] ? { rencana: actDict['03.RH1'].rencanaDate, real: actDict['03.RH1'].realisasiDate, status: actDict['03.RH1'].status } : emptyAct,
        cuttingBanana: actDict['04.CUTTING_BANANA'] ? { rencana: actDict['04.CUTTING_BANANA'].rencanaDate, real: actDict['04.CUTTING_BANANA'].realisasiDate, status: actDict['04.CUTTING_BANANA'].status } : emptyAct,
        dolomit: actDict['05.DOLOMIT'] ? { rencana: actDict['05.DOLOMIT'].rencanaDate, real: actDict['05.DOLOMIT'].realisasiDate, status: actDict['05.DOLOMIT'].status } : emptyAct,
        dp1: actDict['06.DP1'] ? { rencana: actDict['06.DP1'].rencanaDate, real: actDict['06.DP1'].realisasiDate, status: actDict['06.DP1'].status } : emptyAct,
        dpCross: actDict['07.DP_CROSS'] ? { rencana: actDict['07.DP_CROSS'].rencanaDate, real: actDict['07.DP_CROSS'].realisasiDate, status: actDict['07.DP_CROSS'].status } : emptyAct,
        dp2: actDict['08.DP2'] ? { rencana: actDict['08.DP2'].rencanaDate, real: actDict['08.DP2'].realisasiDate, status: actDict['08.DP2'].status } : emptyAct,
        belerang: actDict['09.BELERANG'] ? { rencana: actDict['09.BELERANG'].rencanaDate, real: actDict['09.BELERANG'].realisasiDate, status: actDict['09.BELERANG'].status } : emptyAct,
        kompos: actDict['10.KOMPOS'] ? { rencana: actDict['10.KOMPOS'].rencanaDate, real: actDict['10.KOMPOS'].realisasiDate, status: actDict['10.KOMPOS'].status } : emptyAct,
        bajakAwal: actDict['11.BAJAK_AWAL'] ? { rencana: actDict['11.BAJAK_AWAL'].rencanaDate, real: actDict['11.BAJAK_AWAL'].realisasiDate, status: actDict['11.BAJAK_AWAL'].status } : emptyAct,
        subsoiler: actDict['17.SUBSOILER'] ? { rencana: actDict['17.SUBSOILER'].rencanaDate, real: actDict['17.SUBSOILER'].realisasiDate, status: actDict['17.SUBSOILER'].status } : emptyAct,
        finishingHarrow: actDict['18.FINISHING_HARROW'] ? { rencana: actDict['18.FINISHING_HARROW'].rencanaDate, real: actDict['18.FINISHING_HARROW'].realisasiDate, status: actDict['18.FINISHING_HARROW'].status } : emptyAct,
        finishingRotary: actDict['19.FINISHING_ROTARY'] ? { rencana: actDict['19.FINISHING_ROTARY'].rencanaDate, real: actDict['19.FINISHING_ROTARY'].realisasiDate, status: actDict['19.FINISHING_ROTARY'].status } : emptyAct,
        rotaryFh2: actDict['20.ROTARY_FH2'] ? { rencana: actDict['20.ROTARY_FH2'].rencanaDate, real: actDict['20.ROTARY_FH2'].realisasiDate, status: actDict['20.ROTARY_FH2'].status } : emptyAct,
        ridger: {
          rencana: actDict['21.RIDGER']?.rencanaDate || app.ridger || null,
          real: actDict['21.RIDGER']?.realisasiDate || app.realRidger || null,
          status: actDict['21.RIDGER']?.status || 'PENDING',
        },
        jalanSal: {
          rencana: actDict['22.JALAN_SAL']?.rencanaDate || app.jalanSal || null,
          real: actDict['22.JALAN_SAL']?.realisasiDate || app.realJalanSal || null,
          status: actDict['22.JALAN_SAL']?.status || 'PENDING',
        },
        siapTanam: actDict['22.SIAP_TANAM']?.realisasiDate || app.realSiapTanam || null,
        prosesTanam: actDict['23.PROSES_TNM']?.realisasiDate || freshLand.realMulaiTanam || null,
        selesaiTanam: actDict['24.SLS_TANAM']?.realisasiDate || freshLand.realSelesaiTanam || null,
      },
    });
  } catch (error: any) {
    console.error('Error updating land:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
