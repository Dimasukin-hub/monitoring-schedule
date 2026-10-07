/**
 * Klasifikasi Stok Lahan 2026 sesuai data Excel Monitoring Schedule:
 * 1. BK (Bongkar): Chopper s.d. Rotary Plough (termasuk lahan belum dimulai / '-')
 * 2. BJK (Bajak): Kolom Bajak Awal (dimulai dari MB 5 BTR) s.d. Ridger
 * 3. SN (Siap Tanam): Jalan & Saluran dan Siap Tanam
 * 4. PROSES (Proses Tanam): Kolom 23. Proses Tnm
 * 5. SELESAI (Selesai Tanam): Kolom 24. Sls Tanam
 */

export type StokCategory = 'BK' | 'BJK' | 'SN' | 'PROSES' | 'SELESAI';

export interface LandLike {
  aplikasiTerakhir?: string | null;
  statusAplikasi?: string | null;
  realMulaiTanam?: string | null;
  realSelesaiTanam?: string | null;
  progressTanam?: number | null;
  activities?: Array<{ code?: string | null; realisasiDate?: string | null }>;
}

export function getLandStokCategory(land: LandLike): StokCategory {
  const app = (land.aplikasiTerakhir || land.statusAplikasi || '').trim();
  const appLower = app.toLowerCase();

  // 1. Selesai Tanam: 100% progress, atau real selesai tanam terisi, atau aktivitas 24.SLS_TANAM terealisasi
  if (
    land.progressTanam === 100 ||
    (land.realSelesaiTanam && land.realSelesaiTanam !== '-' && land.realSelesaiTanam !== '0') ||
    (app.includes('24.Sls Tanam') && (land.progressTanam ?? 0) >= 50) ||
    land.activities?.some(
      (a) => a.code === '24.SLS_TANAM' && a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0'
    )
  ) {
    return 'SELESAI';
  }

  // 2. Proses Tanam: 50% progress, atau realisasi mulai tanam tanpa selesai tanam, atau kolom 23. Proses Tnm
  if (
    land.progressTanam === 50 ||
    (land.realMulaiTanam && !land.realSelesaiTanam) ||
    app.includes('23.Proses Tnm') ||
    appLower.includes('proses tnm') ||
    appLower.includes('proses tanam') ||
    appLower.includes('mulai tnm') ||
    land.activities?.some(
      (a) => a.code === '23.PROSES_TNM' && a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0'
    )
  ) {
    return 'PROSES';
  }

  // 3. SN: diambil datanya dari jalan & sal dan siap tanam
  if (
    app.includes('22.Siap Tanam') ||
    appLower.includes('siap tanam') ||
    app.includes('22.JALAN & SAL') ||
    appLower.includes('jalan & sal') ||
    appLower.includes('jalan dan sal') ||
    land.activities?.some(
      (a) =>
        (a.code === '22.SIAP_TANAM' || a.code === '22.JALAN_SAL') &&
        a.realisasiDate &&
        a.realisasiDate !== '-' &&
        a.realisasiDate !== '0'
    )
  ) {
    return 'SN';
  }

  // 4. BJK: diambil datanya dari kolom bajak awal yang dimulai dari mb 5 btr s.d. ridger
  // Kolom di Excel: Bajak Awal (MB 5 BTR, MB 2.5, Howard, Nardi, HR EKS MB, Exca Std, Tutup Parit, Gypsum, FreeLand, Bedder, FH Harrow),
  // Subsoiler (SS1, SS2), Finishing Harrow (FHK Rent), Finishing Rotary (Rotary FH1, Rotary FH2), Ridger.
  // Catatan: 'Rotary Plough' BUKAN BJK, melainkan BK (Chopper s.d. Rotary Plough).
  const isRotaryPlough = appLower.includes('rotary plough');
  const bjkKeywords = [
    'mb 5 btr',
    'mb 2.5',
    'mb 5btr',
    'howard',
    'nardi',
    'hr eks mb',
    'exca',
    'tutup parit',
    'gypsum',
    'freeland',
    'bedder',
    'fh harrow',
    'ss1',
    'ss2',
    'subsoiler',
    'fhk rent',
    'rotary fh1',
    'rotary fh2',
    'finishing',
    'ridger',
    'bajak',
  ];

  const hasBjkActivity = land.activities?.some((a) => {
    const code = a.code || '';
    const isBjkCode = [
      '11.BAJAK_AWAL',
      '17.SUBSOILER',
      '18.FINISHING_HARROW',
      '19.FINISHING_ROTARY',
      '20.ROTARY_FH2',
      '21.RIDGER',
    ].includes(code);
    return isBjkCode && a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0';
  });

  if (!isRotaryPlough && (bjkKeywords.some((kw) => appLower.includes(kw)) || hasBjkActivity)) {
    return 'BJK';
  }

  // 5. BK: diambil dari chopper s.d. rotary plough (serta lahan yang belum ada aktivitas / '-')
  // Termasuk: Chopper, Chopper Lu, RH1, Cutting Banana, Aplikasi Dolomit, DP1, DP Cross, DP 2, Belerang, Kompos, Rotary Plough, dan '-'
  return 'BK';
}
