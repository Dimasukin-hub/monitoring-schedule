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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const landId = parseInt(id, 10);

    let target: any;
    if (!isNaN(landId)) {
      target = await prisma.stokLahanMaster.findUnique({ where: { id: landId } });
    }
    if (!target) {
      target = await prisma.stokLahanMaster.findFirst({ where: { lokasi: id } });
    }

    if (!target) {
      return NextResponse.json({ success: false, error: 'Data stok lahan tidak ditemukan' }, { status: 404 });
    }

    await prisma.stokLahanMaster.delete({ where: { id: target.id } });

    // Also remove from Land if it exists
    await prisma.land.deleteMany({ where: { lokasi: target.lokasi } });

    return NextResponse.json({
      success: true,
      message: `Data stok lokasi ${target.lokasi} berhasil dihapus`,
    });
  } catch (error: any) {
    console.error('Error deleting StokLahanMaster:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus data stok lahan', details: error.message },
      { status: 500 }
    );
  }
}

