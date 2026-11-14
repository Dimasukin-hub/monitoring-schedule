import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { syncMasterDataPindahFromWorkbook } from '@/lib/lokasiOrderSnapshot';

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

    const totalProcessed = await syncMasterDataPindahFromWorkbook(wb, isPartial ? 'partial' : 'full_replace');

    if (totalProcessed === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada baris data Master Pindah Lokasi yang valid ditemukan dalam berkas Excel. Pastikan nama petak pengirim, petak penerima, dan kuantiti terisi.',
      });
    }

    return NextResponse.json({
      success: true,
      message: isPartial
        ? `Berhasil menambahkan ${totalProcessed} data baru Master Pindah Lokasi ke database!`
        : `Berhasil me-replace total seluruh ${totalProcessed} data Master Pindah Lokasi di database dengan data terbaru!`,
      count: totalProcessed,
    });
  } catch (error: any) {
    console.error('Error uploading master data pindah:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunggah Master Data Pindah Lokasi: ' + error.message },
      { status: 500 }
    );
  }
}

