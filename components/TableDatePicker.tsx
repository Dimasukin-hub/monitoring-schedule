'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface TableDatePickerProps {
  value: string | null | undefined;
  onChange: (dateStr: string | null) => void;
  label?: string;
  isReal?: boolean;
  className?: string;
  align?: 'left' | 'center' | 'right';
  isMonthOnly?: boolean;
  formatDisplay?: 'full' | 'short';
  disabled?: boolean;
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDONESIAN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function parseDate(str: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!str || str === '-' || str === '0' || str.trim() === '') return null;

  let s = str.trim();
  if (s.includes('T')) {
    s = s.split('T')[0];
  }

  // DD/MM/YYYY or DD/MM/YY
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    const d = parseInt(slashParts[0], 10);
    const m = parseInt(slashParts[1], 10) - 1;
    let y = parseInt(slashParts[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11) {
      return { day: d, month: m, year: y };
    }
  }

  // YYYY-MM-DD
  const dashParts = s.split('-');
  if (dashParts.length === 3) {
    const y = parseInt(dashParts[0], 10);
    const m = parseInt(dashParts[1], 10) - 1;
    const d = parseInt(dashParts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11) {
      return { day: d, month: m, year: y };
    }
  }

  // e.g. "Okt-26" or "Jan-26"
  if (dashParts.length === 2) {
    const mStr = dashParts[0].toLowerCase().slice(0, 3);
    let y = parseInt(dashParts[1], 10);
    if (y < 100) y += 2000;
    const mIdx = INDONESIAN_MONTHS_SHORT.findIndex((m) => m.toLowerCase().slice(0, 3) === mStr);
    if (mIdx !== -1 && !isNaN(y)) {
      return { day: 1, month: mIdx, year: y };
    }
  }

  return null;
}

