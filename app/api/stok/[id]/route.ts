import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const landId = parseInt(id, 10);

    const allowedFields = [
      'wilayah',
      'luasBruto',
      'luasNetto',
      'status',
      'eks',
      'sejarah',
      'phBk',
      'phSn',
      'category',
    ];

    const dataToUpdate: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        dataToUpdate[key] = body[key];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields provided' }, { status: 400 });
    }

    let updated;
    if (!isNaN(landId)) {
      updated = await prisma.stokLahanMaster.update({
        where: { id: landId },
        data: dataToUpdate,
      });
    } else {
      updated = await prisma.stokLahanMaster.update({
        where: { lokasi: id },
        data: dataToUpdate,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Data stok lahan berhasil diperbarui di tabel StokLahanMaster',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating StokLahanMaster:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data stok lahan', details: error.message },
      { status: 500 }
    );
  }
}
