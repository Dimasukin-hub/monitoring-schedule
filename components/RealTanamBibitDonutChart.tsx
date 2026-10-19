'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Sprout, MapPin, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import MultiSelectDropdown from './MultiSelectDropdown';
import realTanamBibitDonutDefault from '@/lib/realTanamBibitDonut.json';

export interface ClassDetail {
  name: string;
  code: 'B' | 'S' | 'K' | 'M';
  luasHa: number;
  pct: number;
  locations?: LocationDetail[];
  locationsCount?: number;
}

export interface LocationDetail {
  lokasi: string;
  luasHa: number;
}

export interface BibitGroup {
  jenis: 'Crown' | 'Sucker';
  totalHa: number;
  pct: number;
  classes: {
    B: ClassDetail;
    S: ClassDetail;
    K: ClassDetail;
    M: ClassDetail;
  };
  locations?: LocationDetail[];
  locationsCount?: number;
}

export interface PeriodData {
  totalHa: number;
  crown: BibitGroup;
  sucker: BibitGroup;
}

export interface RealTanamBibitDonutDataset {
  [periodKey: string]: PeriodData;
}

export interface SliceData {
  id: string;
  jenis: 'Crown' | 'Sucker';
  classCode: 'B' | 'S' | 'K' | 'M';
  namaKelas: string;
  name: string;
  value: number;
  pct: number;
  color: string;
  gradientId: string;
  locations: LocationDetail[];
  locationsCount: number;
}

interface RealTanamBibitDonutChartProps {
  data?: RealTanamBibitDonutDataset;
}

const MONTH_KEY_MAP: Record<string, string> = {
  'Jan-26': '2026-01',
  'Feb-26': '2026-02',
  'Mar-26': '2026-03',
  'Apr-26': '2026-04',
  'Mei-26': '2026-05',
  'Jun-26': '2026-06',
  'Jul-26': '2026-07',
  'Agu-26': '2026-08',
  'Sep-26': '2026-09',
  'Okt-26': '2026-10',
};

const AVAILABLE_MONTH_OPTIONS = [
  'Jan-26',
  'Feb-26',
  'Mar-26',
  'Apr-26',
  'Mei-26',
  'Jun-26',
  'Jul-26',
  'Agu-26',
  'Sep-26',
  'Okt-26',
];

