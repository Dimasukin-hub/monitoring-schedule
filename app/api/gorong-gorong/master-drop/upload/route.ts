import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { syncMasterDataDropFromWorkbook } from '@/lib/lokasiOrderSnapshot';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace';
    const isPartial = mode === 'partial';

    if (!file) {
      return NextResponse.json({ success: false, message: 'Berkas Excel wajib diunggah!' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });

    const totalProcessed = await syncMasterDataDropFromWorkbook(wb, isPartial ? 'partial' : 'full_replace');

    if (totalProcessed === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada baris data Master Drop yang valid ditemukan dalam berkas Excel. Pastikan nama sheet memuat kata "Drop" atau "Data Drop".',
      });
    }

    return NextResponse.json({
      success: true,
      message: isPartial
        ? `Berhasil menambahkan ${totalProcessed} data baru Master Drop ke database!`
        : `Berhasil me-replace total seluruh ${totalProcessed} data Master Drop di database dengan data terbaru!`,
      count: totalProcessed,
    });
  } catch (error: any) {
    console.error('Error uploading master data drop:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunggah Master Data Drop: ' + error.message },
      { status: 500 }
    );
  }
}

