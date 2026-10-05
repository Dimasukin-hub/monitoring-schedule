'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Calendar, Filter } from 'lucide-react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  isMonthFilter?: boolean;
  hideSelectionInTrigger?: boolean;
  className?: string;
  align?: 'left' | 'right';
  preserveOrder?: boolean;
}

const MONTH_ORDER = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

function sortChronologicalMonths(months: string[]): string[] {
  return [...months].sort((a, b) => {
    const parse = (str: string) => {
      const parts = str.split('-');
      if (parts.length === 2) {
        const mIdx = MONTH_ORDER.findIndex(
          (m) => m.toLowerCase().slice(0, 3) === parts[0].toLowerCase().slice(0, 3)
        );
        let y = parseInt(parts[1], 10);
        if (y < 100) y += 2000;
        return y * 100 + (mIdx !== -1 ? mIdx : 0);
      }
      return 0;
    };
    return parse(a) - parse(b);
  });
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder,
  isMonthFilter = false,
  hideSelectionInTrigger = false,
  className = '',
  align = 'left',
  preserveOrder = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>(align);

  useEffect(() => {
    setEffectiveAlign(align);
  }, [align]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const popoverWidth = isMonthFilter ? 480 : filteredOptions.length <= 4 ? 420 : 540;
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
    }
  }, [isOpen, align, isMonthFilter]);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Sort and filter options
  const sortedOptions = useMemo(() => {
    if (isMonthFilter) {
      return sortChronologicalMonths(options);
    }
    if (preserveOrder) {
      return options;
    }
    return [...options].sort();
  }, [options, isMonthFilter, preserveOrder]);

  // Extract years for month filter tabs (e.g. '2026', '2025', '2027')
  const availableYears = useMemo(() => {
    if (!isMonthFilter) return [];
    const years = new Set<string>();
    options.forEach((opt) => {
      const parts = opt.split('-');
      if (parts.length === 2) {
        let y = parseInt(parts[1], 10);
        if (y < 100) y += 2000;
        years.add(String(y));
      }
    });
    return Array.from(years).sort();
  }, [options, isMonthFilter]);

  const filteredOptions = useMemo(() => {
    return sortedOptions.filter((opt) => {
      const matchesSearch = opt.toLowerCase().includes(search.toLowerCase());
      if (!isMonthFilter || yearFilter === 'ALL') {
        return matchesSearch;
      }
      // Check year match
      const parts = opt.split('-');
      if (parts.length === 2) {
        let y = parseInt(parts[1], 10);
        if (y < 100) y += 2000;
        return matchesSearch && String(y) === yearFilter;
      }
      return matchesSearch;
    });
  }, [sortedOptions, search, isMonthFilter, yearFilter]);

  const handleToggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleSelectAll = () => {
    const allFiltered = filteredOptions;
    const combined = Array.from(new Set([...selected, ...allFiltered]));
    onChange(combined);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  const hasSelection = selected.length > 0;

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button - Bersih & Elegan */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer select-none font-medium shadow-2xs ${
          hasSelection
            ? 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/25'
            : 'bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-400'
        }`}
        title={`Filter ${label}: ${hasSelection ? `${selected.length} dipilih` : 'Klik untuk memilih'}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-xs text-left truncate">
            {label}
          </span>
          {hasSelection && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown - Opsi dibuat menyamping (Grid Horizontal) & Dropdown lebih lebar */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 ${
            effectiveAlign === 'right' ? 'right-0' : 'left-0'
          } ${
            isMonthFilter
              ? 'w-[320px] sm:w-[480px] max-w-[94vw]'
              : filteredOptions.length <= 4
              ? 'w-[320px] sm:w-[420px] max-w-[94vw]'
              : 'w-[340px] sm:w-[520px] md:w-[580px] max-w-[95vw]'
          } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 text-xs animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5 dark:ring-white/10`}
        >
          {/* Header Note for Bulan Tanam */}
          {isMonthFilter && label === 'Bulan Tanam' && (
            <div className="mb-2.5 p-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[10px] text-emerald-800 dark:text-emerald-300 leading-snug">
              <span className="font-bold flex items-center gap-1 mb-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Filter Bulan & Tahun Tanam:
              </span>
              Menampilkan lokasi dengan Rencana atau Real <strong>Bongkar, Bajak, SN, dan Tanam</strong> di periode terpilih.
            </div>
          )}
          {isMonthFilter && label === 'Bulan Aktivitas' && (
            <div className="mb-2.5 p-2 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[10px] text-emerald-800 dark:text-emerald-300 leading-snug">
              <span className="font-bold flex items-center gap-1 mb-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Filter Bulan Aktivitas:
              </span>
              Pilih bulan kalender aktivitas untuk melihat jadwal dan realisasi.
            </div>
          )}

          {/* Search Box if more than 6 options */}
          {options.length > 6 && (
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Cari ${label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Year Quick Filter for Month Filter */}
          {isMonthFilter && availableYears.length > 1 && (
            <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mr-1">Tahun:</span>
              <button
                type="button"
                onClick={() => setYearFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                  yearFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setYearFilter(yr)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                    yearFilter === yr
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions (Pilih Semua / Reset) */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              Pilih Semua ({filteredOptions.length})
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => handleClear()}
                className="text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          {/* Options Grid Layout ("pilihannya menyamping") */}
          <div className="max-h-72 overflow-y-auto pr-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Tidak ada opsi yang cocok dengan &quot;{search}&quot;
              </div>
            ) : (
              <div
                className={`grid ${
                  isMonthFilter
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5'
                    : filteredOptions.length <= 4
                    ? 'grid-cols-2 sm:grid-cols-4 gap-2'
                    : 'grid-cols-2 sm:grid-cols-3 gap-2'
                }`}
              >
                {filteredOptions.map((opt) => {
                  const isChecked = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      onClick={() => handleToggle(opt)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                      title={opt}
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
                      <span className="flex-1 text-[11px] leading-snug whitespace-normal break-words text-left">
                        {opt}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Status */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">
              {selected.length > 0 ? (
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {selected.length}
                  </strong>{' '}
                  dari {options.length} dipilih
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

