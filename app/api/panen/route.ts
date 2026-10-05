import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah') || 'ALL';
    const month = searchParams.get('month') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));

    const where: any = {
      bulanPanen: { not: null },
    };

    if (wilayah && wilayah !== 'ALL') {
      where.wilayah = wilayah;
    }

    if (month && month !== 'ALL') {
      where.bulanPanen = month;
    }

    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { wilayah: { contains: search, mode: 'insensitive' } },
        { statusProduksi: { contains: search, mode: 'insensitive' } },
        { jenisBibit: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.land.count({ where });

    const lands = await prisma.land.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ bulanPanen: 'asc' }, { lokasi: 'asc' }],
      select: {
        id: true,
        lokasi: true,
        wilayah: true,
        luasNetto: true,
        luasBruto: true,
        jenisBibit: true,
        kelasBibit: true,
        bulanTanam: true,
        bulanPanen: true,
        statusProduksi: true,
        stdPanen: true,
        deviasiMonth: true,
      },
    });

    // Aggregated harvest breakdown across ALL lands with bulanPanen
    const allHarvestLands = await prisma.land.findMany({
      where: wilayah && wilayah !== 'ALL' ? { wilayah, bulanPanen: { not: null } } : { bulanPanen: { not: null } },
      select: {
        lokasi: true,
        wilayah: true,
        luasNetto: true,
        bulanPanen: true,
        statusProduksi: true,
        stdPanen: true,
        deviasiMonth: true,
      },
    });

    const monthGroups: Record<
      string,
      {
        month: string;
        statusProduksi: string;
        targetPlots: number;
        totalHa: number;
        stdPanen: string;
        devs: number[];
        locations: string[];
      }
    > = {};

    let grandTotalHa = 0;

    for (const l of allHarvestLands) {
      const m = l.bulanPanen || 'Unscheduled';
      grandTotalHa += l.luasNetto || 0;

      if (!monthGroups[m]) {
        monthGroups[m] = {
          month: m,
          statusProduksi: l.statusProduksi || 'NSFC',
          targetPlots: 0,
          totalHa: 0,
          stdPanen: l.stdPanen || m,
          devs: [],
          locations: [],
        };
      }

      monthGroups[m].targetPlots += 1;
      monthGroups[m].totalHa += l.luasNetto || 0;
      monthGroups[m].locations.push(l.lokasi);
      if (l.deviasiMonth !== null) {
        monthGroups[m].devs.push(l.deviasiMonth);
      }
    }

    const harvestSchedule = Object.values(monthGroups)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((g) => ({
        month: g.month,
        status: g.statusProduksi,
        targetPlots: g.targetPlots,
        totalHa: Math.round(g.totalHa * 10) / 10,
        stdPanen: g.stdPanen,
        devAvg: g.devs.length > 0 ? Math.round((g.devs.reduce((a, b) => a + b, 0) / g.devs.length) * 10) / 10 : 0,
        locations: g.locations.slice(0, 10),
      }));

    return NextResponse.json({
      success: true,
      data: lands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalLocations: allHarvestLands.length,
        totalHa: Math.round(grandTotalHa * 10) / 10,
        schedule: harvestSchedule,
        availableMonths: Object.keys(monthGroups).sort(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching harvest data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
