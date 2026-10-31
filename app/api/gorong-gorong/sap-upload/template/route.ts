import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring Schedule Gorong-Gorong PG1';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Form 630 SAP', {
      views: [{ state: 'frozen', ySplit: 1 }], // Freeze panes baris pertama
    });

    // 19 Kolom resmi standar Excel Form 630 SAP (Real Gorong2.XLSX)
    const columns = [
      { header: 'Lokasi', key: 'lokasi', width: 14 },
      { header: 'Wilayah', key: 'wilayah', width: 14 },
      { header: 'Plant/Cost Center', key: 'plantCostCenter', width: 18 },
      { header: 'Status tanaman', key: 'statusTanaman', width: 16 },
      { header: 'SPK ID', key: 'spkId', width: 18 },
      { header: 'PAS Document', key: 'pasDocument', width: 18 },
      { header: 'Tanggal Realisasi', key: 'tanggalRealisasi', width: 18 },
      { header: 'Deskripsi', key: 'deskripsi', width: 28 },
      { header: 'Deskripsi Bahan/Alat/Lainlain', key: 'deskripsiBahan', width: 42 },
      { header: 'Jenis Data', key: 'jenisData', width: 14 },
      { header: 'Kode Bahan/Alat/Lainlain', key: 'kodeBahan', width: 18 },
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

    // 1 Baris Contoh Data Riil (persis format Real Gorong2.XLSX)
    ws.addRow({
      lokasi: '048G2',
      wilayah: 'AP1',
      plantCostCenter: 'PSALPG1',
      statusTanaman: 'SLDA',
      spkId: 'SPK007978176',
      pasDocument: 'LKB001086070',
      tanggalRealisasi: '2026-01-02',
      deskripsi: 'Bantu pasang gorong2',
      deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
      jenisData: 'Material',
      kodeBahan: 'SSPA0204162',
      qty: 10,
      hasilEfektif: 0.4,
      totalBiaya: 4150000,
      penanggungJawab: 'Wilayah 4',
      time: '14:06:53',
      air: 0,
      jumlahAir: 0,
      referensiLokasi: '048G2',
    });

    // Style Header Baris 1: Background Biru Muda (#D9E1F2), Bold, Center Alignment & Border Halus
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }, // Soft Corporate Light Blue
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF1E293B' },
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

    // Style Baris Contoh Data: Alignment Rata Tengah & Border Halus
    const dataRow = ws.getRow(2);
    dataRow.height = 22;
    dataRow.eachCell((cell) => {
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF334155' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });

    // Aktifkan Filter Otomatis Range A1 s/d Kolom Terakhir
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 2, column: columns.length },
    };

    // Sesuaikan lebar kolom dengan isian sel agar pas dan tidak terlalu lebar
    ws.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value ? String(cell.value) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.min(Math.max(maxLen + 3, 11), 26);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="Template_Upload_Realisasi_SAP_Form630.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
