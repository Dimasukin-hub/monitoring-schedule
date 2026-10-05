import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. DATA GRAFIK 1 (KANAN): RERATA BERO / BULAN (Oct-25 s/d Mar-27) - Satuan: Hari Bero
    // Dikembalikan seperti semula 18 bulan penuh dari Oct-25 sampai Mar-27
    const beroChartData = [
      // 2025 (3 bulan)
      { periodKey: 'Oct-25', year: 2025, monthNum: 10, label: 'Oct-25', rfc: 57, rencana: 57, realisasi: 57, deviasi: 0 },
      { periodKey: 'Nov-25', year: 2025, monthNum: 11, label: 'Nov-25', rfc: 56, rencana: 57, realisasi: 56, deviasi: -1 },
      { periodKey: 'Dec-25', year: 2025, monthNum: 12, label: 'Dec-25', rfc: 69, rencana: 69, realisasi: 69, deviasi: 0 },
      // 2026 (12 bulan)
      { periodKey: 'Jan-26', year: 2026, monthNum: 1, label: 'Jan-26', rfc: 87, rencana: 87, realisasi: 87, deviasi: 0 },
      { periodKey: 'Feb-26', year: 2026, monthNum: 2, label: 'Feb-26', rfc: 101, rencana: 112, realisasi: 101, deviasi: -11 },
      { periodKey: 'Mar-26', year: 2026, monthNum: 3, label: 'Mar-26', rfc: 94, rencana: 111, realisasi: 94, deviasi: -18 },
      { periodKey: 'Apr-26', year: 2026, monthNum: 4, label: 'Apr-26', rfc: 107, rencana: 114, realisasi: 107, deviasi: -6 },
      { periodKey: 'May-26', year: 2026, monthNum: 5, label: 'May-26', rfc: 131, rencana: 164, realisasi: 131, deviasi: -32 },
      { periodKey: 'Jun-26', year: 2026, monthNum: 6, label: 'Jun-26', rfc: 146, rencana: 155, realisasi: 146, deviasi: -9 },
      { periodKey: 'Jul-26', year: 2026, monthNum: 7, label: 'Jul-26', rfc: 143, rencana: 124, realisasi: 143, deviasi: 19 },
      { periodKey: 'Aug-26', year: 2026, monthNum: 8, label: 'Aug-26', rfc: 121, rencana: 126, realisasi: 121, deviasi: -5 },
      { periodKey: 'Sep-26', year: 2026, monthNum: 9, label: 'Sep-26', rfc: 62, rencana: 65, realisasi: 62, deviasi: -3, isCurrentMonth: true },
      { periodKey: 'Oct-26', year: 2026, monthNum: 10, label: 'Oct-26', rfc: 61, rencana: 61, realisasi: null, deviasi: null },
      { periodKey: 'Nov-26', year: 2026, monthNum: 11, label: 'Nov-26', rfc: 69, rencana: 69, realisasi: null, deviasi: null },
      { periodKey: 'Dec-26', year: 2026, monthNum: 12, label: 'Dec-26', rfc: 78, rencana: 78, realisasi: null, deviasi: null },
      // 2027 (3 bulan)
      { periodKey: 'Jan-27', year: 2027, monthNum: 1, label: 'Jan-27', rfc: 75, rencana: 75, realisasi: null, deviasi: null },
      { periodKey: 'Feb-27', year: 2027, monthNum: 2, label: 'Feb-27', rfc: 74, rencana: 75, realisasi: null, deviasi: null },
      { periodKey: 'Mar-27', year: 2027, monthNum: 3, label: 'Mar-27', rfc: 76, rencana: 73, realisasi: null, deviasi: null },
    ];

    // 2. DATA GRAFIK 2 (KIRI): TANAM / BULAN (Jan-26 s/d Des-26) - Satuan: Hektar (Ha)
    // Sesuai data Target & Real dari gambar PRD Schedule 2026 Update 09:
    const tanamChartData = [
      { periodKey: 'Jan-26', year: 2026, monthNum: 1, label: 'Jan-26', target: 110, real: 105.39, deviasi: Number((105.39 - 110).toFixed(2)) },
      { periodKey: 'Feb-26', year: 2026, monthNum: 2, label: 'Feb-26', target: 70, real: 33.74, deviasi: Number((33.74 - 70).toFixed(2)) },
      { periodKey: 'Mar-26', year: 2026, monthNum: 3, label: 'Mar-26', target: 80, real: 92.26, deviasi: Number((92.26 - 80).toFixed(2)) },
      { periodKey: 'Apr-26', year: 2026, monthNum: 4, label: 'Apr-26', target: 140, real: 91.23, deviasi: Number((91.23 - 140).toFixed(2)) },
      { periodKey: 'May-26', year: 2026, monthNum: 5, label: 'May-26', target: 150, real: 120.90, deviasi: Number((120.90 - 150).toFixed(2)) },
      { periodKey: 'Jun-26', year: 2026, monthNum: 6, label: 'Jun-26', target: 150, real: 170.35, deviasi: Number((170.35 - 150).toFixed(2)) },
      { periodKey: 'Jul-26', year: 2026, monthNum: 7, label: 'Jul-26', target: 150, real: 175.22, deviasi: Number((175.22 - 150).toFixed(2)) },
      { periodKey: 'Aug-26', year: 2026, monthNum: 8, label: 'Aug-26', target: 141, real: 140.20, deviasi: Number((140.20 - 141).toFixed(2)) },
      { periodKey: 'Sep-26', year: 2026, monthNum: 9, label: 'Sep-26', target: 120, real: 77.40, deviasi: Number((77.40 - 120).toFixed(2)) },
      { periodKey: 'Oct-26', year: 2026, monthNum: 10, label: 'Oct-26', target: 130, real: null, deviasi: null },
      { periodKey: 'Nov-26', year: 2026, monthNum: 11, label: 'Nov-26', target: 120, real: null, deviasi: null },
      { periodKey: 'Dec-26', year: 2026, monthNum: 12, label: 'Dec-26', target: 101, real: null, deviasi: null },
    ];

    const periods2025 = beroChartData.filter((d) => d.year === 2025);
    const periods2026 = beroChartData.filter((d) => d.year === 2026);
    const periods2027 = beroChartData.filter((d) => d.year === 2027);

    return NextResponse.json({
      success: true,
      data: {
        title: 'Rerata Bero Lokasi SN & Monitoring Tanam',
        subtitle: 'Grafik Monitoring Tanam Bulanan dan Rerata Hari Bero Lokasi SN',
        beroChartData,
        tanamChartData,
        chartData: beroChartData,
        periods2025,
        periods2026,
        periods2027,
        summaryKPI: {
          rfc2026: 100,
          rencana2026: 106,
          realisasi2026: 110,
          deviasi2026: -65,
          latestMonth: 'Sep-26',
          latestRfc: 62,
          latestRenc: 65,
          latestReal: 62,
          latestDev: -3,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/bero:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
