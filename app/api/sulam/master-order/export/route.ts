import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.masterDataOrderSulam.findMany({
      orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
    });

    const exportRows = data.map((d, idx) => ({
      'No.': idx + 1,
      'Lokasi': d.lokasi,
      'Wilayah': d.wilayah || '-',
      'Tanggal Order': d.tanggalOrder ? d.tanggalOrder.toISOString().slice(0, 10) : '-',
      'Jumlah': d.jumlah ?? 0,
      'Rit': d.rit ?? 0,
      'Real Rit': d.realRit ?? 0,
      'Spek Bibit': d.spekBibit || '-',
      'Manual': d.manual ?? 0,
      'Keterangan Proses': d.keteranganProses || '-',
      'Keterangan Mati': d.keteranganMati || '-',
      'Keterangan Ritase': d.keteranganRitase || '-',
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
