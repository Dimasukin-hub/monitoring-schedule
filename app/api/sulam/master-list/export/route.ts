import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawData = await prisma.listSulam.findMany({
      orderBy: [{ lokasi: 'asc' }],
    });

    const today = new Date();
    const exportRows = rawData.map((d, idx) => {
      let umurForcing = d.umurForcing;
      if (d.tglFMax) {
        const diffMs = today.getTime() - new Date(d.tglFMax).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        umurForcing = Math.round(diffDays / 30.4);
      }

      return {
        'No.': idx + 1,
        'Wilayah': d.wilayah || '-',
        'Lokasi': d.lokasi,
        'Jenis BB': d.jenisBB || '-',
        'Kelas BB': d.kelasBB || '-',
        'Spek BB': d.spekBB || '-',
        'Tgl Rawat': d.tglRawat ? d.tglRawat.toISOString().slice(0, 10) : '-',
        'Tgl Std Forcing': d.tglStdForcing ? d.tglStdForcing.toISOString().slice(0, 10) : '-',
        'Tgl F Prod': d.tglFProd ? d.tglFProd.toISOString().slice(0, 10) : '-',
        'Tgl F Max': d.tglFMax ? d.tglFMax.toISOString().slice(0, 10) : '-',
        'Tgl Order': d.tglOrder ? d.tglOrder.toISOString().slice(0, 10) : '-',
        'Umur Forcing (Bulan)': umurForcing !== null && umurForcing !== undefined ? umurForcing : '-',
        'Permintaan Batang': d.permintaanRitaseBtg || 0,
        'Permintaan Rit': d.permintaanRitaseRit || 0,
        'Keterangan': d.keterangan || '-',
        'Status': d.status || 'Open',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'List Prioritas Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `List_Prioritas_Sulam_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting list sulam:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data list sulam.' }, { status: 500 });
  }
}

