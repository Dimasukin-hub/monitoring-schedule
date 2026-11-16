import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.masterDataOrderSulam.findMany({
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });

    const exportRows = data.map((d, idx) => ({
      'No.': idx + 1,
      'Lokasi': d.lokasi,
      'Wilayah': d.wilayah || '-',
      'Tanggal Order': d.tanggal ? d.tanggal.toISOString().slice(0, 10) : '-',
      'Spek BB': d.spekBB || '-',
      'Jumlah Batang': d.jumlahBtg || 0,
      'Jumlah Rit': d.jumlahRit || 0,
      'Keterangan': d.keterangan || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Data Order Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Master_Data_Order_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting master order sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data master order sulam.' }, { status: 500 });
  }
}

