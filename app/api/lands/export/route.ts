import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { computeAktivitasTerakhir, computeRencanaBeroBongkar } from '@/lib/landActivityUtils';

function parseParamArray(searchParams: URLSearchParams, key: string): string[] {
  const all = searchParams.getAll(key);
  if (all.length === 0) {
    const single = searchParams.get(key);
    if (!single || single === 'ALL') return [];
    return single.split(',').map((s) => s.trim()).filter(Boolean);
  }
  const result: string[] = [];
  for (const item of all) {
    if (item && item !== 'ALL') {
      const parts = item.split(',').map((s) => s.trim()).filter(Boolean);
      result.push(...parts);
    }
  }
  return Array.from(new Set(result));
}

const INDO_MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  mei: '05',
  jun: '06',
  jul: '07',
  agu: '08',
  agt: '08',
  sep: '09',
  okt: '10',
  oct: '10',
  nov: '11',
  des: '12',
  dec: '12',
};

function getMonthPatterns(monthList: string[]): string[] {
  const patterns: string[] = [];
  for (const m of monthList) {
    const parts = m.split('-');
    if (parts.length === 2) {
      const mm = INDO_MONTH_MAP[parts[0].toLowerCase().slice(0, 3)];
      let y = parseInt(parts[1], 10);
      if (y < 100) y += 2000;
      if (mm) {
        patterns.push(`/${mm}/${y}`);
        patterns.push(`/${mm}/${parts[1]}`);
      }
    }
  }
  return Array.from(new Set(patterns));
}

