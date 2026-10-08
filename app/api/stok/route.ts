import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StokCategory } from '@/lib/landClassification';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category')?.toUpperCase() || 'BK') as StokCategory; // 'BK' | 'BJK' | 'SN' | 'PROSES' | 'SELESAI'
    const wilayah = searchParams.get('wilayah') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));
    const sortBy = searchParams.get('sortBy') || 'no';
    const sortOrder = (searchParams.get('sortOrder')?.toLowerCase() || 'asc') as 'asc' | 'desc';

    const andConditions: any[] = [];

    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        andConditions.push({ wilayah: wList[0] });
      } else if (wList.length > 1) {
        andConditions.push({ wilayah: { in: wList } });
      }
    }

    if (status && status !== 'ALL') {
      const sList = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (sList.length === 1) {
        andConditions.push({ status: { contains: sList[0], mode: 'insensitive' } });
      } else if (sList.length > 1) {
        andConditions.push({
          OR: sList.map((s) => ({ status: { contains: s, mode: 'insensitive' } })),
        });
      }
    }

    if (search) {
      andConditions.push({
        OR: [
          { lokasi: { contains: search, mode: 'insensitive' } },
          { wilayah: { contains: search, mode: 'insensitive' } },
          { status: { contains: search, mode: 'insensitive' } },
          { eks: { contains: search, mode: 'insensitive' } },
          { sejarah: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    // Ambil data langsung dari tabel database khusus StokLahanMaster
    // yang 100% mutakhir mengikuti Schedule 2026 Update 09 Sheet Master
    const allStokLands = await prisma.stokLahanMaster.findMany({
      where,
      orderBy: { lokasi: 'asc' },
    });

    const classified: Record<StokCategory, any[]> = {
      BK: [],
      BJK: [],
      SN: [],
      PROSES: [],
      SELESAI: [],
    };

    const counts: Record<StokCategory, { count: number; totalNetto: number }> = {
      BK: { count: 0, totalNetto: 0 },
      BJK: { count: 0, totalNetto: 0 },
      SN: { count: 0, totalNetto: 0 },
      PROSES: { count: 0, totalNetto: 0 },
      SELESAI: { count: 0, totalNetto: 0 },
    };

    for (const l of allStokLands) {
      const cat = (l.category?.toUpperCase() || 'BK') as StokCategory;
      const validCat: StokCategory = classified[cat] ? cat : 'BK';

      counts[validCat].count++;
      counts[validCat].totalNetto = Math.round((counts[validCat].totalNetto + (l.luasNetto || 0)) * 100) / 100;

      classified[validCat].push({
        id: l.id,
        originalIndex: classified[validCat].length + 1,
        lokasi: l.lokasi,
        wilayah: l.wilayah,
        luasBruto: l.luasBruto,
        luasNetto: l.luasNetto,
        status: l.status ? l.status.replace(/\d+/g, '').trim() : null,
        eks: l.eks,
        sejarah: l.sejarah,
        phBk: l.phBk,
        phSn: l.phSn,
        aplikasiTerakhir: l.aplikasiTerakhir || 'Tahap Bongkar',
        category: validCat,
      });
    }

    const targetList = classified[category] || classified['BK'];

    // Sorting
    const mult = sortOrder === 'desc' ? -1 : 1;
    targetList.sort((a, b) => {
      if (sortBy === 'no' || sortBy === 'id') {
        return (a.originalIndex - b.originalIndex) * mult;
      }
      if (sortBy === 'wilayah') {
        const valA = a.wilayah || '';
        const valB = b.wilayah || '';
        const cmp = valA.localeCompare(valB);
        return cmp !== 0 ? cmp * mult : (a.originalIndex - b.originalIndex) * mult;
      }
      if (sortBy === 'lokasi') {
        const valA = a.lokasi || '';
        const valB = b.lokasi || '';
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return cmp !== 0 ? cmp * mult : (a.originalIndex - b.originalIndex) * mult;
      }
      if (sortBy === 'luasBruto') {
        const valA = a.luasBruto ?? -Infinity;
        const valB = b.luasBruto ?? -Infinity;
        return (valA - valB) * mult;
      }
      if (sortBy === 'luasNetto') {
        const valA = a.luasNetto ?? -Infinity;
        const valB = b.luasNetto ?? -Infinity;
        return (valA - valB) * mult;
      }
      if (sortBy === 'status') {
        const valA = a.status || '';
        const valB = b.status || '';
        const cmp = valA.localeCompare(valB);
        return cmp !== 0 ? cmp * mult : (a.originalIndex - b.originalIndex) * mult;
      }
      if (sortBy === 'eks') {
        const valA = a.eks || '';
        const valB = b.eks || '';
        const cmp = valA.localeCompare(valB);
        return cmp !== 0 ? cmp * mult : (a.originalIndex - b.originalIndex) * mult;
      }
      if (sortBy === 'sejarah') {
        const valA = a.sejarah || '';
        const valB = b.sejarah || '';
        const cmp = valA.localeCompare(valB);
        return cmp !== 0 ? cmp * mult : (a.originalIndex - b.originalIndex) * mult;
      }
      if (sortBy === 'phBk') {
        const valA = a.phBk ?? -Infinity;
        const valB = b.phBk ?? -Infinity;
        return (valA - valB) * mult;
      }
      if (sortBy === 'phSn') {
        const valA = a.phSn ?? -Infinity;
        const valB = b.phSn ?? -Infinity;
        return (valA - valB) * mult;
      }
      return 0;
    });

    const total = targetList.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedList = targetList.slice(startIndex, startIndex + limit).map((item, idx) => ({
      ...item,
      no: startIndex + idx + 1,
    }));

    return NextResponse.json({
      success: true,
      category,
      categoryStats: counts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      data: paginatedList,
    });
  } catch (error: any) {
    console.error('Error fetching stok lands from StokLahanMaster:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
