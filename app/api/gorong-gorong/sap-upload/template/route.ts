import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring Schedule Gorong-Gorong PG1';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Form 630 SAP', {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }], // Freeze panes baris pertama
    });

    // 18 Kolom resmi standar Excel Form 630 SAP (Real Gorong2) sesuai urutan pengguna
    const columns = [
      { header: 'Wilayah', key: 'wilayah', width: 14 },
      { header: 'Lokasi', key: 'lokasi', width: 14 },
      { header: 'Status tanaman', key: 'statusTanaman', width: 16 },
      { header: 'SPK ID', key: 'spkId', width: 18 },
      { header: 'PAS Document', key: 'pasDocument', width: 18 },
      { header: 'Tanggal Realisasi', key: 'tanggalRealisasi', width: 18 },
      { header: 'Deskripsi', key: 'deskripsi', width: 28 },
      { header: 'Deskripsi Bahan/Alat/Lainlain', key: 'deskripsiBahan', width: 42 },
      { header: 'Jenis Data', key: 'jenisData', width: 14 },
      { header: 'Kode Bahan/Alat/Lainlain', key: 'kodeBahan', width: 20 },
      { header: 'Resource Bahan/Alat', key: 'qty', width: 20 },
      { header: 'Hasil Efektif', key: 'hasilEfektif', width: 15 },
      { header: 'Total Realisasi Biaya', key: 'totalBiaya', width: 22 },
      { header: 'Penanggung Jawab', key: 'penanggungJawab', width: 20 },
      { header: 'Time', key: 'time', width: 14 },
      { header: 'Air', key: 'air', width: 10 },
      { header: 'Jumlah Air', key: 'jumlahAir', width: 14 },
      { header: 'Referensi Lokasi', key: 'referensiLokasi', width: 18 },
    ];

    ws.columns = columns;

    // Header Styling: Biru Elegan SAP Form 630
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }, // Biru Elegan SAP Form 630
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
        left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      };
    });

    // Aktifkan Filter Otomatis Range A1 s/d Kolom Terakhir
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="Template_Upload_Realisasi_SAP_Form630.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating template SAP:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat template Excel SAP', error: error.message },
      { status: 500 }
    );
  }
}
