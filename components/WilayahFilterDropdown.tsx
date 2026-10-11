'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, ChevronDown, Check, RotateCcw } from 'lucide-react';

export interface WilayahFilterDropdownProps {
  selectedWilayah?: string;
  setSelectedWilayah?: (wilayah: string) => void;
  availableWilayahs?: string[];
  align?: 'left' | 'right';
  className?: string;
}

export default function WilayahFilterDropdown({
  selectedWilayah = 'ALL',
  setSelectedWilayah,
  availableWilayahs = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'],
  align = 'right',
  className = '',
}: WilayahFilterDropdownProps) {
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

  const selectedList = useMemo(() => {
    if (!selectedWilayah || selectedWilayah === 'ALL') return [];
    return selectedWilayah.split(',').map((w) => w.trim()).filter(Boolean);
  }, [selectedWilayah]);

  const isAllChecked = useMemo(() => {
    if (!selectedWilayah || selectedWilayah === 'ALL') return false;
    return selectedList.length === availableWilayahs.length && availableWilayahs.length > 0;
  }, [selectedWilayah, selectedList, availableWilayahs]);

  const handleSelectAll = () => {
    if (!setSelectedWilayah) return;
    if (isAllChecked) {
      setSelectedWilayah('ALL');
    } else {
      setSelectedWilayah(availableWilayahs.join(','));
    }
  };

  const handleReset = () => {
    if (!setSelectedWilayah) return;
    setSelectedWilayah('ALL');
  };

  const handleToggleWilayah = (w: string) => {
    if (!setSelectedWilayah) return;
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
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer select-none font-semibold shadow-2xs backdrop-blur-sm ${
          selectedWilayah && selectedWilayah !== 'ALL' && !isAllChecked
            ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500/25'
            : 'bg-white/90 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
        }`}
        title="Filter Wilayah"
      >
        <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Wilayah</span>
        {selectedWilayah && selectedWilayah !== 'ALL' && !isAllChecked && (
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
          } z-50 w-[300px] sm:w-[380px] max-w-[94vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 text-xs ring-1 ring-black/5 dark:ring-white/10 select-none animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Filter Wilayah
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {availableWilayahs.length} Wilayah
            </span>
          </div>

          {/* Pilih Semua & Reset */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                isAllChecked
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/25'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                  isAllChecked
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

          {/* Options Grid Layout (Menyamping & Checklist) */}
          <div className="max-h-64 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {availableWilayahs.map((w) => {
                const isChecked = isAllChecked || selectedList.includes(w);
                return (
                  <label
                    key={w}
                    onClick={() => handleToggleWilayah(w)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
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
  );
}
