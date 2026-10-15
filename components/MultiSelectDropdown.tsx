'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Calendar, Filter } from 'lucide-react';

export interface FilterGroup {
  name: string;
  shortBadge?: string;
  color?: 'amber' | 'blue' | 'cyan' | 'emerald' | string;
  options: string[];
}

export interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  groups?: FilterGroup[];
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
  groups,
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

  const isGrouped = Boolean(groups && groups.length > 0);

  useEffect(() => {
    setEffectiveAlign(align);
  }, [align]);

  // Sort and filter options for non-grouped
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

  // Measure screen edges to prevent popover overflowing horizontally
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const popoverWidth = isMonthFilter ? 480 : isGrouped ? 640 : filteredOptions.length <= 4 ? 420 : 540;

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
  }, [isOpen, align, isMonthFilter, isGrouped, filteredOptions.length]);

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

  // Filtered groups when grouped mode is active
  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups
      .map((grp) => {
        const matchesGroupName = grp.name.toLowerCase().includes(q) || (grp.shortBadge && grp.shortBadge.toLowerCase().includes(q));
        const matchingOptions = grp.options.filter(
          (opt) => matchesGroupName || opt.toLowerCase().includes(q)
        );
        return {
          ...grp,
          options: matchingOptions,
        };
      })
      .filter((grp) => grp.options.length > 0);
  }, [groups, search]);

  const totalFilteredCount = useMemo(() => {
    if (isGrouped && filteredGroups) {
      return filteredGroups.reduce((acc, g) => acc + g.options.length, 0);
    }
    return filteredOptions.length;
  }, [isGrouped, filteredGroups, filteredOptions]);

  const totalPossibleCount = useMemo(() => {
    if (isGrouped && groups) {
      return groups.reduce((acc, g) => acc + g.options.length, 0);
    }
    return options.length;
  }, [isGrouped, groups, options]);

  const handleToggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const handleToggleGroup = (groupOptions: string[]) => {
    const allSelected = groupOptions.length > 0 && groupOptions.every((opt) => selected.includes(opt));
    if (allSelected) {
      onChange(selected.filter((item) => !groupOptions.includes(item)));
    } else {
      onChange(Array.from(new Set([...selected, ...groupOptions])));
    }
  };

  const handleSelectAll = () => {
    if (isGrouped && filteredGroups) {
      const allFiltered = filteredGroups.flatMap((g) => g.options);
      onChange(Array.from(new Set([...selected, ...allFiltered])));
    } else {
      const allFiltered = filteredOptions;
      onChange(Array.from(new Set([...selected, ...allFiltered])));
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  const hasSelection = selected.length > 0;

  return (
    <div ref={dropdownRef} className={`relative inline-block ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
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

      {/* Popover Dropdown - Opsi dibuat menyamping (Grid Horizontal) & Selalu ke bawah */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 ${
            effectiveAlign === 'right' ? 'right-0' : 'left-0'
          } ${
            isMonthFilter
              ? 'w-[320px] sm:w-[480px] max-w-[94vw]'
              : isGrouped
              ? 'w-[340px] sm:w-[580px] md:w-[650px] max-w-[96vw]'
              : filteredOptions.length <= 4
              ? 'w-[320px] sm:w-[420px] max-w-[94vw]'
              : 'w-[340px] sm:w-[520px] md:w-[580px] max-w-[95vw]'
          } max-h-[min(520px,calc(100vh-80px))] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 text-xs animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5 dark:ring-white/10`}
        >
          {/* Header Note for Bulan Tanam */}
          {isMonthFilter && label === 'Bulan Tanam' && (
            <div className="shrink-0 mb-2 px-2.5 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[10px] text-emerald-800 dark:text-emerald-300 leading-snug">
              <span className="font-bold inline-flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 inline" /> Filter Bulan & Tahun Tanam:
              </span>
              Rencana/Real <strong>Bongkar, Bajak, SN, dan Tanam</strong> di periode terpilih.
            </div>
          )}
          {isMonthFilter && label === 'Bulan Aktivitas' && (
            <div className="shrink-0 mb-2 px-2.5 py-1.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[10px] text-emerald-800 dark:text-emerald-300 leading-snug">
              <span className="font-bold inline-flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 inline" /> Filter Bulan Aktivitas:
              </span>
              Pilih bulan kalender aktivitas untuk melihat jadwal dan realisasi.
            </div>
          )}

          {/* Search Box if more than 6 options or grouped */}
          {(options.length > 6 || isGrouped) && (
            <div className="shrink-0 relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={placeholder || `Cari ${label.toLowerCase()}...`}
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
            <div className="shrink-0 flex items-center gap-1 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mr-0.5">Tahun:</span>
              <button
                type="button"
                onClick={() => setYearFilter('ALL')}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
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
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
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
          <div className="shrink-0 flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              Pilih Semua ({totalFilteredCount})
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

          {/* Options Container (Grouped or Flat Grid Layout) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {isGrouped && filteredGroups ? (
              filteredGroups.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Tidak ada aktivitas yang cocok dengan &quot;{search}&quot;
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGroups.map((grp) => {
                    const groupSelectedCount = grp.options.filter((opt) => selected.includes(opt)).length;
                    const isAllSelected = grp.options.length > 0 && groupSelectedCount === grp.options.length;

                    const badgeColorMap: Record<string, string> = {
                      amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700',
                      cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
                      emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
                    };
                    const badgeClass = (grp.color && badgeColorMap[grp.color]) || badgeColorMap.emerald;

                    return (
                      <div
                        key={grp.name}
                        className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/50 p-2.5 transition-all"
                      >
                        {/* Group Header Bar */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70 dark:border-slate-800/70">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {grp.shortBadge && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass} shrink-0`}>
                                {grp.shortBadge}
                              </span>
                            )}
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                              {grp.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal shrink-0">
                              ({groupSelectedCount}/{grp.options.length})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleGroup(grp.options)}
                            className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                              isAllSelected
                                ? 'text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                            }`}
                          >
                            {isAllSelected ? 'Reset' : 'Pilih Semua'}
                          </button>
                        </div>

                        {/* Group Options Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {grp.options.map((opt) => {
                            const isChecked = selected.includes(opt);
                            return (
                              <label
                                key={opt}
                                onClick={() => handleToggle(opt)}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
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
                                <span className="flex-1 text-[10.5px] leading-snug whitespace-normal break-words text-left">
                                  {opt}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredOptions.length === 0 ? (
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
          <div className="shrink-0 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">
              {selected.length > 0 ? (
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {selected.length}
                  </strong>{' '}
                  dari {totalPossibleCount} dipilih
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