const ACTIVITY_MAP: Record<string, { code?: string; field?: string; altFields?: string[] }> = {
  chopper: { code: '01.CHOPPER' },
  chopperLu: { code: '02.CHOPPER_LU' },
  rh1: { code: '03.RH1' },
  cuttingBanana: { code: '04.CUTTING_BANANA' },
  dolomit: { code: '05.DOLOMIT' },
  dp1: { code: '06.DP1' },
  dpCross: { code: '07.DP_CROSS' },
  dp2: { code: '08.DP2' },
  belerang: { code: '09.BELERANG' },
  kompos: { code: '10.KOMPOS' },
  rotaryPlough: { field: 'rotaryPlough' },
  bajakAwal: { code: '11.BAJAK_AWAL', altFields: ['rencAwalMb5Btr', 'bajakAwalMb5Btr', 'realBajakAwalMb5Btr', 'bajakAwalMb25', 'realBajakAwalMb25', 'bajakAwalMph', 'realBajakAwalHoward', 'bajakAwalNardi', 'realBajakAwalNardi'] },
  bajakAwalMb5Btr: { field: 'bajakAwalMb5Btr', altFields: ['rencAwalMb5Btr', 'realBajakAwalMb5Btr'] },
  bajakAwalMb25: { field: 'bajakAwalMb25', altFields: ['realBajakAwalMb25'] },
  bajakAwalMph: { field: 'bajakAwalMph', altFields: ['realBajakAwalHoward'] },
  bajakAwalNardi: { field: 'bajakAwalNardi', altFields: ['realBajakAwalNardi'] },
  hrEksMb: { field: 'hrEksMb', altFields: ['realHrEksMb'] },
  subsoiler: { code: '17.SUBSOILER', altFields: ['subsoilerSs1', 'realSubsoilerSs1', 'subsoilerSs2', 'realSubsoilerSs2'] },
  subsoilerSs1: { field: 'subsoilerSs1', altFields: ['realSubsoilerSs1'] },
  subsoilerSs2: { field: 'subsoilerSs2', altFields: ['realSubsoilerSs2'] },
  finishingRotary: { code: '19.FINISHING_ROTARY', altFields: ['finishingRotaryFh1', 'realFinishingRotaryFh1', 'finishingRotaryFh2', 'realRotaryFh2'] },
  finishingRotaryFh1: { field: 'finishingRotaryFh1', altFields: ['realFinishingRotaryFh1'] },
  finishingRotaryFh2: { field: 'finishingRotaryFh2', altFields: ['realRotaryFh2'] },
  rotaryFh2: { code: '20.ROTARY_FH2', altFields: ['finishingRotaryFh2', 'realRotaryFh2'] },
  ridger: { code: '21.RIDGER', altFields: ['ridger', 'realRidger'] },
  jalanSal: { code: '22.JALAN_SAL', altFields: ['jalanSal', 'realJalanSal'] },
  siapTanam: { code: '22.SIAP_TANAM' },
  prosesTanam: { code: '23.PROSES_TNM' },
  selesaiTanam: { code: '24.SLS_TANAM' },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    const andClauses: any[] = [];

    if (search) {
      andClauses.push({
        OR: [
          { lokasi: { contains: search, mode: 'insensitive' } },
          { wilayah: { contains: search, mode: 'insensitive' } },
          { status: { contains: search, mode: 'insensitive' } },
          { eks: { contains: search, mode: 'insensitive' } },
          { jenisBibit: { contains: search, mode: 'insensitive' } },
          { statusProduksi: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const wilayahs = parseParamArray(searchParams, 'wilayah');
    if (wilayahs.length > 0) {
      andClauses.push({ wilayah: { in: wilayahs } });
    }

    const years = parseParamArray(searchParams, 'year')
      .map((y) => parseInt(y, 10))
      .filter((y) => !isNaN(y));
    if (years.length > 0) {
      andClauses.push({ year: { in: years } });
    }

    const statuses = parseParamArray(searchParams, 'status').map((s) => s.replace(/\d+/g, '').trim());
    if (statuses.length > 0) {
      andClauses.push({ status: { in: statuses } });
    }

    const jenisBibits = parseParamArray(searchParams, 'jenisBibit');
    if (jenisBibits.length > 0) {
      andClauses.push({ jenisBibit: { in: jenisBibits } });
    }

    const kelasBibits = parseParamArray(searchParams, 'kelasBibit');
    if (kelasBibits.length > 0) {
      andClauses.push({ kelasBibit: { in: kelasBibits } });
    }

    const bulanTanams = parseParamArray(searchParams, 'bulanTanam');
    if (bulanTanams.length > 0) {
      const datePatterns = getMonthPatterns(bulanTanams);

      const likeSqlParts = datePatterns.map((p) => `"aplikasiDetails"::text LIKE '%${p}%'`).join(' OR ');
      let jsonIds: number[] = [];
      if (likeSqlParts) {
        const rawJsonLands: any[] = await prisma.$queryRawUnsafe(
          `SELECT id FROM "Land" WHERE ${likeSqlParts}`
        );
        jsonIds = rawJsonLands.map((r) => r.id);
      }

      const monthOrConditions: any[] = [
        { bulanTanam: { in: bulanTanams } },
        ...datePatterns.flatMap((p) => [
          { rencBkr: { contains: p } },
          { realBkr: { contains: p } },
          { rencBajak: { contains: p } },
          { realBajak: { contains: p } },
          { realMulaiTanam: { contains: p } },
          { realSelesaiTanam: { contains: p } },
          { rencMulaiTanam: { contains: p } },
          { rencSelesaiTanam: { contains: p } },
        ]),
        {
          activities: {
            some: {
              OR: datePatterns.flatMap((p) => [
                { rencanaDate: { contains: p } },
                { realisasiDate: { contains: p } },
              ]),
            },
          },
        },
      ];

      if (jsonIds.length > 0) {
        monthOrConditions.push({ id: { in: jsonIds } });
      }

      andClauses.push({ OR: monthOrConditions });
    }

    const aktivitasTerakhirs = parseParamArray(searchParams, 'aktivitasTerakhir').filter(
      (a) => a && a !== 'ALL'
    );
    if (aktivitasTerakhirs.length > 0) {
      const allLandsForAkt = await prisma.land.findMany({
        select: {
          id: true,
          progressTanam: true,
          aplikasiTerakhir: true,
          realBajak: true,
          realMulaiTanam: true,
          realSelesaiTanam: true,
          aplikasiDetails: true,
          activities: {
            select: { code: true, status: true, realisasiDate: true },
          },
        },
      });

      const matchedIds = allLandsForAkt
        .filter((l) => aktivitasTerakhirs.includes(computeAktivitasTerakhir(l)))
        .map((l) => l.id);

      if (matchedIds.length > 0) {
        andClauses.push({ id: { in: matchedIds } });
      } else {
        andClauses.push({ id: { in: [-1] } });
      }
    }


    // Activity, Activity Schedule Type (Rencana/Real), & Activity Month Filter (mmm-yy)
    const activities = parseParamArray(searchParams, 'activity').filter((a) => a && a !== 'ALL');
    const activityType = searchParams.get('activityType')?.trim() || 'all'; // 'all', 'rencana', 'real'
    const activityMonths = parseParamArray(searchParams, 'activityMonths');

    if (activities.length > 0) {
      const allActOrClauses: any[] = [];
      const actPatterns = activityMonths.length > 0 ? getMonthPatterns(activityMonths) : [];

      for (const act of activities) {
        const actInfo = ACTIVITY_MAP[act] || { code: act };

        if (actInfo.code) {
          let dateConditions: any[] = [];
          if (actPatterns.length > 0) {
            if (activityType === 'rencana') {
              dateConditions = actPatterns.map((p) => ({ rencanaDate: { contains: p } }));
            } else if (activityType === 'real') {
              dateConditions = actPatterns.map((p) => ({ realisasiDate: { contains: p } }));
            } else {
              dateConditions = [
                ...actPatterns.map((p) => ({ rencanaDate: { contains: p } })),
                ...actPatterns.map((p) => ({ realisasiDate: { contains: p } })),
              ];
            }
          } else {
            if (activityType === 'rencana') {
              dateConditions = [{ rencanaDate: { not: null } }];
            } else if (activityType === 'real') {
              dateConditions = [{ realisasiDate: { not: null } }];
            } else {
              dateConditions = [{ rencanaDate: { not: null } }, { realisasiDate: { not: null } }];
            }
          }

          allActOrClauses.push({
            activities: {
              some: {
                code: actInfo.code,
                OR: dateConditions,
              },
            },
          });

          if (act === 'prosesTanam') {
            if (actPatterns.length > 0) {
              allActOrClauses.push(
                ...actPatterns.flatMap((p) => [
                  ...(activityType === 'real' || activityType === 'all' ? [{ realMulaiTanam: { contains: p } }] : []),
                  ...(activityType === 'rencana' || activityType === 'all' ? [{ rencMulaiTanam: { contains: p } }] : []),
                ])
              );
            } else {
              if (activityType === 'real' || activityType === 'all') allActOrClauses.push({ realMulaiTanam: { not: null } });
              if (activityType === 'rencana' || activityType === 'all') allActOrClauses.push({ rencMulaiTanam: { not: null } });
            }
          } else if (act === 'selesaiTanam') {
            if (actPatterns.length > 0) {
              allActOrClauses.push(
                ...actPatterns.flatMap((p) => [
                  ...(activityType === 'real' || activityType === 'all' ? [{ realSelesaiTanam: { contains: p } }] : []),
                  ...(activityType === 'rencana' || activityType === 'all' ? [{ rencSelesaiTanam: { contains: p } }] : []),
                ])
              );
            } else {
              if (activityType === 'real' || activityType === 'all') allActOrClauses.push({ realSelesaiTanam: { not: null } });
              if (activityType === 'rencana' || activityType === 'all') allActOrClauses.push({ rencSelesaiTanam: { not: null } });
            }
          }
        }

        const candidateFields = [actInfo.field, ...(actInfo.altFields || [])].filter(Boolean) as string[];
        if (candidateFields.length > 0) {
          const filteredFields = candidateFields.filter((f) => {
            if (activityType === 'rencana') return !f.toLowerCase().startsWith('real');
            if (activityType === 'real') return f.toLowerCase().startsWith('real');
            return true;
          });
          const targetFields = filteredFields.length > 0 ? filteredFields : candidateFields;

          if (actPatterns.length > 0) {
            const likeParts = targetFields
              .flatMap((f) => actPatterns.map((p) => `"aplikasiDetails"->>'${f}' LIKE '%${p}%'`))
              .join(' OR ');
            const matchingLands: any[] = await prisma.$queryRawUnsafe(
              `SELECT id FROM "Land" WHERE ${likeParts}`
            );
            const ids = matchingLands.map((r) => r.id);
            if (ids.length > 0) {
              allActOrClauses.push({ id: { in: ids } });
            } else {
              allActOrClauses.push({ id: -1 });
            }
          } else {
            const nullChecks = targetFields
              .map((f) => `"aplikasiDetails"->>'${f}' IS NOT NULL AND "aplikasiDetails"->>'${f}' != '' AND "aplikasiDetails"->>'${f}' != '-'`)
              .join(' OR ');
            const matchingLands: any[] = await prisma.$queryRawUnsafe(
              `SELECT id FROM "Land" WHERE ${nullChecks}`
            );
            const ids = matchingLands.map((r) => r.id);
            if (ids.length > 0) {
              allActOrClauses.push({ id: { in: ids } });
            } else {
              allActOrClauses.push({ id: -1 });
            }
          }
        }
      }

      if (allActOrClauses.length > 0) {
        andClauses.push({ OR: allActOrClauses });
      }
    } else if (activityMonths.length > 0) {
      const actPatterns = getMonthPatterns(activityMonths);
      let dateConditions: any[] = [];
      if (activityType === 'rencana') {
        dateConditions = actPatterns.map((p) => ({ rencanaDate: { contains: p } }));
      } else if (activityType === 'real') {
        dateConditions = actPatterns.map((p) => ({ realisasiDate: { contains: p } }));
      } else {
        dateConditions = [
          ...actPatterns.map((p) => ({ rencanaDate: { contains: p } })),
          ...actPatterns.map((p) => ({ realisasiDate: { contains: p } })),
        ];
      }

      // Also check aplikasiDetails JSON (pengolahan dates are realisasi)
      let jsonIds: number[] = [];
      if (activityType === 'all' || activityType === 'real') {
        const likeSqlParts = actPatterns.map((p) => `"aplikasiDetails"::text LIKE '%${p}%'`).join(' OR ');
        if (likeSqlParts) {
          const rawJsonLands: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM "Land" WHERE ${likeSqlParts}`
          );
          jsonIds = rawJsonLands.map((r) => r.id);
        }
      }

      const monthOrConditions: any[] = [
        {
          activities: {
            some: {
              OR: dateConditions,
            },
          },
        },
        ...actPatterns.flatMap((p) => [
          ...(activityType === 'real' || activityType === 'all'
            ? [
              { realMulaiTanam: { contains: p } },
              { realSelesaiTanam: { contains: p } },
              { realBkr: { contains: p } },
              { realBajak: { contains: p } },
            ]
            : []),
          ...(activityType === 'rencana' || activityType === 'all'
            ? [
              { rencMulaiTanam: { contains: p } },
              { rencSelesaiTanam: { contains: p } },
              { rencBkr: { contains: p } },
              { rencBajak: { contains: p } },
            ]
            : []),
        ]),
      ];

      if (jsonIds.length > 0) {
        monthOrConditions.push({ id: { in: jsonIds } });
      }

      andClauses.push({ OR: monthOrConditions });
    }

    const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

    const lands = await prisma.land.findMany({
      where,
      orderBy: [{ lokasi: 'asc' }, { id: 'asc' }],
      include: {
        activities: {
          select: {
            code: true,
            rencanaDate: true,
            realisasiDate: true,
            status: true,
          },
        },
      },
    });

    const rows: any[] = [];

    for (const land of lands) {
      const actDict: Record<string, { rencana: string | null; real: string | null; status: string }> = {};
      for (const a of land.activities) {
        actDict[a.code] = {
          rencana: a.rencanaDate,
          real: a.realisasiDate,
          status: a.status,
        };
      }

      // Format clean Aktivitas Terakhir
      const aktivitasTerakhir = computeAktivitasTerakhir(land);


      const appDetails = (typeof land.aplikasiDetails === 'object' && land.aplikasiDetails !== null ? land.aplikasiDetails : {}) as Record<string, any>;

      rows.push({
        'Wilayah': land.wilayah,
        'Lokasi': land.lokasi,
        'Tahun': (land as any).year || '',
        'Luas Bruto (Ha)': land.luasBruto ? Number(land.luasBruto.toFixed(2)) : 0,
        'Luas Netto (Ha)': land.luasNetto ? Number(land.luasNetto.toFixed(2)) : 0,
        'Status': land.status ? land.status.replace(/\d+/g, '').trim() : '',
        'Bibit': land.jenisBibit || '',
        'Kelas Bibit': land.kelasBibit || '',
        'Bulan Tanam': land.bulanTanam || '',
        'Renc Bero Bongkar (Hari)': computeRencanaBeroBongkar(land).hari ?? '',
        'Aktivitas Terakhir': aktivitasTerakhir,
        // Chopper to Kompos
        'Chopper (Renc)': actDict['01.CHOPPER']?.rencana || '',
        'Chopper (Real)': actDict['01.CHOPPER']?.real || '',
        'Chopper Lu (Renc)': actDict['02.CHOPPER_LU']?.rencana || '',
        'Chopper Lu (Real)': actDict['02.CHOPPER_LU']?.real || '',
        'RH1 (Renc)': actDict['03.RH1']?.rencana || '',
        'RH1 (Real)': actDict['03.RH1']?.real || '',
        'Cutting Banana (Renc)': actDict['04.CUTTING_BANANA']?.rencana || '',
        'Cutting Banana (Real)': actDict['04.CUTTING_BANANA']?.real || '',
        'Dolomit (Renc)': actDict['05.DOLOMIT']?.rencana || '',
        'Dolomit (Real)': actDict['05.DOLOMIT']?.real || '',
        'DP 1 (Renc)': actDict['06.DP1']?.rencana || '',
        'DP 1 (Real)': actDict['06.DP1']?.real || '',
        'DP Cross (Renc)': actDict['07.DP_CROSS']?.rencana || '',
        'DP Cross (Real)': actDict['07.DP_CROSS']?.real || '',
        'DP 2 (Renc)': actDict['08.DP2']?.rencana || '',
        'DP 2 (Real)': actDict['08.DP2']?.real || '',
        'Belerang (Renc)': actDict['09.BELERANG']?.rencana || '',
        'Belerang (Real)': actDict['09.BELERANG']?.real || '',
        'Kompos (Renc)': actDict['10.KOMPOS']?.rencana || '',
        'Kompos (Real)': actDict['10.KOMPOS']?.real || '',
        // Pengolahan Columns (Rencana & Real)
        'Bajak Awal MB 5 BTR (Renc)': appDetails.rencAwalMb5Btr || appDetails.bajakAwalMb5Btr || '',
        'Bajak Awal MB 5 BTR (Real)': appDetails.realBajakAwalMb5Btr || '',
        'Bajak Awal MB 2.5 (Renc)': appDetails.bajakAwalMb25 || '',
        'Bajak Awal MB 2.5 (Real)': appDetails.realBajakAwalMb25 || '',
        'Bajak Awal MPH (Renc)': appDetails.bajakAwalMph || '',
        'Bajak Awal MPH (Real)': appDetails.realBajakAwalHoward || '',
        'Bajak Awal Nardi (Renc)': appDetails.bajakAwalNardi || '',
        'Bajak Awal Nardi (Real)': appDetails.realBajakAwalNardi || '',
        'HR Eks MB (Renc)': appDetails.hrEksMb || '',
        'HR Eks MB (Real)': appDetails.realHrEksMb || '',
        'Subsoiler SS1 (Renc)': appDetails.subsoilerSs1 || '',
        'Subsoiler SS1 (Real)': appDetails.realSubsoilerSs1 || '',
        'Subsoiler SS2 (Renc)': appDetails.subsoilerSs2 || '',
        'Subsoiler SS2 (Real)': appDetails.realSubsoilerSs2 || '',
        'Finishing Rotary FH1 (Renc)': appDetails.finishingRotaryFh1 || '',
        'Finishing Rotary FH1 (Real)': appDetails.realFinishingRotaryFh1 || '',
        'Finishing Rotary FH2 (Renc)': appDetails.finishingRotaryFh2 || '',
        'Finishing Rotary FH2 (Real)': appDetails.realRotaryFh2 || '',
        'Ridger (Renc)': actDict['21.RIDGER']?.rencana || appDetails.ridger || '',
        'Ridger (Real)': actDict['21.RIDGER']?.real || appDetails.realRidger || '',
        'Jalan & Sal (Renc)': actDict['22.JALAN_SAL']?.rencana || appDetails.jalanSal || '',
        'Jalan & Sal (Real)': actDict['22.JALAN_SAL']?.real || appDetails.realJalanSal || '',
        'Siap Tanam': actDict['22.SIAP_TANAM']?.real || '',
        'Proses Tanam': actDict['23.PROSES_TNM']?.real || land.realMulaiTanam || '',
        'Selesai Tanam': actDict['24.SLS_TANAM']?.real || land.realSelesaiTanam || '',
        // Profil Tambahan
        'Eks Tanaman': land.eks || '',
        'Sejarah Rotasi': land.sejarah || '',
        'pH BK': land.phBk ?? '',
        'pH SN': land.phSn ?? '',
        'Bulan Siap Tanam (SN)': land.bulanSn || '',
        'Rencana Mulai Tanam': land.rencMulaiTanam || '',
        'Rencana Selesai Tanam': land.rencSelesaiTanam || '',
        'Realisasi Mulai Tanam': land.realMulaiTanam || '',
        'Realisasi Selesai Tanam': land.realSelesaiTanam || '',
        'Durasi Tanam (Hari)': land.hariWaktu ?? '',
        'Progress Tanam (%)': land.progressTanam ?? 0,
        'Status Produksi': land.statusProduksi || '',
        'Bulan Panen': land.bulanPanen || '',
        'Standar Panen': land.stdPanen || '',
        'Deviasi Panen (Bulan)': land.deviasiMonth ?? '',
      });
    }

    const colKeys = Object.keys(rows[0] || {});

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Lahan', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = colKeys.map((key) => ({
      header: key,
      key,
    }));

    // Header styling: Background Biru Muda (#D9E1F2), Bold, Center Alignment
    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }, // Soft Corporate Light Blue
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F4E79' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
        left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      };
    });

    // Populate data rows with center alignment and clean borders
    rows.forEach((rowData, idx) => {
      const row = worksheet.addRow(rowData);
      row.height = 20;

      const isOdd = idx % 2 === 1;
      row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (isOdd) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      });
    });

    // Aktifkan Filter Otomatis
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: colKeys.length },
    };

    // Sesuaikan ukuran lebar kolom dengan isian selnya
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.min(Math.max(maxLen + 3, 10), 30);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Data_Lahan_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting lands data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
