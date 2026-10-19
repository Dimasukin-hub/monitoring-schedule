'use client';

import React, { useState, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Rectangle,
} from 'recharts';
import { BarChart3, MapPin, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import sebaranBibitBulanDefault from '@/lib/sebaranBibitBulan.json';

export interface LocationDetail {
  lokasi: string;
  luasHa: number;
  bibit?: string;
}

export interface MonthClassDetail {
  luasHa: number;
  pct: number;
  locations: { lokasi: string; luasHa: number }[];
  locationsCount: number;
}

export interface MonthSeedItem {
  monthKey: string;
  monthLabel: string;
  monthName: string;
  totalHa: number;
  crownTotal: number;
  suckerTotal: number;
  crown_B: number;
  crown_S: number;
  crown_K: number;
  crown_M: number;
  sucker_B: number;
  sucker_S: number;
  sucker_K: number;
  sucker_M: number;
  classes?: {
    crown_B: MonthClassDetail;
    crown_S: MonthClassDetail;
    crown_K: MonthClassDetail;
    crown_M: MonthClassDetail;
    sucker_B: MonthClassDetail;
    sucker_S: MonthClassDetail;
    sucker_K: MonthClassDetail;
    sucker_M: MonthClassDetail;
  };
  locations?: LocationDetail[];
  locationsCount?: number;
}

interface SebaranBibitBulanChartProps {
  data?: MonthSeedItem[];
}

export default function SebaranBibitBulanChart({
  data = sebaranBibitBulanDefault as MonthSeedItem[],
}: SebaranBibitBulanChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State bibit yang disembunyikan (hidden): Set<'Crown' | 'Sucker'>
  const [hiddenBibit, setHiddenBibit] = useState<Set<'Crown' | 'Sucker'>>(new Set());
  const [hoveredMonth, setHoveredMonth] = useState<MonthSeedItem | null>(null);
  const [isInsidePopup, setIsInsidePopup] = useState(false);
  const [pinnedMonth, setPinnedMonth] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; align: 'left' | 'right' } | null>(null);

  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeMonthData = pinnedMonth
    ? data.find((d) => d.monthName === pinnedMonth) || hoveredMonth
    : hoveredMonth;

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

  const handleChartMouseMove = (state: any) => {
    if (isInsidePopup || pinnedMonth || (!showCrown && !showSucker)) return;

    if (state && state.activePayload && state.activePayload.length > 0) {
      const item = state.activePayload[0].payload as MonthSeedItem;
      const coordX = state.activeCoordinate?.x ?? 200;
      const monthIdx = data.findIndex((d) => d.monthKey === item.monthKey);
      const align = monthIdx >= 6 ? 'right' : 'left';

      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }

      if (hoveredMonth?.monthKey === item.monthKey) {
        return;
      }

      // Debounce pergantian 160ms agar kursor yang bergerak menuju pop up tidak memicu bar bulan di sebelahnya
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = setTimeout(() => {
        if (!isInsidePopup && !pinnedMonth) {
          setHoveredMonth(item);
          setPopupPos({ x: coordX, align });
        }
      }, 160);
    }
  };

  const handleChartMouseLeave = () => {
    if (pinnedMonth) return;
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      if (!isInsidePopup) {
        setHoveredMonth(null);
      }
    }, 350);
  };

  const handlePopupMouseEnter = () => {
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    setIsInsidePopup(true);
  };

  const handlePopupMouseLeave = () => {
    setIsInsidePopup(false);
    if (!pinnedMonth) {
      setHoveredMonth(null);
    }
  };

  const handleBarClick = (item: MonthSeedItem) => {
    if (!showCrown && !showSucker) return;
    if (pinnedMonth === item.monthName) {
      setPinnedMonth(null);
    } else {
      setPinnedMonth(item.monthName);
      setHoveredMonth(item);
    }
  };

  const fmt = (val: number | null | undefined, minDec = 2, maxDec = 2) => {
    if (val === null || val === undefined) return '0,00';
    return val.toLocaleString('id-ID', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    });
  };

  // Helper render shape adaptif:
  // - Jika batang berada di puncak teratas tiang -> sudut atas membulat [6, 6, 0, 0]
  // - Jika batang berada di bagian bawah/tengah (ada data lain di atasnya) -> flat rata [0, 0, 0, 0] agar menyatu mulus tanpa celah
  const renderCustomBar = (props: any) => {
    if (!props.height || props.height <= 0) return null;
    const isCrown = props.dataKey === 'crownTotal';
    const isSucker = props.dataKey === 'suckerTotal';
    if (isCrown && !showCrown) return null;
    if (isSucker && !showSucker) return null;

    const totalVal =
      (!showCrown ? 0 : props.payload?.crownTotal || 0) +
      (!showSucker ? 0 : props.payload?.suckerTotal || 0);

    let isTop = true;
    if (Array.isArray(props.value)) {
      const [_startVal, endVal] = props.value;
      isTop = endVal >= totalVal - 0.001;
    }

    const radius = isTop ? [6, 6, 0, 0] : [0, 0, 0, 0];
    return <Rectangle {...props} radius={radius} />;
  };

  return (
    <div className="relative overflow-visible rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 glass-panel shadow-sm flex flex-col justify-between h-full space-y-4">
      {/* 1. Header Card (Judul Bersih Sejajar dengan Real Tanam Bibit) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Sebaran Bibit / Bulan
          </h3>
        </div>
      </div>

      {/* 2. Grafik Batang Bertumpuk (Stacked Bar) Sebaran Bibit per Bulan */}
      <div
        className="w-full h-[310px] relative pt-1 select-none"
        onMouseLeave={handleChartMouseLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 15, left: -10, bottom: 5 }}
            className="outline-none focus:outline-none"
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
          >
            <defs>
              <linearGradient id="grad-sebaran-crown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0.95} />
              </linearGradient>
              <linearGradient id="grad-sebaran-sucker" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                <stop offset="100%" stopColor="#0891b2" stopOpacity={0.95} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? '#334155' : '#e2e8f0'}
            />
            <XAxis
              dataKey="monthLabel"
              stroke={isDark ? '#94a3b8' : '#64748b'}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
              tickLine={false}
              includeHidden={true}
            />
            <YAxis
              stroke={isDark ? '#94a3b8' : '#64748b'}
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
              unit=" Ha"
              domain={[0, !showCrown && !showSucker ? 180 : 'auto']}
              axisLine={{ stroke: isDark ? '#475569' : '#cbd5e1' }}
              tickLine={false}
              includeHidden={true}
            />

            {/* Hover shading cursor saja, pop up aktual dirender mandiri agar stabil tidak melompat */}
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              content={() => null}
            />

            {/* Saat kedua seri ter-hide, render dummy bar transparan tanpa shape agar CartesianGrid dan angka sumbu vertikal tetap ada */}
            {!showCrown && !showSucker && (
              <Bar
                dataKey="crownTotal"
                fill="transparent"
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
                className="pointer-events-none opacity-0 select-none"
                shape={() => null}
              />
            )}

            {/* Stacked Bars: Bibit Crown & Bibit Sucker (Bisa diklik langsung pada grafik untuk menyembunyikan yang diklik) */}
            {showCrown && (
              <Bar
                dataKey="crownTotal"
                name="Bibit Crown"
                stackId={showSucker ? 'seed' : undefined}
                fill="url(#grad-sebaran-crown)"
                shape={renderCustomBar}
                cursor="pointer"
                className="cursor-pointer transition-opacity duration-150 hover:opacity-90"
                onClick={() => handleToggleBibit('Crown')}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`cell-crown-${entry.monthKey}`}
                    cursor="pointer"
                    onMouseEnter={() => {
                      if (!isInsidePopup && !pinnedMonth) {
                        setHoveredMonth(entry);
                        setPopupPos({ x: 0, align: idx >= 6 ? 'right' : 'left' });
                      }
                    }}
                    onClick={(e) => {
                      e?.stopPropagation?.();
                      handleToggleBibit('Crown');
                    }}
                  />
                ))}
              </Bar>
            )}

            {showSucker && (
              <Bar
                dataKey="suckerTotal"
                name="Bibit Sucker"
                stackId={showCrown ? 'seed' : undefined}
                fill="url(#grad-sebaran-sucker)"
                shape={renderCustomBar}
                cursor="pointer"
                className="cursor-pointer transition-opacity duration-150 hover:opacity-90"
                onClick={() => handleToggleBibit('Sucker')}
              >
                {data.map((entry, idx) => (
                  <Cell
                    key={`cell-sucker-${entry.monthKey}`}
                    cursor="pointer"
                    onMouseEnter={() => {
                      if (!isInsidePopup && !pinnedMonth) {
                        setHoveredMonth(entry);
                        setPopupPos({ x: 0, align: idx >= 6 ? 'right' : 'left' });
                      }
                    }}
                    onClick={(e) => {
                      e?.stopPropagation?.();
                      handleToggleBibit('Sucker');
                    }}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>

        {/* Pop Up Detail Sebaran Bibit per Bulan (Terkunci & Tidak Berpindah Saat Mau Di-scroll, Solid Sesuai Tema) */}
        {activeMonthData && (showCrown || showSucker) && (
          <div
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
            onMouseMove={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              opacity: 1,
              boxShadow: isDark
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              top: '8px',
              left: popupPos?.align === 'right' ? 'auto' : `${Math.max(16, (popupPos?.x ?? 200) - 100)}px`,
              right: popupPos?.align === 'right' ? '16px' : 'auto',
            }}
            className={`absolute z-30 rounded-2xl p-4 border text-xs min-w-[320px] max-w-[360px] space-y-3 pointer-events-auto select-text shadow-2xl transition-opacity duration-150 ${
              isDark
                ? 'border-slate-700 text-white bg-slate-900'
                : 'border-slate-300 text-slate-800 bg-white'
            }`}
          >
            {/* Header Bulan & Total Luas */}
            <div
              className={`flex items-center justify-between pb-2 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col">
                <span
                  className={`font-extrabold text-sm ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}
                >
                  {activeMonthData.monthName}
                </span>
                <span className="text-[10px] text-slate-400">
                  {showCrown && !showSucker
                    ? 'Realisasi Bibit Crown'
                    : !showCrown && showSucker
                    ? 'Realisasi Bibit Sucker'
                    : 'Realisasi Tanam Bibit'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-emerald-500">
                  {fmt(
                    showCrown && !showSucker
                      ? activeMonthData.crownTotal
                      : !showCrown && showSucker
                      ? activeMonthData.suckerTotal
                      : showCrown && showSucker
                      ? activeMonthData.totalHa
                      : 0
                  )}{' '}
                  Ha
                </span>
                {pinnedMonth === activeMonthData.monthName && (
                  <button
                    type="button"
                    onClick={() => setPinnedMonth(null)}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 cursor-pointer"
                    title="Tutup pin"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {activeMonthData.totalHa <= 0 ? (
              <div className="py-2 text-center text-slate-400 italic text-[11px]">
                Belum ada realisasi tanam (0,00 Ha)
              </div>
            ) : (
              <>
                {/* Rincian Jenis Bibit & Kelas */}
                <div className="space-y-2">
                  {/* Crown */}
                  {showCrown && (
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700'
                          : 'bg-amber-50/60 border-amber-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                          <span className="text-amber-800 dark:text-amber-300 font-bold">
                            Bibit Crown
                          </span>
                        </div>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-right">
                          {fmt(activeMonthData.crownTotal)} Ha
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-amber-200/60 dark:border-slate-700/60 text-[10px]">
                        <div className="text-left">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Extra Kecil</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.crown_M)}</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Kecil</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.crown_K)}</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Sedang</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.crown_S)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Besar</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.crown_B)}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sucker */}
                  {showSucker && (
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700'
                          : 'bg-cyan-50/60 border-cyan-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                          <span className="text-cyan-800 dark:text-cyan-300 font-bold">
                            Bibit Sucker
                          </span>
                        </div>
                        <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400 text-right">
                          {fmt(activeMonthData.suckerTotal)} Ha
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-cyan-200/60 dark:border-slate-700/60 text-[10px]">
                        <div className="text-left">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Extra Kecil</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.sucker_M)}</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Kecil</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.sucker_K)}</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Sedang</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.sucker_S)}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[9.5px] text-slate-400 block leading-tight">Besar</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-mono">{fmt(activeMonthData.sucker_B)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rincian Lokasi Tanam dengan Grid 2 Kolom Sejajar Rapi */}
                {(() => {
                  const activeLocations = (activeMonthData.locations || []).filter((loc) => {
                    if (showCrown && !showSucker) return !loc.bibit || loc.bibit.toLowerCase().includes('crown');
                    if (!showCrown && showSucker) return !loc.bibit || loc.bibit.toLowerCase().includes('sucker');
                    if (!showCrown && !showSucker) return false;
                    return true;
                  });

                  if (activeLocations.length === 0) return null;

                  return (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                        <span>Lokasi Tanam ({activeLocations.length}):</span>
                      </div>
                      <div
                        onWheel={(e) => e.stopPropagation()}
                        className="max-h-[140px] overflow-y-auto grid grid-cols-2 gap-1.5 pr-1 custom-scrollbar content-start pointer-events-auto"
                      >
                        {activeLocations.map((loc, idx) => (
                          <div
                            key={`${loc.lokasi}-${idx}`}
                            className={`flex items-center justify-between px-2 py-1 rounded border text-[10px] font-mono ${
                              isDark
                                ? 'bg-slate-800/90 border-slate-700 text-slate-200'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="font-bold">{loc.lokasi}</span>
                            <span className="text-slate-500 dark:text-slate-400">{fmt(loc.luasHa)} Ha</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* 3. Tombol Legenda Interaktif di Bagian Bawah (Semua tombol selalu tampil, yang diklik akan ter-hide dari grafik) */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-3 min-h-[44px] select-none">
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
              hiddenBibit.has('Crown')
                ? 'bg-slate-400 dark:bg-slate-500'
                : 'bg-gradient-to-b from-[#fbbf24] to-[#d97706]'
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
              hiddenBibit.has('Sucker')
                ? 'bg-slate-400 dark:bg-slate-500'
                : 'bg-gradient-to-b from-[#22d3ee] to-[#0891b2]'
            }`}
          />
          <span>Bibit Sucker</span>
        </button>
      </div>
    </div>
  );
}
