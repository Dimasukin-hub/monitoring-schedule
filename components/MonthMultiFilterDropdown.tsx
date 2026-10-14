'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check, RotateCcw } from 'lucide-react';

export interface MonthMultiFilterDropdownProps {
  selectedMonths: string[];
  setSelectedMonths: (months: string[]) => void;
  availableMonths?: string[];
  yearLabel?: string;
  align?: 'left' | 'right';
  className?: string;
}

const DEFAULT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function MonthMultiFilterDropdown({
  selectedMonths = [],
  setSelectedMonths,
  availableMonths = DEFAULT_MONTHS,
  yearLabel = '26',
  align = 'right',
  className = '',
}: MonthMultiFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isAllSelected = useMemo(() => {
    return selectedMonths.length === 0 || selectedMonths.length === availableMonths.length;
  }, [selectedMonths, availableMonths]);

  const isFiltered = useMemo(() => {
    return selectedMonths.length > 0 && selectedMonths.length < availableMonths.length;
  }, [selectedMonths, availableMonths]);

  const triggerLabel = useMemo(() => {
    if (isAllSelected) {
      return `Jan - Des ${yearLabel}`;
    }
    if (selectedMonths.length === 1) {
      return `${selectedMonths[0]}-${yearLabel}`;
    }
    if (selectedMonths.length <= 3) {
      return selectedMonths.map((m) => `${m}`).join(', ') + ` '${yearLabel}`;
    }
    return `${selectedMonths.length} Bulan (${selectedMonths[0]}..${selectedMonths[selectedMonths.length - 1]})`;
  }, [isAllSelected, selectedMonths, yearLabel]);

  const handleSelectAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMonths([...availableMonths]);
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMonths([]);
  };

  const handleSelectCurrentMonth = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMonths(['Okt']);
  };

  const handleToggleMonth = (m: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isAllSelected) {
      // Jika dari kondisi semua aktif, klik salah satu langsung memfilter ke bulan tersebut saja
      setSelectedMonths([m]);
      return;
    }

    if (selectedMonths.includes(m)) {
      const next = selectedMonths.filter((item) => item !== m);
      setSelectedMonths(next);
    } else {
      const next = [...selectedMonths, m];
      next.sort((a, b) => availableMonths.indexOf(a) - availableMonths.indexOf(b));
      setSelectedMonths(next);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer select-none font-semibold shadow-2xs backdrop-blur-sm ${
          isFiltered
            ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/25'
            : 'bg-white/90 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}
        title="Filter Bulan Tanam / Kegiatan (2026)"
      >
        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="font-mono">{triggerLabel}</span>
        {isFiltered && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${
            align === 'left' ? 'left-0' : 'right-0'
          } z-50 w-[320px] sm:w-[370px] max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 text-xs ring-1 ring-black/5 dark:ring-white/10 select-none animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Filter Bulan (20{yearLabel})
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              12 Bulan Kegiatan
            </span>
          </div>

          {/* Action Header: Pilih Semua, Bulan Ini & Reset */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer select-none ${
                  isAllSelected
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/25'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Pilih seluruh bulan Jan - Des 2026"
              >
                <div
                  className={`w-3 h-3 rounded border flex items-center justify-center transition-all shrink-0 ${
                    isAllSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {isAllSelected && <Check className="w-2 h-2 stroke-[3]" />}
                </div>
                <span>Semua</span>
              </button>

              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer select-none ${
                  selectedMonths.length === 1 && selectedMonths[0] === 'Okt'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/25'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Pilih bulan berjalan saat ini (Okt-26)"
              >
                Okt (Bulan Ini)
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Reset ke default (menampilkan seluruh bulan Jan - Des 26)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Grid of Months (3 columns x 4 rows) */}
          <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
            {availableMonths.map((m) => {
              const isChecked = isAllSelected || selectedMonths.includes(m);
              return (
                <button
                  type="button"
                  key={m}
                  onClick={(e) => handleToggleMonth(m, e)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all text-left ${
                    isChecked
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="truncate flex-1 text-[11px] font-mono">{m}-{yearLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Status & Done Button */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="truncate mr-2">
              {isAllSelected
                ? `Semua bulan aktif (Jan - Des ${yearLabel})`
                : `${selectedMonths.length} dari ${availableMonths.length} bulan dipilih`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-md hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
