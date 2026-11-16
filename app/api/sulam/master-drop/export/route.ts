import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.masterDataDropBibitSulam.findMany({
      orderBy: [{ tanggalDrop: 'desc' }, { id: 'desc' }],
    });

    const exportRows = data.map((d, idx) => ({
      'No.': idx + 1,
      'Lokasi': d.lokasi,
      'Wilayah': d.wilayah || '-',
      'Tanggal Drop': d.tanggalDrop ? d.tanggalDrop.toISOString().slice(0, 10) : '-',
      'Tanggal Order': d.tanggalOrder ? d.tanggalOrder.toISOString().slice(0, 10) : '-',
      'Hasil Ha': d.hasilHa ?? '-',
      'Hasil Btg': d.hasilBtg || 0,
      'Spek BB': d.spekBB || '-',
      'Std Rit': d.stdRit ?? '-',
      'Jumlah Rit': d.jumlahRit || 0,
      'Jenis Unit': d.jenisUnit || '-',
      'Status Drop': d.statusDrop || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Drop Bibit Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Master_Data_Drop_Bibit_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master drop sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data drop bibit sulam.' }, { status: 500 });
  }
}

