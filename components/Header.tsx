'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Filter, Sun, Moon, ChevronDown, Check, X, RotateCcw, XCircle } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface HeaderProps {
  activeTabTitle: string;
  activeTab?: string;
  selectedWilayah: string;
  setSelectedWilayah: (wilayah: string) => void;
  availableWilayahs: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function Header({
  activeTabTitle,
  activeTab = 'overview',
  selectedWilayah,
  setSelectedWilayah,
  availableWilayahs = [],
  searchQuery,
  setSearchQuery,
  onRefresh,
  isLoading = false,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [isWilayahOpen, setIsWilayahOpen] = useState(false);
  const wilayahDropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isWilayahOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wilayahDropdownRef.current && !wilayahDropdownRef.current.contains(e.target as Node)) {
        setIsWilayahOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsWilayahOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWilayahOpen]);

  const selectedList = useMemo(() => {
    if (!selectedWilayah || selectedWilayah === 'ALL') return [];
    return selectedWilayah.split(',').map((w) => w.trim()).filter(Boolean);
  }, [selectedWilayah]);

  const isAllChecked = useMemo(() => {
    if (!selectedWilayah || selectedWilayah === 'ALL') return false;
    return selectedList.length === availableWilayahs.length && availableWilayahs.length > 0;
  }, [selectedWilayah, selectedList, availableWilayahs]);

  const handleSelectAll = () => {
    if (isAllChecked) {
      setSelectedWilayah('ALL');
    } else {
      setSelectedWilayah(availableWilayahs.join(','));
    }
  };

  const handleReset = () => {
    setSelectedWilayah('ALL');
  };

  const handleToggleWilayah = (w: string) => {
    if (isAllChecked) {
      setSelectedWilayah(w);
    } else if (selectedList.includes(w)) {
      const next = selectedList.filter((item) => item !== w);
      if (next.length === 0) {
        setSelectedWilayah('ALL');
      } else {
        setSelectedWilayah(next.join(','));
      }
    } else {
      const next = [...selectedList, w];
      if (next.length >= availableWilayahs.length) {
        setSelectedWilayah(availableWilayahs.join(','));
      } else {
        setSelectedWilayah(next.join(','));
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col shrink-0 select-none transition-colors duration-200 shadow-2xs">
      {/* 1. Top 3.5px GGF Tricolor Bar aligned seamlessly with Sidebar */}
      <div className="h-[3.5px] w-full bg-gradient-to-r from-[#00873D] via-[#F58220] to-[#009EE2] shrink-0 z-20" />

      {/* 2. Full-width Lahan Nanas Image & Semi-Transparent Image Overlay matching the Sidebar */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <img
          src="/assets/Lahan Nanas.jpg"
          alt="Lahan Nanas Header Background"
          className="w-full h-full object-cover object-top filter saturate-110 contrast-105"
        />
        {/* Semi-transparent Image Overlay matching the Sidebar */}
        <div className="absolute inset-0 bg-white/75 dark:bg-slate-950/80 backdrop-blur-[1px]" />

        {/* Subtle Ambient Brand Gradient Radiance */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00873D]/10 via-transparent to-[#009EE2]/8 dark:from-[#00873D]/20 dark:via-transparent dark:to-[#009EE2]/15" />
      </div>

      {/* 3. Header Inner Row with exact matching height of 128px (Total 131.5px, perfectly aligned with Sidebar header) */}
      <div className="h-[128px] border-b border-slate-200/80 dark:border-white/10 px-6 flex md:items-center justify-between gap-3 md:gap-4 z-10 bg-transparent">
        {/* Title & Context */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              GGF Monitoring
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 capitalize tracking-tight leading-tight mt-1">
            {activeTabTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Perencana Pengendali Operasional • PG 1
          </p>
        </div>

        {/* Controls & Quick Filters */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
          {activeTab === 'overview' && (
            <>
              {/* Quick Search */}
              <div className="relative min-w-[170px] sm:min-w-[210px] flex items-center">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Cari lokasi"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/75 dark:bg-slate-950/70 border border-slate-300/80 dark:border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 backdrop-blur-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 flex items-center justify-center z-10"
                    title="Hapus pencarian"
                    aria-label="Hapus pencarian"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Wilayah Dropdown Filter - Menyamping (Grid Horizontal) & Checklist */}
              <div ref={wilayahDropdownRef} className="relative inline-block">
                {/* Trigger Button - Always displays "Wilayah" with indicator if filtered */}
                <button
                  type="button"
                  onClick={() => setIsWilayahOpen(!isWilayahOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer select-none font-semibold shadow-2xs backdrop-blur-sm ${selectedWilayah && selectedWilayah !== 'ALL' && !isAllChecked
                    ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/25'
                    : 'bg-white/75 dark:bg-slate-950/70 border-slate-300/80 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 text-slate-800 dark:text-slate-200'
                    }`}
                  title="Filter Wilayah"
                >
                  <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Wilayah</span>
                  {selectedWilayah && selectedWilayah !== 'ALL' && !isAllChecked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform duration-150 ${isWilayahOpen ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {/* Popover Dropdown - Menyamping & Checklist */}
                {isWilayahOpen && (
                  <div className="absolute top-full mt-1.5 right-0 z-50 w-[300px] sm:w-[380px] max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 text-xs ring-1 ring-black/5 dark:ring-white/10 select-none animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Filter Wilayah
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {availableWilayahs.length} Wilayah
                      </span>
                    </div>

                    {/* Row: Tombol Pilih Semua (kiri) & Tombol Reset (paling kanan) */}
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${isAllChecked
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/25'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${isAllChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                        >
                          {isAllChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span>Pilih Semua</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Menampilkan keseluruhan data pada semua wilayah"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* Options Grid Layout ("menyamping dan checklist") */}
                    <div className="max-h-64 overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {availableWilayahs.map((w) => {
                          const isChecked = isAllChecked || selectedList.includes(w);
                          return (
                            <label
                              key={w}
                              onClick={() => handleToggleWilayah(w)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${isChecked
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                                : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                  }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span className="truncate flex-1 text-[11px] font-medium">{w}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Status */}
                    <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>
                        {selectedWilayah === 'ALL' || !selectedWilayah
                          ? 'Semua wilayah aktif'
                          : isAllChecked
                            ? `Semua wilayah dipilih (${availableWilayahs.length} wilayah)`
                            : `${selectedList.length} dari ${availableWilayahs.length} wilayah dipilih`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Theme Toggle (Mode Terang / Mode Gelap) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label="Toggle Theme"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/75 dark:bg-slate-950/70 border border-slate-300/80 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20 text-slate-800 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 transition-all cursor-pointer shadow-2xs backdrop-blur-sm"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-[11px] font-semibold hidden md:inline">Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="text-[11px] font-semibold hidden md:inline">Gelap</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