function formatDate(year: number, month: number, day: number, isMonthOnly = false): string {
  if (isMonthOnly) {
    const shortM = INDONESIAN_MONTHS_SHORT[month] || 'Jan';
    const shortY = String(year).slice(-2);
    return `${shortM}-${shortY}`;
  }
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

export default function TableDatePicker({
  value,
  onChange,
  label,
  isReal = false,
  className = '',
  align = 'center',
  isMonthOnly = false,
  formatDisplay = 'short',
  disabled,
}: TableDatePickerProps) {
  const { isAdmin } = useAuth();
  const isDisabled = disabled !== undefined ? disabled : !isAdmin;
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const parsed = parseDate(value);
  const today = new Date();

  // Calendar View State
  const [viewYear, setViewYear] = useState<number>(parsed?.year || 2026);
  const [viewMonth, setViewMonth] = useState<number>(parsed !== null ? parsed.month : today.getMonth());
  const [typedInput, setTypedInput] = useState<string>(value && value !== '-' ? value : '');

  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when value changes or popover opens
  useEffect(() => {
    if (isOpen) {
      const p = parseDate(value);
      if (p) {
        setViewYear(p.year);
        setViewMonth(p.month);
        setTypedInput(value || '');
      } else {
        setViewYear(2026);
        setViewMonth(today.getMonth());
        setTypedInput('');
      }
    }
  }, [isOpen, value]);

  // Position calculation
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 310;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) left = 12;

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight - 12 && rect.top > popoverHeight + 12) {
      top = rect.top - popoverHeight - 6;
    }

    setCoords({ top, left });
  };

  const openPicker = () => {
    if (isDisabled) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    updatePosition();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleMouseEnter = () => {
    if (isDisabled) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      openPicker();
    }, 200);
  };

  const handleMouseLeave = () => {
    scheduleClose();
  };

  const handlePopoverMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const handlePopoverMouseLeave = () => {
    scheduleClose();
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
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
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMonthOnly) {
      setViewYear((y) => y - 1);
      return;
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMonthOnly) {
      setViewYear((y) => y + 1);
      return;
    }
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = formatDate(viewYear, viewMonth, day, isMonthOnly);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = formatDate(today.getFullYear(), today.getMonth(), today.getDate(), isMonthOnly);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleApplyTyped = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!typedInput.trim() || typedInput.trim() === '-') {
      onChange(null);
    } else {
      onChange(typedInput.trim());
    }
    setIsOpen(false);
  };

  // Generate days in month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  // Format string for display in table (full e.g. 18/07/2026 or short e.g. 18/07/26)
  const formatValueDisplay = (val: string | null | undefined) => {
    if (!val || val === '-' || val === '0') return '-';
    if (formatDisplay === 'full') return val;
    return val.replace(/\/20(\d{2})$/, '/$1');
  };

  const hasValue = value && value !== '-' && value !== '0';

  const availableYears = Array.from(
    new Set([2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, viewYear])
  ).sort((a, b) => a - b);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDisabled) openPicker();
        }}
        className={`group/date relative inline-flex items-center gap-1 select-none rounded px-1 py-0.5 transition-all ${
          isDisabled
            ? 'cursor-default'
            : isOpen
            ? 'ring-1 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/80 cursor-pointer'
            : 'hover:bg-emerald-50/80 dark:hover:bg-slate-800/80 hover:ring-1 hover:ring-emerald-400/50 cursor-pointer'
        } ${className}`}
        title={isDisabled ? undefined : 'Arahkan kursor atau klik untuk memilih tanggal via calendar date picker'}
      >
        {label && (
          <span
            className={`text-[9px] font-sans font-medium mr-1 ${
              isReal ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {label}
          </span>
        )}

        <span
          className={`font-mono transition-colors ${
            hasValue
              ? isReal
                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'text-slate-800 dark:text-slate-200 font-medium'
              : 'text-slate-400 dark:text-slate-600'
          }`}
        >
          {formatValueDisplay(value)}
        </span>
      </div>

      {/* Floating Calendar Popover via Portal */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 select-none text-slate-800 dark:text-slate-200 text-xs font-sans ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Header: Month / Year / Prev / Next */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title={isMonthOnly ? 'Tahun sebelumnya' : 'Bulan sebelumnya'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                {!isMonthOnly && <span>{INDONESIAN_MONTHS[viewMonth]}</span>}
                {isMonthOnly && <span>Pilih Bulan</span>}
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                  className="bg-transparent border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title={isMonthOnly ? 'Tahun berikutnya' : 'Bulan berikutnya'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Content: 12-Month Grid OR Day Grid */}
            {isMonthOnly ? (
              <div className="grid grid-cols-3 gap-1.5 p-1 mb-2">
                {INDONESIAN_MONTHS_SHORT.map((mShort, idx) => {
                  const isSelected = parsed && parsed.month === idx && parsed.year === viewYear;
                  const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === idx;

                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => {
                        const shortY = String(viewYear).slice(-2);
                        onChange(`${mShort}-${shortY}`);
                        setIsOpen(false);
                      }}
                      className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCurrentMonth
                          ? 'ring-1 ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-slate-800'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {mShort}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {DAYS_SHORT.map((d, i) => (
                  <span
                    key={d}
                    className={`text-[10px] font-bold py-0.5 ${
                      i === 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {d}
                  </span>
                ))}

                {/* Blank cells for offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-7 h-7" />
                ))}

                {/* Days in Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected =
                    parsed &&
                    parsed.year === viewYear &&
                    parsed.month === viewMonth &&
                    parsed.day === dayNum;

                  const isTodayDate =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === dayNum;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`w-7 h-7 text-xs font-mono font-medium rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-bold shadow-sm'
                          : isTodayDate
                          ? 'ring-1 ring-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-slate-800'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleClear}
                className="font-medium text-rose-500 hover:underline cursor-pointer"
              >
                Kosongkan
              </button>

              <button
                type="button"
                onClick={handleSetToday}
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isMonthOnly ? 'Bulan Ini' : 'Hari Ini'}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
