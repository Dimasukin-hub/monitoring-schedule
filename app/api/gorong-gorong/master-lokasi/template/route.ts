import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PT GGP - PG1 Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Status Lokasi', {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Lokasi', key: 'lokasi', width: 12 },
      { header: 'Wilayah', key: 'strucPlant', width: 12 },
      { header: 'Status Lengkap', key: 'statusLengkap', width: 16 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Luas Bruto', key: 'luasBruto', width: 12 },
      { header: 'Luas Aktif', key: 'luasAktif', width: 12 },
      { header: 'Luas Netto', key: 'luasNetto', width: 12 },
      { header: 'Bibit', key: 'bibit', width: 14 },
      { header: 'Kelas', key: 'kelas', width: 8 },
      { header: 'Jenis', key: 'jenis', width: 8 },
      { header: 'Perubahan Sts', key: 'perubahanSts', width: 14 },
      { header: 'Tgl Rawat', key: 'tglRawat', width: 14 },
      { header: 'Umur Bln', key: 'umurBulan', width: 10 },
      { header: 'Forcing Std', key: 'forcingStd', width: 14 },
      { header: 'Forcing Prod 2026', key: 'forcingProd2026', width: 16 },
      { header: 'Forcing 2027', key: 'forcing2027', width: 14 },
      { header: 'Ket. Forcing', key: 'ketForcing2027', width: 12 },
      { header: 'Fix Forcing', key: 'fixForcing', width: 14 },
      { header: 'Umur F Std', key: 'umurFStd', width: 12 },
      { header: 'Umur F Prod', key: 'umurFProd', width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00873D' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'medium', color: { argb: 'FF005522' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Master_Status_Lokasi.xlsx"',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating template master lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat template Master Status Lokasi: ' + error.message },
      { status: 500 }
    );
  }
}

