import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeAktivitasTerakhir, sortAktivitasTerakhirList, computeRencanaBeroBongkar } from '@/lib/landActivityUtils';

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
  rgKons: { field: 'rgKons' },
  tnmKons: { field: 'tnmKons' },
  umurKons: { field: 'umurKons' },
  chopperEksKons: { field: 'chopperEksKons' },
  bajakAkhirMb5Btr: { field: 'bajakAkhirMb5Btr' },
  bajakAkhirMb25Ahir: { field: 'bajakAkhirMb25Ahir' },
  bajakAkhirHowardAhir: { field: 'bajakAkhirHowardAhir' },
  bajakAkhirCelliAhir: { field: 'bajakAkhirCelliAhir' },
  subsoiler: { code: '17.SUBSOILER', altFields: ['subsoilerSs1', 'realSubsoilerSs1', 'subsoilerSs2', 'realSubsoilerSs2'] },
  subsoilerSs1: { field: 'subsoilerSs1', altFields: ['realSubsoilerSs1'] },
  subsoilerSs2: { field: 'subsoilerSs2', altFields: ['realSubsoilerSs2'] },
  finishingHarrow: { code: '18.FINISHING_HARROW' },
  finishingFhkRent: { field: 'finishingFhkRent' },
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

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function toMmmYy(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr === '-') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (m >= 0 && m < 12) {
      return `${MONTHS_SHORT[m]}-${String(y).slice(-2)}`;
    }
  }
  return null;
}