export default function RealTanamBibitDonutChart({
  data = realTanamBibitDonutDefault as RealTanamBibitDonutDataset,
}: RealTanamBibitDonutChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Filter tunggal: multi-select bulan tanam tahun 2026 (default: data Oktober aktif, tanpa centang di checkbox)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // State bibit yang disembunyikan (hidden): Set<'Crown' | 'Sucker'>
  const [hiddenBibit, setHiddenBibit] = useState<Set<'Crown' | 'Sucker'>>(new Set());
  const [hoveredSlice, setHoveredSlice] = useState<SliceData | null>(null);
  const [popupSide, setPopupSide] = useState<'left' | 'right'>('right');
  const [isInsidePopup, setIsInsidePopup] = useState(false);
  const [pinnedSliceId, setPinnedSliceId] = useState<string | null>(null);

  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleBibit = (jenis: 'Crown' | 'Sucker') => {
    setHiddenBibit((prev) => {
      const next = new Set(prev);
      if (next.has(jenis)) {
        next.delete(jenis);
      } else {
        next.add(jenis);
      }
      return next;
    });
  };

  const showCrown = !hiddenBibit.has('Crown');
  const showSucker = !hiddenBibit.has('Sucker');

  const handleSliceMouseEnter = (slice: SliceData, e: React.MouseEvent) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (!isInsidePopup && chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      setPopupSide(e.clientX >= midX ? 'right' : 'left');
    }
    setHoveredSlice(slice);
  };

  const handleSliceMouseMove = (slice: SliceData, e: React.MouseEvent) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (!isInsidePopup && chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      setPopupSide(e.clientX >= midX ? 'right' : 'left');
    }
  };

  const handleSliceMouseLeave = () => {
    if (pinnedSliceId) return;
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      if (!isInsidePopup) {
        setHoveredSlice(null);
      }
    }, 350);
  };

  const handlePopupMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsInsidePopup(true);
  };

  const handlePopupMouseLeave = () => {
    setIsInsidePopup(false);
    if (!pinnedSliceId) {
      setHoveredSlice(null);
    }
  };

  const handleSliceClick = (slice: SliceData) => {
    handleToggleBibit(slice.jenis);
    if (pinnedSliceId === slice.id) {
      setPinnedSliceId(null);
    } else {
      setPinnedSliceId(slice.id);
      setHoveredSlice(slice);
    }
  };

  // Agregasi dinamis berdasarkan bulan-bulan yang dipilih (default: Semua Bulan jika belum ada filter)
  const currentPeriodData: PeriodData = useMemo(() => {
    // Jika belum memilih filter bulan, default adalah akumulasi semua bulan ('all')
    if (selectedMonths.length === 0) {
      return data['all'] || data['2026-10'];
    }

    const activeKeys = selectedMonths
      .map((m) => MONTH_KEY_MAP[m])
      .filter(Boolean);

    if (activeKeys.length === 0) {
      return data['all'] || data['2026-10'];
    }

    if (activeKeys.length === 1 && data[activeKeys[0]]) {
      return data[activeKeys[0]];
    }

    // Agregasi beberapa bulan dengan rincian lokasi per kelas
    const mapBibit = (bKey: 'crown' | 'sucker') => {
      let totalHa = 0;
      const classTotals = { B: 0, S: 0, K: 0, M: 0 };
      const classLocMaps: Record<'B' | 'S' | 'K' | 'M', Record<string, number>> = {
        B: {},
        S: {},
        K: {},
        M: {},
      };

      activeKeys.forEach((k) => {
        const d = data[k];
        if (d && d[bKey]) {
          totalHa += d[bKey].totalHa || 0;
          (['B', 'S', 'K', 'M'] as const).forEach((code) => {
            const cData = d[bKey].classes?.[code];
            if (cData) {
              classTotals[code] += cData.luasHa || 0;
              (cData.locations || []).forEach((loc) => {
                classLocMaps[code][loc.lokasi] = (classLocMaps[code][loc.lokasi] || 0) + loc.luasHa;
              });
            }
          });
        }
      });

      const totHa = Number(totalHa.toFixed(2));
      const formattedClasses: Record<'B' | 'S' | 'K' | 'M', ClassDetail> = {
        B: {
          name: 'Besar',
          code: 'B',
          luasHa: Number(classTotals.B.toFixed(2)),
          pct: totHa > 0 ? Number(((classTotals.B / totHa) * 100).toFixed(1)) : 0,
          locations: Object.keys(classLocMaps.B)
            .map((loc) => ({ lokasi: loc, luasHa: Number(classLocMaps.B[loc].toFixed(2)) }))
            .sort((a, b) => b.luasHa - a.luasHa),
          locationsCount: Object.keys(classLocMaps.B).length,
        },
        S: {
          name: 'Sedang',
          code: 'S',
          luasHa: Number(classTotals.S.toFixed(2)),
          pct: totHa > 0 ? Number(((classTotals.S / totHa) * 100).toFixed(1)) : 0,
          locations: Object.keys(classLocMaps.S)
            .map((loc) => ({ lokasi: loc, luasHa: Number(classLocMaps.S[loc].toFixed(2)) }))
            .sort((a, b) => b.luasHa - a.luasHa),
          locationsCount: Object.keys(classLocMaps.S).length,
        },
        K: {
          name: 'Kecil',
          code: 'K',
          luasHa: Number(classTotals.K.toFixed(2)),
          pct: totHa > 0 ? Number(((classTotals.K / totHa) * 100).toFixed(1)) : 0,
          locations: Object.keys(classLocMaps.K)
            .map((loc) => ({ lokasi: loc, luasHa: Number(classLocMaps.K[loc].toFixed(2)) }))
            .sort((a, b) => b.luasHa - a.luasHa),
          locationsCount: Object.keys(classLocMaps.K).length,
        },
        M: {
          name: 'Extra Kecil',
          code: 'M',
          luasHa: Number(classTotals.M.toFixed(2)),
          pct: 0,
          locations: [],
          locationsCount: 0,
        },
      };

      return {
        jenis: (bKey === 'crown' ? 'Crown' : 'Sucker') as 'Crown' | 'Sucker',
        totalHa: totHa,
        classes: formattedClasses,
      };
    };

    const cr = mapBibit('crown');
    const sk = mapBibit('sucker');
    const grandTot = Number((cr.totalHa + sk.totalHa).toFixed(2));

    return {
      totalHa: grandTot,
      crown: {
        ...cr,
        pct: grandTot > 0 ? Number(((cr.totalHa / grandTot) * 100).toFixed(1)) : 0,
      },
      sucker: {
        ...sk,
        pct: grandTot > 0 ? Number(((sk.totalHa / grandTot) * 100).toFixed(1)) : 0,
      },
    };
  }, [data, selectedMonths]);

  const totalHa = currentPeriodData?.totalHa || 0;
  const crown = currentPeriodData?.crown;
  const sucker = currentPeriodData?.sucker;

  // Slices untuk Donut Chart: Dipecah per (Jenis Bibit + Kelas Bibit)
  const pieData = useMemo<SliceData[]>(() => {
    const rawSlices: SliceData[] = [];

    const addGroupSlices = (
      bg: typeof crown,
      jenis: 'Crown' | 'Sucker',
      colorMap: Record<'B' | 'S' | 'K' | 'M', string>
    ) => {
      if (!bg || !bg.classes) return;
      (['B', 'S', 'K', 'M'] as const).forEach((code) => {
        const cls = bg.classes[code];
        if (cls && cls.luasHa > 0) {
          rawSlices.push({
            id: `${jenis}_${code}`,
            jenis,
            classCode: code,
            namaKelas: cls.name,
            name: `Bibit ${jenis} - ${cls.name} (${code})`,
            value: cls.luasHa,
            pct: totalHa > 0 ? Number(((cls.luasHa / totalHa) * 100).toFixed(1)) : 0,
            color: colorMap[code],
            gradientId: `grad-donut-${jenis.toLowerCase()}-${code.toLowerCase()}`,
            locations: cls.locations || [],
            locationsCount: cls.locationsCount || (cls.locations || []).length,
          });
        }
      });
    };

    // Warna harmonis variasi amber untuk Crown
    addGroupSlices(crown, 'Crown', {
      B: '#D97706', // Amber 600 (Besar)
      S: '#F59E0B', // Amber 500 (Sedang)
      K: '#FBBF24', // Amber 400 (Kecil)
      M: '#FDE68A', // Amber 200 (Extra Kecil)
    });

    // Warna harmonis variasi cyan untuk Sucker
    addGroupSlices(sucker, 'Sucker', {
      B: '#0891B2', // Cyan 600 (Besar)
      S: '#06B6D4', // Cyan 500 (Sedang)
      K: '#22D3EE', // Cyan 400 (Kecil)
      M: '#A5F3FC', // Cyan 200 (Extra Kecil)
    });

    if (!showCrown && !showSucker) {
      return [];
    }
    if (!showCrown) {
      return rawSlices.filter((s) => s.jenis === 'Sucker');
    }
    if (!showSucker) {
      return rawSlices.filter((s) => s.jenis === 'Crown');
    }
    return rawSlices;
  }, [crown, sucker, totalHa, showCrown, showSucker]);

  const fmt = (val: number | null | undefined, minDec = 2, maxDec = 2) => {
    if (val === null || val === undefined) return '0,00';
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 glass-panel shadow-sm space-y-4">
      {/* 1. Header Card (Judul Bersih & Filter Periode Tunggal Neutral) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              Real Tanam Bibit
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedMonths.length === 0
                ? 'Semua Bulan (Realisasi Tanam Bibit)'
                : selectedMonths.length === 1
                ? `Bulan ${selectedMonths[0]} (Realisasi Tanam Bibit)`
                : `${selectedMonths.length} Bulan Terpilih (Realisasi Tanam Bibit)`}
            </span>
          </div>
        </div>

        {/* Filter Periode Tunggal: Tahun 2026 dengan pilihan bulan Jun-26 s/d Okt-26 (Bisa dicentang banyak) */}
        <div className="self-start sm:self-center">
          <MultiSelectDropdown
            label="Bulan"
            isMonthFilter
            neutralTrigger={true}
            hideHeaderNote={true}
            options={AVAILABLE_MONTH_OPTIONS}
            selected={selectedMonths}
            align="right"
            onChange={(val) => {
              setSelectedMonths(val);
            }}
          />
        </div>
      </div>

      {/* 2. Grafik Donut Real Tanam Bibit (Ditengah Tanpa Rincian Statis) & Pop Up Melayang di Kiri / Kanan */}
      <div
        ref={chartContainerRef}
        className="w-full h-[310px] relative flex items-center justify-center select-none"
        onMouseLeave={handleSliceMouseLeave}
      >
        {/* Donut Chart Berada Bersih di Tengah */}
        <div className="w-[280px] h-[280px] relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {/* Gradasi Crown Classes (Amber Spectrum) */}
                <linearGradient id="grad-donut-crown-b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="grad-donut-crown-s" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="grad-donut-crown-k" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="grad-donut-crown-m" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>

                {/* Gradasi Sucker Classes (Cyan/Teal Spectrum) */}
                <linearGradient id="grad-donut-sucker-b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0e7490" />
                </linearGradient>
                <linearGradient id="grad-donut-sucker-s" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
                <linearGradient id="grad-donut-sucker-k" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="grad-donut-sucker-m" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#cffafe" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={106}
                paddingAngle={pieData.length > 1 ? 3 : 0}
                dataKey="value"
                cursor="pointer"
                onMouseEnter={(entry, _idx, e) => handleSliceMouseEnter(entry as unknown as SliceData, e)}
                onMouseMove={(entry, _idx, e) => handleSliceMouseMove(entry as unknown as SliceData, e)}
                onClick={(entry) => handleSliceClick(entry as unknown as SliceData)}
              >
                {pieData.map((entry) => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={`url(#${entry.gradientId})`}
                    stroke={pinnedSliceId === entry.id ? '#ffffff' : isDark ? '#0f172a' : '#ffffff'}
                    strokeWidth={pinnedSliceId === entry.id ? 2 : 1}
                    className="cursor-pointer transition-opacity duration-150 hover:opacity-90"
                    onMouseEnter={(e) => handleSliceMouseEnter(entry, e)}
                    onMouseMove={(e) => handleSliceMouseMove(entry, e)}
                    onClick={() => handleSliceClick(entry)}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Label Tengah Donut - DIKECILKAN & DISESUAIKAN AGAR MUAT PAS DI TENGAH LINGKARAN */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 select-none">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
              {showCrown && !showSucker
                ? 'Bibit Crown'
                : !showCrown && showSucker
                ? 'Bibit Sucker'
                : 'Total Real Tanam'}
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 my-0.5 leading-tight">
              {fmt(
                showCrown && !showSucker
                  ? crown?.totalHa
                  : !showCrown && showSucker
                  ? sucker?.totalHa
                  : showCrown && showSucker
                  ? totalHa
                  : 0
              )}
            </span>
            <span className="text-[8px] font-semibold text-slate-500 leading-tight">Hektar (Ha)</span>
          </div>
        </div>

        {/* Pop Up Detail Melayang di Samping (Kiri atau Kanan, Tidak Menumpuk di Tengah, Bisa Di-scroll) */}
        {hoveredSlice && (
          <div
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
            onMouseMove={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            style={{
              boxShadow: isDark
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
            className={`absolute z-30 w-[275px] sm:w-[290px] max-h-[260px] flex flex-col justify-between p-3.5 rounded-2xl border text-xs pointer-events-auto select-text shadow-2xl transition-all duration-200 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-300 text-slate-800'
            } ${
              popupSide === 'left'
                ? 'left-2 sm:left-3 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-right-2'
                : 'right-2 sm:right-3 top-1/2 -translate-y-1/2 animate-in fade-in slide-in-from-left-2'
            }`}
          >
            <div className="flex flex-col h-full justify-between space-y-2.5">
              {/* Header Pop Up Spesifik Slice (Diberi Jarak Lega Antara Judul dan Angka Ha/Persentase) */}
              <div
                className={`flex items-start justify-between gap-3 pb-2 border-b ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: hoveredSlice.color }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                      Bibit {hoveredSlice.jenis}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      Kelas {hoveredSlice.namaKelas} ({hoveredSlice.classCode})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`font-mono font-bold text-xs ${
                      hoveredSlice.jenis === 'Crown'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-cyan-600 dark:text-cyan-400'
                    }`}
                  >
                    {fmt(hoveredSlice.value)} Ha <span className="font-sans font-semibold">({hoveredSlice.pct}%)</span>
                  </span>
                  {pinnedSliceId === hoveredSlice.id && (
                    <button
                      type="button"
                      onClick={() => setPinnedSliceId(null)}
                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
                      title="Tutup pin"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Rincian Lokasi Tanam dengan Grid 2 Kolom Sejajar Rapi */}
              <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Lokasi Tanam ({hoveredSlice.locationsCount}):</span>
                </div>
                {hoveredSlice.locations && hoveredSlice.locations.length > 0 ? (
                  <div
                    onWheel={(e) => e.stopPropagation()}
                    className="max-h-[140px] overflow-y-auto grid grid-cols-2 gap-1.5 pr-1 custom-scrollbar content-start pointer-events-auto"
                  >
                    {hoveredSlice.locations.map((loc) => (
                      <div
                        key={loc.lokasi}
                        className={`flex items-center justify-between px-2 py-1 rounded border text-[10px] font-mono ${
                          isDark
                            ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {loc.lokasi}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-[9.5px]">
                          {fmt(loc.luasHa)} Ha
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic py-3 text-center">
                    Belum ada data lokasi
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

        {/* 3. Legenda Interaktif di Bawah Donut Chart - Semua tombol selalu tampil. Yang diklik akan ter-hide dari grafik, yang lain tetap muncul */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 min-h-[44px]">
          {/* Tombol Legenda Bibit Crown */}
          <button
            type="button"
            onClick={() => handleToggleBibit('Crown')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
              hiddenBibit.has('Crown')
                ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 ring-1 ring-amber-500/20'
            }`}
            title={
              hiddenBibit.has('Crown')
                ? 'Klik untuk menampilkan Bibit Crown'
                : 'Klik untuk menyembunyikan Bibit Crown'
            }
          >
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                hiddenBibit.has('Crown') ? 'bg-slate-400 dark:bg-slate-500' : 'bg-[#F59E0B]'
              }`}
            />
            <span>Bibit Crown</span>
          </button>

          {/* Tombol Legenda Bibit Sucker */}
          <button
            type="button"
            onClick={() => handleToggleBibit('Sucker')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
              hiddenBibit.has('Sucker')
                ? 'opacity-40 grayscale hover:opacity-75 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/20 ring-1 ring-cyan-500/20'
            }`}
            title={
              hiddenBibit.has('Sucker')
                ? 'Klik untuk menampilkan Bibit Sucker'
                : 'Klik untuk menyembunyikan Bibit Sucker'
            }
          >
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                hiddenBibit.has('Sucker') ? 'bg-slate-400 dark:bg-slate-500' : 'bg-[#06B6D4]'
              }`}
            />
            <span>Bibit Sucker</span>
          </button>
        </div>
      </div>
  );
}
