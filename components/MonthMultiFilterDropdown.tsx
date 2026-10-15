'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { getCurrentMonthName } from '@/lib/stokLahanCalculator';

export interface MonthMultiFilterDropdownProps {
  selectedMonths?: string[];
  setSelectedMonths: (months: string[]) => void;
  availableMonths?: string[];
  yearLabel?: string;
  align?: 'left' | 'right';
  className?: string;
  defaultMonth?: string;
}

const DEFAULT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function MonthMultiFilterDropdown({
  selectedMonths = [],
  setSelectedMonths,
  availableMonths = DEFAULT_MONTHS,
  yearLabel = '26',
  align = 'right',
  className = '',
  defaultMonth,
}: MonthMultiFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>(align);

  useEffect(() => {
    setEffectiveAlign(align);
  }, [align]);

  // Measure screen edges to prevent popover overflowing horizontally
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const popoverWidth = 360;

      // Horizontal alignment
      if (align === 'right') {
        if (rect.right - popoverWidth < 16) {
          setEffectiveAlign('left');
        } else {
          setEffectiveAlign('right');
        }
      } else {
        if (rect.left + popoverWidth > window.innerWidth - 16) {
          setEffectiveAlign('right');
        } else {
          setEffectiveAlign('left');
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, align]);

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

  // Tombol reset muncul ketika data difilter (checkbox dipilih)
  const isFiltered = useMemo(() => {
    return selectedMonths.length > 0;
  }, [selectedMonths]);

  const handleSelectAll = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMonths([...availableMonths]);
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMonths([]);
  };

  const handleToggleMonth = (m: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
    <div ref={dropdownRef} className={`relative inline-block ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      {/* Trigger Button: Netral tanpa menyala hijau */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-400 transition-all cursor-pointer select-none font-semibold shadow-2xs"
        title="Filter Bulan"
      >
        <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        <span>Bulan</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-600 dark:text-slate-200' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown - Selalu ke bawah */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 ${
            effectiveAlign === 'left' ? 'left-0' : 'right-0'
          } z-50 w-[320px] sm:w-[360px] max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 text-xs ring-1 ring-black/5 dark:ring-white/10 select-none animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Action Header: Tulisan 'Pilih Semua (12)' dan tulisan 'Reset' */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer select-none transition-colors"
              title={`Pilih semua (${availableMonths.length}) bulan`}
            >
              Pilih Semua ({availableMonths.length})
            </button>

            {isFiltered && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline cursor-pointer select-none transition-colors"
                title="Reset pilihan"
              >
                Reset
              </button>
            )}
          </div>

          {/* Grid of Months (3 columns x 4 rows) */}
          <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
            {availableMonths.map((m) => {
              const isChecked = selectedMonths.includes(m);
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

          {/* Footer Status */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="truncate">
              {selectedMonths.length > 0 ? (
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedMonths.length}
                  </strong>{' '}
                  dari {availableMonths.length} dipilih
                </span>
              ) : (
                'Semua data ditampilkan'
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