const ALL_ACTIVITY_MONTHS = [
  // 2021
  'Jan-21', 'Feb-21', 'Mar-21', 'Apr-21', 'Mei-21', 'Jun-21', 'Jul-21', 'Agu-21', 'Sep-21', 'Okt-21', 'Nov-21', 'Des-21',
  // 2022
  'Jan-22', 'Feb-22', 'Mar-22', 'Apr-22', 'Mei-22', 'Jun-22', 'Jul-22', 'Agu-22', 'Sep-22', 'Okt-22', 'Nov-22', 'Des-22',
  // 2023
  'Jan-23', 'Feb-23', 'Mar-23', 'Apr-23', 'Mei-23', 'Jun-23', 'Jul-23', 'Agu-23', 'Sep-23', 'Okt-23', 'Nov-23', 'Des-23',
  // 2024
  'Jan-24', 'Feb-24', 'Mar-24', 'Apr-24', 'Mei-24', 'Jun-24', 'Jul-24', 'Agu-24', 'Sep-24', 'Okt-24', 'Nov-24', 'Des-24',
  // 2025
  'Jan-25', 'Feb-25', 'Mar-25', 'Apr-25', 'Mei-25', 'Jun-25', 'Jul-25', 'Agu-25', 'Sep-25', 'Okt-25', 'Nov-25', 'Des-25',
  // 2026
  'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26',
  // 2027
  'Jan-27', 'Feb-27', 'Mar-27', 'Apr-27', 'Mei-27', 'Jun-27', 'Jul-27', 'Agu-27', 'Sep-27', 'Okt-27', 'Nov-27', 'Des-27',
  // 2028
  'Jan-28', 'Feb-28', 'Mar-28', 'Apr-28', 'Mei-28', 'Jun-28', 'Jul-28', 'Agu-28', 'Sep-28', 'Okt-28', 'Nov-28', 'Des-28',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const sortBy = searchParams.get('sortBy') || 'lokasi';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc';

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

      // Query any lands having matching dates in JSON aplikasiDetails
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

    // Retrieve lands with activities and details to reliably determine computed "Aktivitas Terakhir"
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

    const distinctAktSet = new Set<string>();
    for (const l of allLandsForAkt) {
      distinctAktSet.add(computeAktivitasTerakhir(l));
    }
    const distinctAktivitasTerakhir = sortAktivitasTerakhirList(Array.from(distinctAktSet));

    if (aktivitasTerakhirs.length > 0) {
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
      // Activity is 'ALL', but activityMonths is selected
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

    const total = await prisma.land.count({ where });

    // Validate and map sortBy column
    const sortFieldMap: Record<string, string> = {
      id: 'id',
      no: 'id',
      lokasi: 'lokasi',
      wilayah: 'wilayah',
      luasBruto: 'luasBruto',
      luasNetto: 'luasNetto',
      status: 'status',
      eks: 'eks',
      sejarah: 'sejarah',
      jenisBibit: 'jenisBibit',
      bulanTanam: 'bulanTanam',
      aktivitasTerakhir: 'aplikasiTerakhir',
      progressTanam: 'progressTanam',
      prosesTanam: 'realMulaiTanam',
      selesaiTanam: 'realSelesaiTanam',
    };
    const orderField = sortFieldMap[sortBy] || 'lokasi';

    let lands: any[] = [];
    if (sortBy === 'rencanaBeroBongkar') {
      const allMatching = await prisma.land.findMany({
        where,
        include: {
          activities: {
            select: {
              code: true,
              name: true,
              status: true,
              rencanaDate: true,
              realisasiDate: true,
              stepOrder: true,
            },
            orderBy: { stepOrder: 'asc' },
          },
        },
      });

      allMatching.sort((a, b) => {
        const beroA = computeRencanaBeroBongkar(a).hari;
        const beroB = computeRencanaBeroBongkar(b).hari;
        const valA = beroA !== null ? beroA : (sortOrder === 'asc' ? 999999 : -999999);
        const valB = beroB !== null ? beroB : (sortOrder === 'asc' ? 999999 : -999999);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });

      lands = allMatching.slice((page - 1) * limit, page * limit);
    } else {
      lands = await prisma.land.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { [orderField]: sortOrder },
          { id: 'asc' },
        ],
        include: {
          activities: {
            select: {
              code: true,
              name: true,
              status: true,
              rencanaDate: true,
              realisasiDate: true,
              stepOrder: true,
            },
            orderBy: { stepOrder: 'asc' },
          },
        },
      });
    }

    const emptyAct = { rencana: null, real: null, status: 'PENDING' };

    // Format each land with dynamic Aktivitas Terakhir and activities up to Jalan & Sal
    const formattedLands = lands.map((land) => {
      const actDict: Record<string, { rencana: string | null; real: string | null; status: string }> = {};
      for (const a of land.activities) {
        actDict[a.code] = {
          rencana: a.rencanaDate,
          real: a.realisasiDate,
          status: a.status,
        };
      }

      // Determine dynamic clean "Aktivitas Terakhir" (Bab 17 PRD)
      const computed = computeAktivitasTerakhir(land);
      const aktivitasTerakhir =
        computed !== 'Persiapan Bongkar'
          ? computed
          : (land.aplikasiTerakhir && land.aplikasiTerakhir !== '-' ? land.aplikasiTerakhir : computed);

      // Hitung Rencana Bero Bongkar (Excel Sheet Master Kolom BE)
      const beroBongkar = computeRencanaBeroBongkar(land);

      return {
        id: land.id,
        lokasi: land.lokasi,
        wilayah: land.wilayah,
        year: (land as any).year,
        luasBruto: land.luasBruto,
        luasNetto: land.luasNetto,
        status: land.status ? land.status.replace(/\d+/g, '').trim() : null,
        eks: land.eks,
        sejarah: land.sejarah,
        jenisBibit: land.jenisBibit,
        kelasBibit: land.kelasBibit,
        bulanTanam: land.bulanTanam,
        rencanaBeroBongkar: beroBongkar.hari,
        kondisiBeroBongkar: beroBongkar.kondisi,
        keteranganBeroBongkar: beroBongkar.keterangan,
        tglAwalBkrBero: beroBongkar.tglAwalBkr,
        tglSiapTanamBero: beroBongkar.tglSiapTanam,
        aktivitasTerakhir,
        aplikasiDetails: land.aplikasiDetails || {},
        ...(typeof land.aplikasiDetails === 'object' && land.aplikasiDetails !== null ? land.aplikasiDetails : {}),
        // All 10 activities Bongkar (Chopper s/d Kompos) with both rencana & real
        chopper: {
          rencana: actDict['01.CHOPPER']?.rencana || (land.aplikasiDetails as any)?.chopper || null,
          real: actDict['01.CHOPPER']?.real || (land.aplikasiDetails as any)?.realChopper || null,
          status: actDict['01.CHOPPER']?.status || ((land.aplikasiDetails as any)?.realChopper ? 'COMPLETED' : 'PENDING'),
        },
        chopperLu: {
          rencana: actDict['02.CHOPPER_LU']?.rencana || (land.aplikasiDetails as any)?.chopperLu || null,
          real: actDict['02.CHOPPER_LU']?.real || (land.aplikasiDetails as any)?.realChopperLu || null,
          status: actDict['02.CHOPPER_LU']?.status || ((land.aplikasiDetails as any)?.realChopperLu ? 'COMPLETED' : 'PENDING'),
        },
        rh1: {
          rencana: actDict['03.RH1']?.rencana || (land.aplikasiDetails as any)?.rh1 || null,
          real: actDict['03.RH1']?.real || (land.aplikasiDetails as any)?.realRh1 || null,
          status: actDict['03.RH1']?.status || ((land.aplikasiDetails as any)?.realRh1 ? 'COMPLETED' : 'PENDING'),
        },
        cuttingBanana: {
          rencana: actDict['04.CUTTING_BANANA']?.rencana || (land.aplikasiDetails as any)?.cuttingBanana || null,
          real: actDict['04.CUTTING_BANANA']?.real || (land.aplikasiDetails as any)?.realCuttingBanana || null,
          status: actDict['04.CUTTING_BANANA']?.status || ((land.aplikasiDetails as any)?.realCuttingBanana ? 'COMPLETED' : 'PENDING'),
        },
        dolomit: {
          rencana: actDict['05.DOLOMIT']?.rencana || (land.aplikasiDetails as any)?.dolomit || null,
          real: actDict['05.DOLOMIT']?.real || (land.aplikasiDetails as any)?.realDolomit || null,
          status: actDict['05.DOLOMIT']?.status || ((land.aplikasiDetails as any)?.realDolomit ? 'COMPLETED' : 'PENDING'),
        },
        dp1: {
          rencana: actDict['06.DP1']?.rencana || (land.aplikasiDetails as any)?.dp1 || null,
          real: actDict['06.DP1']?.real || (land.aplikasiDetails as any)?.realDp1 || null,
          status: actDict['06.DP1']?.status || ((land.aplikasiDetails as any)?.realDp1 ? 'COMPLETED' : 'PENDING'),
        },
        dpCross: {
          rencana: actDict['07.DP_CROSS']?.rencana || (land.aplikasiDetails as any)?.dpCross || null,
          real: actDict['07.DP_CROSS']?.real || (land.aplikasiDetails as any)?.realDpCross || null,
          status: actDict['07.DP_CROSS']?.status || ((land.aplikasiDetails as any)?.realDpCross ? 'COMPLETED' : 'PENDING'),
        },
        dp2: {
          rencana: actDict['08.DP2']?.rencana || (land.aplikasiDetails as any)?.dp2 || null,
          real: actDict['08.DP2']?.real || (land.aplikasiDetails as any)?.realDp2 || null,
          status: actDict['08.DP2']?.status || ((land.aplikasiDetails as any)?.realDp2 ? 'COMPLETED' : 'PENDING'),
        },
        belerang: {
          rencana: actDict['09.BELERANG']?.rencana || (land.aplikasiDetails as any)?.belerang || null,
          real: actDict['09.BELERANG']?.real || (land.aplikasiDetails as any)?.realBelerang || null,
          status: actDict['09.BELERANG']?.status || ((land.aplikasiDetails as any)?.realBelerang ? 'COMPLETED' : 'PENDING'),
        },
        kompos: {
          rencana: actDict['10.KOMPOS']?.rencana || (land.aplikasiDetails as any)?.kompos || null,
          real: actDict['10.KOMPOS']?.real || (land.aplikasiDetails as any)?.realKompos || null,
          status: actDict['10.KOMPOS']?.status || ((land.aplikasiDetails as any)?.realKompos ? 'COMPLETED' : 'PENDING'),
        },
        bajakAwal: actDict['11.BAJAK_AWAL'] || emptyAct,
        subsoiler: actDict['17.SUBSOILER'] || emptyAct,
        finishingHarrow: actDict['18.FINISHING_HARROW'] || emptyAct,
        finishingRotary: actDict['19.FINISHING_ROTARY'] || emptyAct,
        rotaryFh2: actDict['20.ROTARY_FH2'] || emptyAct,
        siapTanam: actDict['22.SIAP_TANAM']?.real || (land.aplikasiDetails as any)?.siapTanam || (land.aplikasiDetails as any)?.realSiapTanam || null,
        prosesTanam:
          activityType === 'rencana'
            ? actDict['23.PROSES_TNM']?.rencana || land.rencMulaiTanam || (land.aplikasiDetails as any)?.rencMulaiTanam || null
            : actDict['23.PROSES_TNM']?.real || land.realMulaiTanam || (land.aplikasiDetails as any)?.realMulaiTanam || (land.aplikasiDetails as any)?.prosesTanam || null,
        selesaiTanam:
          activityType === 'rencana'
            ? actDict['24.SLS_TANAM']?.rencana || land.rencSelesaiTanam || (land.aplikasiDetails as any)?.rencSelesaiTanam || null
            : actDict['24.SLS_TANAM']?.real || land.realSelesaiTanam || (land.aplikasiDetails as any)?.realSelesaiTanam || (land.aplikasiDetails as any)?.selesaiTanam || null,
        ridger: {
          rencana: actDict['21.RIDGER']?.rencana || (land.aplikasiDetails as any)?.ridger || null,
          real: actDict['21.RIDGER']?.real || (land.aplikasiDetails as any)?.realRidger || null,
          status: actDict['21.RIDGER']?.status || 'PENDING',
        },
        jalanSal: {
          rencana: actDict['22.JALAN_SAL']?.rencana || (land.aplikasiDetails as any)?.jalanSal || null,
          real: actDict['22.JALAN_SAL']?.real || (land.aplikasiDetails as any)?.realJalanSal || null,
          status: actDict['22.JALAN_SAL']?.status || 'PENDING',
        },
      };
    });

    // Extract filter option sets for UI dropdowns
    const distinctWilayah = await prisma.land.findMany({
      select: { wilayah: true },
      distinct: ['wilayah'],
      orderBy: { wilayah: 'asc' },
    });

    const distinctJenisBibit = await prisma.land.findMany({
      where: {
        jenisBibit: {
          not: null,
          notIn: ['0', '-', ''],
        },
      },
      select: { jenisBibit: true },
      distinct: ['jenisBibit'],
      orderBy: { jenisBibit: 'asc' },
    });

    const distinctKelasBibit = await prisma.land.findMany({
      where: {
        kelasBibit: {
          not: null,
          notIn: ['0', '-', ''],
        },
      },
      select: { kelasBibit: true },
      distinct: ['kelasBibit'],
      orderBy: { kelasBibit: 'asc' },
    });

    const distinctBulanTanam = await prisma.land.findMany({
      where: { bulanTanam: { not: null } },
      select: { bulanTanam: true },
      distinct: ['bulanTanam'],
      orderBy: { bulanTanam: 'asc' },
    });

    const distinctStatus = await prisma.land.findMany({
      where: { status: { not: null } },
      select: { status: true },
      distinct: ['status'],
      orderBy: { status: 'asc' },
    });

    const distinctYears = ['2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028'];

    return NextResponse.json({
      success: true,
      data: formattedLands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        wilayahs: distinctWilayah.map((w) => w.wilayah),
        years: distinctYears,
        defaultYear: '2026',
        statuses: Array.from(
          new Set(
            distinctStatus
              .map((s) => (s.status ? s.status.replace(/\d+/g, '').trim() : ''))
              .filter(Boolean)
          )
        ).sort(),
        jenisBibit: distinctJenisBibit
          .map((b) => b.jenisBibit)
          .filter((b): b is string => Boolean(b) && b !== '0' && b !== '-'),
        kelasBibit: distinctKelasBibit
          .map((k) => k.kelasBibit)
          .filter((k): k is string => Boolean(k) && k !== '0' && k !== '-'),
        bulanTanam: distinctBulanTanam
          .map((m) => m.bulanTanam)
          .filter((m): m is string => typeof m === 'string' && !m.endsWith('-14') && !m.includes('2014') && !m.includes('1900')),
        activityMonths: ALL_ACTIVITY_MONTHS,
        aktivitasTerakhir: distinctAktivitasTerakhir,
      },
    });
  } catch (error: any) {
    console.error('Error fetching lands:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      lokasi,
      wilayah,
      luasBruto,
      luasNetto,
      status,
      bulanTanam,
      rencBkr,
      year,
    } = body;

    if (!lokasi || !String(lokasi).trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama lokasi / petak wajib diisi' },
        { status: 400 }
      );
    }

    const cleanLokasi = String(lokasi).trim();
    const cleanWilayah = String(wilayah || 'W01').trim();
    const cleanBruto = Number(luasBruto) || 0;
    const cleanNetto = Number(luasNetto) || 0;
    const cleanStatus = status ? String(status).trim() : 'NSBK';
    const cleanBulanTanam = bulanTanam ? String(bulanTanam).trim() : null;
    const cleanRencBkr = rencBkr && String(rencBkr).trim() !== '' && String(rencBkr).trim() !== '-' ? String(rencBkr).trim() : null;

    // Determine target year
    let targetYear = 2026;
    if (year) {
      targetYear = parseInt(year, 10) || 2026;
    } else if (cleanBulanTanam) {
      const parts = cleanBulanTanam.split('-');
      if (parts.length === 2) {
        let yy = parseInt(parts[1], 10);
        if (yy < 100) yy += 2000;
        if (!isNaN(yy)) targetYear = yy;
      }
    }

    // Check if duplicate in the same year
    const existing = await prisma.land.findFirst({
      where: {
        lokasi: cleanLokasi,
        year: targetYear,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Lahan dengan lokasi "${cleanLokasi}" untuk tahun ${targetYear} sudah terdaftar di database!`,
        },
        { status: 400 }
      );
    }

    // Standard 20 activity pipeline
    const activitiesConfig = [
      { code: '01.CHOPPER', name: 'Chopper', order: 1, renc: cleanRencBkr },
      { code: '02.CHOPPER_LU', name: 'Chopper Lu', order: 2, renc: null },
      { code: '03.RH1', name: 'RH1', order: 3, renc: null },
      { code: '04.CUTTING_BANANA', name: 'Cutting Banana', order: 4, renc: null },
      { code: '05.DOLOMIT', name: 'Aplikasi Dolomit', order: 5, renc: null },
      { code: '06.DP1', name: 'DP1', order: 6, renc: null },
      { code: '07.DP_CROSS', name: 'DP Cross', order: 7, renc: null },
      { code: '08.DP2', name: 'DP2', order: 8, renc: null },
      { code: '09.BELERANG', name: 'Belerang', order: 9, renc: null },
      { code: '10.KOMPOS', name: 'Kompos', order: 10, renc: null },
      { code: '11.BAJAK_AWAL', name: 'Bajak Awal', order: 11, renc: null },
      { code: '17.SUBSOILER', name: 'Subsoiler', order: 12, renc: null },
      { code: '18.FINISHING_HARROW', name: 'Finishing Harrow', order: 13, renc: null },
      { code: '19.FINISHING_ROTARY', name: 'Finishing Rotary', order: 14, renc: null },
      { code: '20.ROTARY_FH2', name: 'Rotary FH2', order: 15, renc: null },
      { code: '21.RIDGER', name: 'Ridger', order: 16, renc: null },
      { code: '22.JALAN_SAL', name: 'Jalan & Saluran', order: 17, renc: null },
      { code: '22.SIAP_TANAM', name: 'Siap Tanam', order: 18, renc: null },
      { code: '23.PROSES_TNM', name: 'Proses Tanam', order: 19, renc: null },
      { code: '24.SLS_TANAM', name: 'Selesai Tanam', order: 20, renc: null },
    ];

    const aplikasiDetails: Record<string, any> = {};
    if (cleanRencBkr) {
      aplikasiDetails.chopper = cleanRencBkr;
    }

    const newLand = await prisma.land.create({
      data: {
        lokasi: cleanLokasi,
        wilayah: cleanWilayah,
        year: targetYear,
        luasBruto: cleanBruto,
        luasNetto: cleanNetto,
        status: cleanStatus,
        statusAplikasi: cleanStatus,
        bulanTanam: cleanBulanTanam,
        rencBkr: cleanRencBkr,
        aplikasiTerakhir: 'Persiapan Bongkar',
        aplikasiDetails,
        activities: {
          create: activitiesConfig.map((act) => ({
            code: act.code,
            name: act.name,
            stepOrder: act.order,
            rencanaDate: act.renc,
            realisasiDate: null,
            status: 'PENDING',
          })),
        },
      },
      include: {
        activities: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Data lahan "${cleanLokasi}" berhasil ditambahkan.`,
      data: newLand,
    });
  } catch (error: any) {
    console.error('Error creating new land:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

