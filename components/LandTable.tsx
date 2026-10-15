'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Download,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  XCircle,
} from 'lucide-react';
import TableDatePicker from '@/components/TableDatePicker';
import MultiSelectDropdown, { FilterGroup } from '@/components/MultiSelectDropdown';
import { PIPELINE_ORDER, computeAktivitasTerakhir, isValidDate } from '@/lib/landActivityUtils';
import { useAuth } from '@/components/AuthProvider';

export const REAL_MASTER_STATUSES = [
  'JBBK', 'NRBB', 'NRST', 'NSBB', 'NSBK', 'NSCL', 'NSFC', 'NSSC', 'NSST',
  'PSBK', 'PSFC', 'PSR', 'PSSC', 'PSSR', 'PSY', 'PYBK', 'PYFC', 'PYST',
  'Rumput', 'Singkong', 'SKBK', 'SKFC'
];

interface InlineCellProps {
  value: string | number | null | undefined;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  step?: string;
  placeholder?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  textClassName?: string;
  displayFormatter?: (val: any) => React.ReactNode;
  onSave: (val: any) => void;
  disabled?: boolean;
}

function InlineCell({
  value,
  type = 'text',
  options,
  step,
  placeholder,
  align = 'center',
  className = '',
  textClassName = '',
  displayFormatter,
  onSave,
  disabled,
}: InlineCellProps) {
  const { isAdmin } = useAuth();
  const isDisabled = disabled !== undefined ? disabled : !isAdmin;
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value !== null && value !== undefined ? String(value) : '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setVal(value !== null && value !== undefined ? String(value) : '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current && type !== 'select') {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, type]);

  const commitChange = () => {
    setIsEditing(false);
    let finalVal: any = val.trim();
    if (type === 'number') {
      if (finalVal === '' || finalVal === '-') {
        finalVal = 0;
      } else {
        finalVal = parseFloat(finalVal) || 0;
      }
    } else {
      if (finalVal === '' || finalVal === '-') {
        finalVal = null;
      }
    }
    if (finalVal !== value) {
      onSave(finalVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitChange();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setVal(value !== null && value !== undefined ? String(value) : '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (type === 'select' && options) {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-center p-0.5"
        >
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={commitChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-white dark:bg-slate-900 border border-emerald-500 rounded px-1 py-0.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none shadow-sm cursor-pointer"
          >
            {val && !options.includes(val) && (
              <option value={val} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {val}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-center p-0.5"
      >
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === 'number' ? 'number' : 'text'}
          step={step}
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commitChange}
          onKeyDown={handleKeyDown}
          className={`w-full bg-white dark:bg-slate-900 border border-emerald-500 rounded px-1 py-0.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none shadow-sm ${
            align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
          }`}
        />
      </div>
    );
  }

  const hasVal = value !== null && value !== undefined && value !== '' && value !== '-' && value !== 0;

  if (isDisabled) {
    return (
      <div
        className={`select-none rounded px-1 py-0.5 flex items-center ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center text-center' : 'justify-start'
        } ${className}`}
      >
        <div className={`max-w-full w-full ${textClassName.includes('whitespace-normal') ? 'whitespace-normal text-center flex flex-col items-center justify-center' : `truncate ${align === 'center' ? 'text-center' : ''}`} ${textClassName}`}>
          {displayFormatter
            ? displayFormatter(value)
            : hasVal
            ? String(value)
            : '-'}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`group/cell relative cursor-pointer select-none rounded px-1 py-0.5 transition-all hover:bg-emerald-50/80 dark:hover:bg-slate-800/80 hover:ring-1 hover:ring-emerald-400/50 flex items-center ${
        align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center text-center' : 'justify-start'
      } ${className}`}
      title="Klik untuk mengedit langsung"
    >
      <div className={`max-w-full w-full ${textClassName.includes('whitespace-normal') ? 'whitespace-normal text-center flex flex-col items-center justify-center' : `truncate ${align === 'center' ? 'text-center' : ''}`} ${textClassName}`}>
        {displayFormatter
          ? displayFormatter(value)
          : hasVal
          ? String(value)
          : '-'}
      </div>
    </div>
  );
}

function parseBibitKelas(str: string | null | undefined): { jenisBibit: string | null; kelasBibit: string | null } {
  if (!str || str.trim() === '' || str.trim() === '-') {
    return { jenisBibit: null, kelasBibit: null };
  }
  const s = str.trim();
  const match = s.match(/^([^\(]+)(?:\((.*?)\))?$/);
  if (match) {
    const jenis = match[1].trim() || null;
    const kelas = match[2] ? match[2].trim() : null;
    return { jenisBibit: jenis, kelasBibit: kelas };
  }
  return { jenisBibit: s, kelasBibit: null };
}

const DUAL_DATE_FIELDS = new Set([
  'bajakAwalMb5Btr',
  'bajakAwalMb25',
  'bajakAwalMph',
  'bajakAwalNardi',
  'hrEksMb',
  'subsoilerSs1',
  'subsoilerSs2',
  'finishingRotaryFh1',
  'finishingRotaryFh2',
  'ridger',
  'jalanSal',
]);

const getFieldRencanaReal = (land: any, fieldKey: string): { rencana: string | null; real: string | null } => {
  const app = land.aplikasiDetails || {};
  switch (fieldKey) {
    case 'bajakAwalMb5Btr':
      return {
        rencana: app.rencAwalMb5Btr || app.bajakAwalMb5Btr || land.bajakAwalMb5Btr || null,
        real: app.realBajakAwalMb5Btr || (app.rencAwalMb5Btr && app.bajakAwalMb5Btr ? app.bajakAwalMb5Btr : null) || null,
      };
    case 'bajakAwalMb25':
      return {
        rencana: app.bajakAwalMb25 || land.bajakAwalMb25 || null,
        real: app.realBajakAwalMb25 || null,
      };
    case 'bajakAwalMph':
      return {
        rencana: app.bajakAwalMph || land.bajakAwalMph || null,
        real: app.realBajakAwalHoward || null,
      };
    case 'bajakAwalNardi':
      return {
        rencana: app.bajakAwalNardi || land.bajakAwalNardi || null,
        real: app.realBajakAwalNardi || null,
      };
    case 'hrEksMb':
      return {
        rencana: app.hrEksMb || land.hrEksMb || null,
        real: app.realHrEksMb || null,
      };
    case 'subsoilerSs1':
      return {
        rencana: app.subsoilerSs1 || land.subsoilerSs1 || null,
        real: app.realSubsoilerSs1 || null,
      };
    case 'subsoilerSs2':
      return {
        rencana: app.subsoilerSs2 || land.subsoilerSs2 || null,
        real: app.realSubsoilerSs2 || null,
      };
    case 'finishingRotaryFh1':
      return {
        rencana: app.finishingRotaryFh1 || land.finishingRotaryFh1 || null,
        real: app.realFinishingRotaryFh1 || null,
      };
    case 'finishingRotaryFh2':
      return {
        rencana: app.finishingRotaryFh2 || land.finishingRotaryFh2 || null,
        real: app.realRotaryFh2 || null,
      };
    case 'ridger':
      return {
        rencana: (typeof land.ridger === 'object' && land.ridger !== null ? land.ridger.rencana : null) || app.ridger || (typeof land.ridger === 'string' ? land.ridger : null) || null,
        real: (typeof land.ridger === 'object' && land.ridger !== null ? land.ridger.real : null) || app.realRidger || land.realRidger || null,
      };
    case 'jalanSal':
      return {
        rencana: (typeof land.jalanSal === 'object' && land.jalanSal !== null ? land.jalanSal.rencana : null) || app.jalanSal || (typeof land.jalanSal === 'string' ? land.jalanSal : null) || null,
        real: (typeof land.jalanSal === 'object' && land.jalanSal !== null ? land.jalanSal.real : null) || app.realJalanSal || land.realJalanSal || null,
      };
    default:
      return {
        rencana: land[fieldKey] || app[fieldKey] || null,
        real: app[`real_${fieldKey}`] || app[`real${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`] || null,
      };
  }
};

const ALL_ACTIVITIES = [
  { key: 'ALL', label: '-- Semua Aktivitas --', group: '' },
  // Bongkar
  { key: 'chopper', label: 'CHOPPER', group: 'Tahapan Bongkar' },
  { key: 'chopperLu', label: 'CHOPPER LU', group: 'Tahapan Bongkar' },
  { key: 'rh1', label: 'RH1', group: 'Tahapan Bongkar' },
  { key: 'cuttingBanana', label: 'CUTTING BANANA', group: 'Tahapan Bongkar' },
  { key: 'dolomit', label: 'DOLOMIT', group: 'Tahapan Bongkar' },
  { key: 'dp1', label: 'DP 1', group: 'Tahapan Bongkar' },
  { key: 'dpCross', label: 'DP CROSS', group: 'Tahapan Bongkar' },
  { key: 'dp2', label: 'DP 2', group: 'Tahapan Bongkar' },
  { key: 'belerang', label: 'BELERANG', group: 'Tahapan Bongkar' },
  { key: 'kompos', label: 'KOMPOS', group: 'Tahapan Bongkar' },
  // Bajak
  { key: 'bajakAwal', label: 'BAJAK AWAL (Semua)', group: 'Tahapan Bajak' },
  { key: 'bajakAwalMb5Btr', label: 'Bajak Awal - MB 5 BTR', group: 'Tahapan Bajak' },
  { key: 'bajakAwalMb25', label: 'Bajak Awal - MB 2.5', group: 'Tahapan Bajak' },
  { key: 'bajakAwalMph', label: 'Bajak Awal - MPH', group: 'Tahapan Bajak' },
  { key: 'bajakAwalNardi', label: 'Bajak Awal - Nardi', group: 'Tahapan Bajak' },
  { key: 'hrEksMb', label: 'HR EKS MB', group: 'Tahapan Bajak' },
  { key: 'subsoiler', label: 'SUBSOILER (Semua)', group: 'Tahapan Bajak' },
  { key: 'subsoilerSs1', label: 'Subsoiler - SS1', group: 'Tahapan Bajak' },
  { key: 'subsoilerSs2', label: 'Subsoiler - SS2', group: 'Tahapan Bajak' },
  { key: 'finishingRotary', label: 'FINISHING ROTARY (Semua)', group: 'Tahapan Bajak' },
  { key: 'finishingRotaryFh1', label: 'Finishing Rotary - FH 1', group: 'Tahapan Bajak' },
  { key: 'finishingRotaryFh2', label: 'Finishing Rotary - FH 2', group: 'Tahapan Bajak' },
  { key: 'rotaryFh2', label: 'ROTARY FH2', group: 'Tahapan Bajak' },
  { key: 'ridger', label: 'RIDGER', group: 'Tahapan Bajak' },
  // SN
  { key: 'jalanSal', label: 'JALAN & SALURAN', group: 'Tahapan SN' },
  { key: 'siapTanam', label: 'SIAP TANAM', group: 'Tahapan SN' },
  // Tanam
  { key: 'prosesTanam', label: 'PROSES TANAM', group: 'Tahapan Tanam' },
  { key: 'selesaiTanam', label: 'SELESAI TANAM', group: 'Tahapan Tanam' },
];

const ACTIVITY_OPTIONS = [
  'CHOPPER',
  'CHOPPER LU',
  'RH1',
  'CUTTING BANANA',
  'DOLOMIT',
  'DP 1',
  'DP CROSS',
  'DP 2',
  'BELERANG',
  'KOMPOS',
  'MB 5 BTR',
  'MB 2.5',
  'MPH',
  'NARDI',
  'HR EKS MB',
  'SS1',
  'SS2',
  'ROTARY FH1',
  'ROTARY FH2',
  'RIDGER',
  'JALAN & SAL',
  'SIAP TANAM',
  'PROSES TANAM',
  'SELESAI TANAM',
];

const ACTIVITY_GROUPS: FilterGroup[] = [
  {
    name: 'Bongkar',
    shortBadge: 'BK',
    color: 'amber',
    options: [
      'CHOPPER',
      'CHOPPER LU',
      'RH1',
      'CUTTING BANANA',
      'DOLOMIT',
      'DP 1',
      'DP CROSS',
      'DP 2',
      'BELERANG',
      'KOMPOS',
    ],
  },
  {
    name: 'Bajak',
    shortBadge: 'BJK',
    color: 'blue',
    options: [
      'MB 5 BTR',
      'MB 2.5',
      'MPH',
      'NARDI',
      'HR EKS MB',
      'SS1',
      'SS2',
      'ROTARY FH1',
      'ROTARY FH2',
      'RIDGER',
    ],
  },
  {
    name: 'Siap Tanam',
    shortBadge: 'SN',
    color: 'cyan',
    options: [
      'JALAN & SAL',
      'SIAP TANAM',
    ],
  },
  {
    name: 'Tanam',
    shortBadge: 'TNM',
    color: 'emerald',
    options: [
      'PROSES TANAM',
      'SELESAI TANAM',
    ],
  },
];

const getActivityGroupBadge = (act: string): string => {
  for (const grp of ACTIVITY_GROUPS) {
    if (grp.options.includes(act)) {
      return grp.shortBadge || '';
    }
  }
  return '';
};

const ACTIVITY_LABEL_TO_KEY: Record<string, string> = {
  'CHOPPER': 'chopper',
  'CHOPPER LU': 'chopperLu',
  'RH1': 'rh1',
  'CUTTING BANANA': 'cuttingBanana',
  'DOLOMIT': 'dolomit',
  'DP 1': 'dp1',
  'DP CROSS': 'dpCross',
  'DP 2': 'dp2',
  'BELERANG': 'belerang',
  'KOMPOS': 'kompos',
  'BAJAK AWAL': 'bajakAwal',
  'MB 5 BTR': 'bajakAwalMb5Btr',
  'MB 2.5': 'bajakAwalMb25',
  'MPH': 'bajakAwalMph',
  'NARDI': 'bajakAwalNardi',
  'Nardi': 'bajakAwalNardi',
  'HR EKS MB': 'hrEksMb',
  'SUBSOILER': 'subsoiler',
  'SS1': 'subsoilerSs1',
  'SS2': 'subsoilerSs2',
  'FINISHING ROTARY': 'finishingRotary',
  'Rotary FH1': 'finishingRotaryFh1',
  'ROTARY FH1': 'finishingRotaryFh1',
  'Rotary FH2': 'finishingRotaryFh2',
  'ROTARY FH2': 'finishingRotaryFh2',
  'RIDGER': 'ridger',
  'JALAN & SAL': 'jalanSal',
  'SIAP TANAM': 'siapTanam',
  'PROSES TANAM': 'prosesTanam',
  'SELESAI TANAM': 'selesaiTanam',
};

const DEFAULT_ACTIVITY_MONTHS = [
  // 2021
  'Jan-21', 'Feb-21', 'Mar-21', 'Apr-21', 'Mei-21', 'Jun-21', 'Jul-21', 'Agu-21', 'Sep-21', 'Okt-21', 'Nov-21', 'Des-21',
  // 2022
  'Jan-22', 'Feb-22', 'Mar-22', 'Apr-22', 'Mei-22', 'Jun-22', 'Jul-22', 'Agu-22', 'Sep-22', 'Okt-22', 'Nov-22', 'Des-22',
  // 2023
  'Jan-23', 'Feb-23', 'Mar-23', 'Apr-23', 'Mei-23', 'Jun-23', 'Jul-23', 'Agu-23', 'Sep-23', 'Okt-23', 'Nov-23', 'Des-23',
  // 2024
  'Jan-24', 'Feb-24', 'Mar-24', 'Apr-24', 'Mei-24', 'Jun-24', 'Jul-24', 'Agu-24', 'Sep-24', 'Okt-24', 'Nov-24', 'Des-24',
  // 2025
  'Jan-25', 'Feb-25', 'Mar-25', 'Apr-25', 'Mei-25', 'Jun-25', 'Jul-25', 'Agu-25', 'Sep-25', 'Okt-25', 'Nov-25', 'Des-25',
  // 2026
  'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26',
  // 2027
  'Jan-27', 'Feb-27', 'Mar-27', 'Apr-27', 'Mei-27', 'Jun-27', 'Jul-27', 'Agu-27', 'Sep-27', 'Okt-27', 'Nov-27', 'Des-27',
  // 2028
  'Jan-28', 'Feb-28', 'Mar-28', 'Apr-28', 'Mei-28', 'Jun-28', 'Jul-28', 'Agu-28', 'Sep-28', 'Okt-28', 'Nov-28', 'Des-28',
];

const matchActivityMonth = (dateStr: string | null | undefined, targetMonths: string[]) => {
  if (!dateStr || !targetMonths || targetMonths.length === 0) return false;
  const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
  if (parts.length < 3) return false;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const yearShort = parts[2].slice(-2);
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  if (monthIdx < 0 || monthIdx > 11) return false;
  const mmmYy = `${MONTH_NAMES[monthIdx]}-${yearShort}`;
  return targetMonths.includes(mmmYy);
};

function ScheduleTypeDropdown({
  value,
  onChange,
  className = '',
}: {
  value: 'all' | 'rencana' | 'real';
  onChange: (val: 'all' | 'rencana' | 'real') => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const hasSelection = value !== 'all';

  const options: { key: 'all' | 'rencana' | 'real'; label: string; desc: string }[] = [
    { key: 'all', label: 'Semua', desc: 'Tampilkan Rencana & Real' },
    { key: 'rencana', label: 'Rencana', desc: 'Jadwal rencana' },
    { key: 'real', label: 'Real', desc: 'Realisasi lapangan' },
  ];

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer select-none font-medium shadow-2xs ${
          hasSelection
            ? 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/25'
            : 'bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-slate-400'
        }`}
        title={`Filter Rencana / Real: ${hasSelection ? (value === 'rencana' ? 'Rencana' : 'Real') : 'Semua (Rencana & Real)'}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-xs text-left truncate">
            {hasSelection ? (value === 'rencana' ? 'Rencana' : 'Real') : 'Rencana / Real'}
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

      {isOpen && (
        <div className="absolute top-full mt-1.5 z-50 left-0 w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 text-xs animate-in fade-in zoom-in-95 duration-100 select-none ring-1 ring-black/5 dark:ring-white/10 space-y-1">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Pilih Jadwal</span>
            {hasSelection && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                className="text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          {options.map((opt) => {
            const isSelected = value === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-800'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{opt.desc}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LandTableProps {
  onSelectLand?: (landId: number) => void;
  onEditLand?: (landId: number) => void;
  onDataChanged?: () => void;
  initialSearch?: string;
  onSearchChange?: (search: string) => void;
  selectedWilayah?: string;
  refreshTrigger?: number;
  isAdmin?: boolean;
  selectedPeriod?: string;
  searchQuery?: string;
}

export default function LandTable({
  onSelectLand,
  onEditLand,
  onDataChanged,
  initialSearch = '',
  onSearchChange,
  selectedWilayah = 'ALL',
  refreshTrigger = 0,
  isAdmin: propIsAdmin,
  selectedPeriod,
  searchQuery,
}: LandTableProps) {
  const [lands, setLands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('labita_table_search');
      if (saved !== null && saved !== undefined) return saved;
    }
    return initialSearch || searchQuery || '';
  });
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedWilayahs, setSelectedWilayahs] = useState<string[]>(
    selectedWilayah && selectedWilayah !== 'ALL' ? [selectedWilayah] : []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedJenisBibits, setSelectedJenisBibits] = useState<string[]>([]);
  const [selectedKelasBibits, setSelectedKelasBibits] = useState<string[]>([]);
  const [selectedBulanTanams, setSelectedBulanTanams] = useState<string[]>([]);
  const [selectedAktivitasTerakhirs, setSelectedAktivitasTerakhirs] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activityType, setActivityType] = useState<'all' | 'rencana' | 'real'>('all');
  const [selectedActivityMonths, setSelectedActivityMonths] = useState<string[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const prevSelectedActivitiesRef = useRef<string[]>([]);
  const [highlightedColumn, setHighlightedColumn] = useState<string | null>(null);
  const [page, setPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPage = sessionStorage.getItem('labita_table_page');
      if (savedPage) {
        const p = parseInt(savedPage, 10);
        if (!isNaN(p) && p > 0) return p;
      }
    }
    return 1;
  });
  const [limit, setLimit] = useState(15);
  const [sortBy, setSortBy] = useState('lokasi');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<{
    wilayahs: string[];
    years?: string[];
    defaultYear?: string;
    statuses?: string[];
    jenisBibit: string[];
    kelasBibit: string[];
    bulanTanam: string[];
    activityMonths?: string[];
    aktivitasTerakhir?: string[];
  }>({
    wilayahs: ['ARS1', 'AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07', 'W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'],
    years: ['2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028'],
    defaultYear: '2026',
    statuses: [],
    jenisBibit: [],
    kelasBibit: [],
    bulanTanam: [],
    activityMonths: DEFAULT_ACTIVITY_MONTHS,
    aktivitasTerakhir: [],
  });

  const availableStatusOptions = useMemo(() => {
    const list = filters.statuses && filters.statuses.length > 0 ? filters.statuses : REAL_MASTER_STATUSES;
    const set = new Set<string>(list);
    lands.forEach((l) => {
      if (l.status) {
        const clean = l.status.replace(/\d+/g, '').trim();
        if (clean) set.add(clean);
      }
    });
    return Array.from(set).sort();
  }, [filters.statuses, lands]);

  const selectedActivityKeys = useMemo(
    () => selectedActivities.map((act) => ACTIVITY_LABEL_TO_KEY[act] || act),
    [selectedActivities]
  );

  const hasAnyActiveFilter = useMemo(() => {
    return Boolean(
      search.trim() !== '' ||
      selectedYears.length > 0 ||
      selectedWilayahs.length > 0 ||
      selectedStatuses.length > 0 ||
      selectedJenisBibits.length > 0 ||
      selectedKelasBibits.length > 0 ||
      selectedBulanTanams.length > 0 ||
      selectedAktivitasTerakhirs.length > 0 ||
      selectedActivities.length > 0 ||
      activityType !== 'all' ||
      selectedActivityMonths.length > 0
    );
  }, [
    search,
    selectedYears,
    selectedWilayahs,
    selectedStatuses,
    selectedJenisBibits,
    selectedKelasBibits,
    selectedBulanTanams,
    selectedAktivitasTerakhirs,
    selectedActivities,
    activityType,
    selectedActivityMonths,
  ]);

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedYears.length > 0) {
        params.append('year', selectedYears.join(','));
      } else if (!hasAnyActiveFilter) {
        params.append('year', '2026');
      }
      if (selectedWilayahs.length > 0) params.append('wilayah', selectedWilayahs.join(','));
      if (selectedStatuses.length > 0) params.append('status', selectedStatuses.join(','));
      if (selectedJenisBibits.length > 0) params.append('jenisBibit', selectedJenisBibits.join(','));
      if (selectedKelasBibits.length > 0) params.append('kelasBibit', selectedKelasBibits.join(','));
      if (selectedBulanTanams.length > 0) params.append('bulanTanam', selectedBulanTanams.join(','));
      if (selectedAktivitasTerakhirs.length > 0) params.append('aktivitasTerakhir', selectedAktivitasTerakhirs.join(','));
      if (selectedActivities.length > 0) params.append('activity', selectedActivityKeys.join(','));
      if (activityType && activityType !== 'all') params.append('activityType', activityType);
      if (selectedActivityMonths.length > 0) params.append('activityMonths', selectedActivityMonths.join(','));

      const res = await fetch(`/api/lands/export?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengunduh data');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Lahan_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh file Excel');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (search) {
        sessionStorage.setItem('labita_table_search', search);
      } else {
        sessionStorage.removeItem('labita_table_search');
      }
    }
  }, [search]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('labita_table_page', String(page));
    }
  }, [page]);

  useEffect(() => {
    if (initialSearch !== undefined && initialSearch.trim() !== '' && initialSearch !== search) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  useEffect(() => {
    if (searchQuery !== undefined && searchQuery.trim() !== '' && searchQuery !== search) {
      setSearch(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedWilayah) {
      const list =
        selectedWilayah !== 'ALL'
          ? selectedWilayah.split(',').map((w) => w.trim()).filter(Boolean)
          : [];
      setSelectedWilayahs(list);
      setPage(1);
    }
  }, [selectedWilayah]);

  const fetchLands = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
      sortBy,
      sortOrder,
    });

    if (selectedYears.length > 0) {
      params.append('year', selectedYears.join(','));
    } else if (!hasAnyActiveFilter) {
      params.append('year', '2026');
    }
    if (selectedWilayahs.length > 0) params.append('wilayah', selectedWilayahs.join(','));
    if (selectedStatuses.length > 0) params.append('status', selectedStatuses.join(','));
    if (selectedJenisBibits.length > 0) params.append('jenisBibit', selectedJenisBibits.join(','));
    if (selectedKelasBibits.length > 0) params.append('kelasBibit', selectedKelasBibits.join(','));
    if (selectedBulanTanams.length > 0) params.append('bulanTanam', selectedBulanTanams.join(','));
    if (selectedAktivitasTerakhirs.length > 0) params.append('aktivitasTerakhir', selectedAktivitasTerakhirs.join(','));
    if (selectedActivities.length > 0) params.append('activity', selectedActivityKeys.join(','));
    if (activityType && activityType !== 'all') params.append('activityType', activityType);
    if (selectedActivityMonths.length > 0) params.append('activityMonths', selectedActivityMonths.join(','));

    fetch(`/api/lands?${params.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setLands(res.data);
          setPagination(res.pagination);
          if (res.filters) {
            setFilters(res.filters);
          }
        }
      })
      .catch((err) => console.error('Error fetching lands:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLands();
  }, [
    page,
    limit,
    search,
    selectedYears,
    selectedWilayahs,
    selectedStatuses,
    selectedJenisBibits,
    selectedKelasBibits,
    selectedBulanTanams,
    selectedAktivitasTerakhirs,
    selectedActivities,
    activityType,
    selectedActivityMonths,
    sortBy,
    sortOrder,
    refreshTrigger,
  ]);

  const scrollToActivity = useCallback((activityKey: string) => {
    if (!tableContainerRef.current) return;
    const container = tableContainerRef.current;

    const directId = `col-act-${activityKey}`;
    const mappedId = `col-act-${ACTIVITY_LABEL_TO_KEY[activityKey] || activityKey}`;
    const el = document.getElementById(directId) || document.getElementById(mappedId);

    if (el) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const currentScrollLeft = container.scrollLeft;
      const elVisualLeft = elRect.left - containerRect.left;
      const elAbsoluteLeft = currentScrollLeft + elVisualLeft;

      // Sticky freeze pane width (NO + Wilayah through Aktivitas Terakhir = 782px)
      const STICKY_FREEZE_PANE_WIDTH = 782;
      const targetScrollLeft = Math.max(0, elAbsoluteLeft - STICKY_FREEZE_PANE_WIDTH - 12);

      container.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });

      setHighlightedColumn(activityKey);
      setTimeout(() => {
        setHighlightedColumn((prev) => (prev === activityKey ? null : prev));
      }, 2500);
    }
  }, []);

  useEffect(() => {
    if (selectedActivities.length > 0) {
      const prev = prevSelectedActivitiesRef.current;
      const newlyAdded = selectedActivities.find((act) => !prev.includes(act));
      const targetActivity = newlyAdded || selectedActivities[selectedActivities.length - 1];
      const targetKey = ACTIVITY_LABEL_TO_KEY[targetActivity] || targetActivity;

      const timer = setTimeout(() => {
        scrollToActivity(targetKey);
      }, 100);

      prevSelectedActivitiesRef.current = selectedActivities;
      return () => clearTimeout(timer);
    } else {
      prevSelectedActivitiesRef.current = [];
      setHighlightedColumn(null);
    }
  }, [selectedActivities, scrollToActivity]);

  useEffect(() => {
    if (selectedActivities.length === 0 && selectedActivityMonths.length > 0 && lands.length > 0) {
      let firstMatchedKey: string | null = null;
      for (const land of lands) {
        for (const act of BONGKAR_ACTIVITIES) {
          const actData = land[act.key];
          if (
            actData &&
            (matchActivityMonth(actData.rencana, selectedActivityMonths) ||
             matchActivityMonth(actData.real, selectedActivityMonths))
          ) {
            firstMatchedKey = act.key;
            break;
          }
        }
        if (firstMatchedKey) break;

        for (const f of APLIKASI_FIELDS) {
          if (DUAL_DATE_FIELDS.has(f.key)) {
            const actData = getFieldRencanaReal(land, f.key);
            if (
              actData &&
              (matchActivityMonth(actData.rencana, selectedActivityMonths) ||
                matchActivityMonth(actData.real, selectedActivityMonths))
            ) {
              firstMatchedKey = f.key;
              break;
            }
          } else {
            const val = land[f.key] || land.aplikasiDetails?.[f.key];
            if (matchActivityMonth(val, selectedActivityMonths)) {
              firstMatchedKey = f.key;
              break;
            }
          }
        }
        if (firstMatchedKey) break;
      }

      if (firstMatchedKey) {
        const timer = setTimeout(() => {
          scrollToActivity(firstMatchedKey!);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedActivityMonths, selectedActivities.length, lands, scrollToActivity]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Helper Header Sort Icon (Panah Chevron Up & Down seperti di menu Planting)
  const renderSortArrows = (field: string) => {
    const isFieldActive = sortBy === field;
    return (
      <span className="inline-flex flex-col ml-0.5 shrink-0">
        <span
          role="button"
          tabIndex={0}
          title={field === 'id' ? 'Urutan angka awal 1 (Naik)' : 'Urutkan Naik'}
          onClick={(e) => {
            e.stopPropagation();
            setSortBy(field);
            setSortOrder('asc');
            setPage(1);
          }}
          className="p-0 cursor-pointer"
        >
          <ChevronUp
            className={`w-2.5 h-2.5 -mb-1 transition-colors ${
              isFieldActive && sortOrder === 'asc'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
            }`}
          />
        </span>
        <span
          role="button"
          tabIndex={0}
          title={field === 'id' ? 'Urutan angka paling akhir (Turun)' : 'Urutkan Turun'}
          onClick={(e) => {
            e.stopPropagation();
            setSortBy(field);
            setSortOrder('desc');
            setPage(1);
          }}
          className="p-0 cursor-pointer"
        >
          <ChevronDown
            className={`w-2.5 h-2.5 transition-colors ${
              isFieldActive && sortOrder === 'desc'
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold stroke-[3]'
                : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
            }`}
          />
        </span>
      </span>
    );
  };

  const ACTIVITY_CODE_MAP: Record<string, string> = {
    chopper: '01.CHOPPER',
    chopperLu: '02.CHOPPER_LU',
    rh1: '03.RH1',
    cuttingBanana: '04.CUTTING_BANANA',
    dolomit: '05.DOLOMIT',
    dp1: '06.DP1',
    dpCross: '07.DP_CROSS',
    dp2: '08.DP2',
    belerang: '09.BELERANG',
    kompos: '10.KOMPOS',
    ridger: '21.RIDGER',
  };

  const BONGKAR_ACTIVITIES = [
    { key: 'chopper', label: 'CHOPPER', width: 'w-[140px] min-w-[140px]' },
    { key: 'chopperLu', label: 'CHOPPER LU', width: 'w-[140px] min-w-[140px]' },
    { key: 'rh1', label: 'RH1', width: 'w-[130px] min-w-[130px]' },
    { key: 'cuttingBanana', label: 'CUTTING BANANA', width: 'w-[150px] min-w-[150px]' },
    { key: 'dolomit', label: 'DOLOMIT', width: 'w-[130px] min-w-[130px]' },
    { key: 'dp1', label: 'DP 1', width: 'w-[130px] min-w-[130px]' },
    { key: 'dpCross', label: 'DP CROSS', width: 'w-[140px] min-w-[140px]' },
    { key: 'dp2', label: 'DP 2', width: 'w-[130px] min-w-[130px]' },
    { key: 'belerang', label: 'BELERANG', width: 'w-[130px] min-w-[130px]' },
    { key: 'kompos', label: 'KOMPOS', width: 'w-[130px] min-w-[130px]' },
  ];

  const APLIKASI_FIELDS = [
    { key: 'bajakAwalMb5Btr', width: 'w-[135px] min-w-[135px]' },
    { key: 'bajakAwalMb25', width: 'w-[135px] min-w-[135px]' },
    { key: 'bajakAwalMph', width: 'w-[135px] min-w-[135px]' },
    { key: 'bajakAwalNardi', width: 'w-[135px] min-w-[135px]' },
    { key: 'hrEksMb', width: 'w-[135px] min-w-[135px]' },
    { key: 'subsoilerSs1', width: 'w-[135px] min-w-[135px]' },
    { key: 'subsoilerSs2', width: 'w-[135px] min-w-[135px]' },
    { key: 'finishingRotaryFh1', width: 'w-[135px] min-w-[135px]' },
    { key: 'finishingRotaryFh2', width: 'w-[135px] min-w-[135px]' },
    { key: 'ridger', width: 'w-[140px] min-w-[140px]' },
    { key: 'jalanSal', width: 'w-[140px] min-w-[140px]' },
    { key: 'siapTanam', width: 'w-[130px] min-w-[130px]' },
    { key: 'prosesTanam', width: 'w-[135px] min-w-[135px]' },
    { key: 'selesaiTanam', width: 'w-[135px] min-w-[135px]' },
  ];


  const isColumnVisible = useCallback((_colKey: string): boolean => {
    return true;
  }, []);

  const bongkarVisibleCount = useMemo(() => {
    return BONGKAR_ACTIVITIES.filter((a) => isColumnVisible(a.key)).length;
  }, [isColumnVisible]);

  const bajakAwalVisibleCount = useMemo(() => {
    return ['bajakAwalMb5Btr', 'bajakAwalMb25', 'bajakAwalMph', 'bajakAwalNardi'].filter((k) =>
      isColumnVisible(k)
    ).length;
  }, [isColumnVisible]);

  const subsoilerVisibleCount = useMemo(() => {
    return ['subsoilerSs1', 'subsoilerSs2'].filter((k) => isColumnVisible(k)).length;
  }, [isColumnVisible]);

  const finishingRotaryVisibleCount = useMemo(() => {
    return ['finishingRotaryFh1', 'finishingRotaryFh2'].filter((k) => isColumnVisible(k)).length;
  }, [isColumnVisible]);

  const bajakVisibleCount = useMemo(() => {
    const keys = [
      'bajakAwalMb5Btr',
      'bajakAwalMb25',
      'bajakAwalMph',
      'bajakAwalNardi',
      'hrEksMb',
      'subsoilerSs1',
      'subsoilerSs2',
      'finishingRotaryFh1',
      'finishingRotaryFh2',
      'ridger',
    ];
    return keys.filter((k) => isColumnVisible(k)).length;
  }, [isColumnVisible]);

  const snVisibleCount = useMemo(() => {
    return ['jalanSal', 'siapTanam'].filter((k) => isColumnVisible(k)).length;
  }, [isColumnVisible]);

  const tanamVisibleCount = useMemo(() => {
    return ['prosesTanam', 'selesaiTanam'].filter((k) => isColumnVisible(k)).length;
  }, [isColumnVisible]);

  const hasAnyTier3Subcolumn = useMemo(() => {
    return (
      bajakAwalVisibleCount > 0 ||
      subsoilerVisibleCount > 0 ||
      finishingRotaryVisibleCount > 0
    );
  }, [
    bajakAwalVisibleCount,
    subsoilerVisibleCount,
    finishingRotaryVisibleCount,
  ]);

  const totalVisibleCols = useMemo(() => {
    return 11 + bongkarVisibleCount + bajakVisibleCount + snVisibleCount + tanamVisibleCount;
  }, [bongkarVisibleCount, bajakVisibleCount, snVisibleCount, tanamVisibleCount]);

  const isAnyBongkarSelected = useMemo(() => {
    return BONGKAR_ACTIVITIES.some((act) => selectedActivityKeys.includes(act.key));
  }, [selectedActivityKeys]);

  const isAnyBajakSelected = useMemo(() => {
    return [
      'bajakAwal',
      'bajakAwalMb5Btr',
      'bajakAwalMb25',
      'bajakAwalMph',
      'bajakAwalNardi',
      'hrEksMb',
      'subsoiler',
      'subsoilerSs1',
      'subsoilerSs2',
      'finishingRotary',
      'finishingRotaryFh1',
      'finishingRotaryFh2',
      'rotaryFh2',
      'ridger',
    ].some((k) => selectedActivityKeys.includes(k));
  }, [selectedActivityKeys]);

  const isAnySnSelected = useMemo(() => {
    return ['jalanSal', 'siapTanam'].some((k) => selectedActivityKeys.includes(k));
  }, [selectedActivityKeys]);

  const isAnyTanamSelected = useMemo(() => {
    return ['prosesTanam', 'selesaiTanam'].some((k) => selectedActivityKeys.includes(k));
  }, [selectedActivityKeys]);

  const getActivityHeaderClass = (
    keys: string[],
    baseBgColor: string,
    baseTextColor: string,
    extraClasses: string = ''
  ) => {
    const isSelected = keys.some((k) => selectedActivityKeys.includes(k));
    const isHighlighted = keys.some((k) => highlightedColumn === k);

    if (isSelected) {
      if (isHighlighted) {
        return `bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 font-black shadow-xl ring-4 ring-emerald-400 ring-offset-2 z-30 scale-[1.02] ${extraClasses}`;
      }
      return `bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-md ring-2 ring-emerald-400 ring-inset z-20 ${extraClasses}`;
    }
    return `${baseBgColor} ${baseTextColor} ${extraClasses}`;
  };

  const getTier3HeaderClass = (keys: string[]) => {
    const isSelected = keys.some((k) => selectedActivityKeys.includes(k));
    if (isSelected) {
      return 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black ring-2 ring-emerald-400 ring-inset shadow-xs';
    }
    return 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300';
  };

  const handleUpdateField = async (landId: number, fieldName: string, value: any) => {
    // Optimistic UI update
    setLands((prev) =>
      prev.map((l) => {
        if (l.id !== landId) return l;
        const updated = { ...l, [fieldName]: value };
        return {
          ...updated,
          aktivitasTerakhir: computeAktivitasTerakhir(updated),
        };
      })
    );

    try {
      const res = await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan perubahan');
      }
      const resData = await res.json();
      if (resData.success && resData.data?.aktivitasTerakhir) {
        setLands((prev) =>
          prev.map((l) =>
            l.id === landId
              ? { ...l, aktivitasTerakhir: resData.data.aktivitasTerakhir }
              : l
          )
        );
      }
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error updating field:', err);
      alert(`Gagal memperbarui data: ${err.message}`);
      fetchLands();
    }
  };

  const handleUpdateBibitKelas = async (landId: number, rawValue: string | null) => {
    const { jenisBibit, kelasBibit } = parseBibitKelas(rawValue);
    // Optimistic UI update
    setLands((prev) =>
      prev.map((l) => (l.id === landId ? { ...l, jenisBibit, kelasBibit } : l))
    );

    try {
      const res = await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenisBibit, kelasBibit }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan bibit & kelas');
      }
      const resData = await res.json();
      if (resData.success && resData.data?.aktivitasTerakhir) {
        setLands((prev) =>
          prev.map((l) =>
            l.id === landId
              ? { ...l, aktivitasTerakhir: resData.data.aktivitasTerakhir }
              : l
          )
        );
      }
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error updating bibit & kelas:', err);
      alert(`Gagal memperbarui bibit & kelas: ${err.message}`);
      fetchLands();
    }
  };

  const handleUpdateActivityDate = async (
    landId: number,
    actKey: string,
    type: 'rencana' | 'real',
    dateVal: string | null
  ) => {
    const code = ACTIVITY_CODE_MAP[actKey];
    if (!code) return;

    const cleanDate = dateVal && String(dateVal).trim() !== '' && String(dateVal).trim() !== '-' ? String(dateVal).trim() : null;

    const ACT_KEY_TO_DETAILS: Record<string, { realKey: string; rencKey: string }> = {
      chopper: { realKey: 'realChopper', rencKey: 'chopper' },
      chopperLu: { realKey: 'realChopperLu', rencKey: 'chopperLu' },
      rh1: { realKey: 'realRh1', rencKey: 'rh1' },
      cuttingBanana: { realKey: 'realCuttingBanana', rencKey: 'cuttingBanana' },
      dolomit: { realKey: 'realDolomit', rencKey: 'dolomit' },
      dp1: { realKey: 'realDp1', rencKey: 'dp1' },
      dpCross: { realKey: 'realDpCross', rencKey: 'dpCross' },
      dp2: { realKey: 'realDp2', rencKey: 'dp2' },
      belerang: { realKey: 'realBelerang', rencKey: 'belerang' },
      kompos: { realKey: 'realKompos', rencKey: 'kompos' },
      ridger: { realKey: 'realRidger', rencKey: 'ridger' },
    };
    const detailsInfo = ACT_KEY_TO_DETAILS[actKey];

    // Optimistic UI update
    setLands((prev) =>
      prev.map((l) => {
        if (l.id !== landId) return l;
        const currentAct = l[actKey] || { rencana: null, real: null, status: 'PENDING' };
        const updatedAct = {
          ...currentAct,
          [type]: cleanDate,
          status: type === 'real'
            ? (cleanDate ? 'COMPLETED' : currentAct.rencana ? 'IN_PROGRESS' : 'PENDING')
            : currentAct.status,
        };
        const currentDetails = l.aplikasiDetails || {};
        const updatedDetails = {
          ...currentDetails,
          ...(detailsInfo ? { [type === 'real' ? detailsInfo.realKey : detailsInfo.rencKey]: cleanDate } : {}),
        };
        const updatedLand = {
          ...l,
          [actKey]: updatedAct,
          aplikasiDetails: updatedDetails,
        };
        return {
          ...updatedLand,
          aktivitasTerakhir: computeAktivitasTerakhir(updatedLand),
        };
      })
    );

    try {
      const actPayload = {
        code,
        rencanaDate: type === 'rencana' ? cleanDate : undefined,
        realisasiDate: type === 'real' ? cleanDate : undefined,
      };

      const bodyPayload: any = { activities: [actPayload] };
      if (detailsInfo) {
        bodyPayload.aplikasiDetails = {
          [type === 'real' ? detailsInfo.realKey : detailsInfo.rencKey]: cleanDate,
        };
      }

      const res = await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan tanggal aktivitas');
      }
      const resData = await res.json();
      if (resData.success && resData.data) {
        setLands((prev) =>
          prev.map((l) =>
            l.id === landId
              ? {
                  ...l,
                  ...resData.data,
                  aktivitasTerakhir: resData.data.aktivitasTerakhir || l.aktivitasTerakhir,
                  aplikasiDetails: resData.data.aplikasiDetails || l.aplikasiDetails,
                }
              : l
          )
        );
      }
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error updating activity date:', err);
      alert(`Gagal memperbarui tanggal aktivitas: ${err.message}`);
      fetchLands();
    }
  };

  const handleUpdatePengolahanRencReal = async (
    landId: number,
    fieldKey: string,
    type: 'rencana' | 'real',
    dateVal: string | null
  ) => {
    const cleanDate = dateVal && String(dateVal).trim() !== '' && String(dateVal).trim() !== '-' ? String(dateVal).trim() : null;

    let detailsProp = fieldKey;
    if (type === 'real') {
      const realPropMap: Record<string, string> = {
        bajakAwalMb5Btr: 'realBajakAwalMb5Btr',
        bajakAwalMb25: 'realBajakAwalMb25',
        bajakAwalMph: 'realBajakAwalHoward',
        bajakAwalNardi: 'realBajakAwalNardi',
        hrEksMb: 'realHrEksMb',
        subsoilerSs1: 'realSubsoilerSs1',
        subsoilerSs2: 'realSubsoilerSs2',
        finishingRotaryFh1: 'realFinishingRotaryFh1',
        finishingRotaryFh2: 'realRotaryFh2',
        ridger: 'realRidger',
        jalanSal: 'realJalanSal',
      };
      detailsProp = realPropMap[fieldKey] || `real${fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)}`;
    } else {
      if (fieldKey === 'bajakAwalMb5Btr') {
        detailsProp = 'rencAwalMb5Btr';
      }
    }

    const actCodeMap: Record<string, string> = {
      bajakAwalMb5Btr: '11.BAJAK_AWAL',
      bajakAwalMb25: '11.BAJAK_AWAL',
      bajakAwalMph: '11.BAJAK_AWAL',
      bajakAwalNardi: '11.BAJAK_AWAL',
      hrEksMb: '11.BAJAK_AWAL',
      subsoilerSs1: '17.SUBSOILER',
      subsoilerSs2: '17.SUBSOILER',
      finishingRotaryFh1: '19.FINISHING_ROTARY',
      finishingRotaryFh2: '20.ROTARY_FH2',
      ridger: '21.RIDGER',
      jalanSal: '22.JALAN_SAL',
    };

    setLands((prev) =>
      prev.map((l) => {
        if (l.id !== landId) return l;
        const currentDetails = l.aplikasiDetails || {};
        const updatedDetails = {
          ...currentDetails,
          [detailsProp]: cleanDate,
        };

        let nextRealBajak = l.realBajak;
        if (type === 'real' && (fieldKey.startsWith('bajakAwal') || fieldKey === 'hrEksMb')) {
          if (cleanDate) {
            nextRealBajak = cleanDate;
          } else {
            const hasOtherBajak = [
              'realBajakAwalMb5Btr',
              'realBajakAwalMb25',
              'realBajakAwalHoward',
              'realBajakAwalNardi',
              'realHrEksMb',
            ].some((k) => k !== detailsProp && isValidDate(updatedDetails[k]));
            nextRealBajak = hasOtherBajak ? nextRealBajak : null;
          }
        }

        const updatedLand: any = {
          ...l,
          [detailsProp]: cleanDate,
          aplikasiDetails: updatedDetails,
          ...(type === 'real' && (fieldKey.startsWith('bajakAwal') || fieldKey === 'hrEksMb')
            ? { realBajak: nextRealBajak }
            : {}),
        };

        if (fieldKey === 'ridger') {
          updatedLand.ridger = {
            ...(typeof l.ridger === 'object' && l.ridger !== null ? l.ridger : {}),
            [type]: cleanDate,
          };
          if (type === 'real') updatedLand.realRidger = cleanDate;
        } else if (fieldKey === 'jalanSal') {
          updatedLand.jalanSal = {
            ...(typeof l.jalanSal === 'object' && l.jalanSal !== null ? l.jalanSal : {}),
            [type]: cleanDate,
          };
          if (type === 'real') updatedLand.realJalanSal = cleanDate;
        }

        return {
          ...updatedLand,
          aktivitasTerakhir: computeAktivitasTerakhir(updatedLand),
        };
      })
    );

    try {
      const bodyPayload: any = {
        aplikasiDetails: {
          [detailsProp]: cleanDate,
        },
      };

      const actCode = actCodeMap[fieldKey];
      if (actCode) {
        bodyPayload.activities = [
          {
            code: actCode,
            rencanaDate: type === 'rencana' ? cleanDate : undefined,
            realisasiDate: type === 'real' ? cleanDate : undefined,
          },
        ];
      }

      if (type === 'real' && (fieldKey.startsWith('bajakAwal') || fieldKey === 'hrEksMb')) {
        const hasOtherBajak = [
          'realBajakAwalMb5Btr',
          'realBajakAwalMb25',
          'realBajakAwalHoward',
          'realBajakAwalNardi',
          'realHrEksMb',
        ].some((k) => k !== detailsProp && isValidDate((lands.find((l) => l.id === landId)?.aplikasiDetails || {})[k]));
        bodyPayload.realBajak = cleanDate || (hasOtherBajak ? lands.find((l) => l.id === landId)?.realBajak : null);
      }

      const res = await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan tanggal');
      }
      const resData = await res.json();
      if (resData.success && resData.data) {
        setLands((prev) =>
          prev.map((l) => {
            if (l.id !== landId) return l;
            return {
              ...l,
              ...resData.data,
              aktivitasTerakhir: resData.data.aktivitasTerakhir || l.aktivitasTerakhir,
              aplikasiDetails: resData.data.aplikasiDetails || l.aplikasiDetails,
            };
          })
        );
      }
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error updating pengolahan date:', err);
      alert(`Gagal memperbarui tanggal: ${err.message}`);
      fetchLands();
    }
  };

  const handleUpdatePengolahan = async (
    landId: number,
    fieldKey: string,
    dateVal: string | null
  ) => {
    const cleanDate = dateVal && String(dateVal).trim() !== '' && String(dateVal).trim() !== '-' ? String(dateVal).trim() : null;

    // Optimistic UI update
    setLands((prev) =>
      prev.map((l) => {
        if (l.id !== landId) return l;
        const currentDetails = l.aplikasiDetails || {};
        const updatedDetails = {
          ...currentDetails,
          [fieldKey]: cleanDate,
          ...(fieldKey === 'prosesTanam' ? { realMulaiTanam: cleanDate } : {}),
          ...(fieldKey === 'selesaiTanam' ? { realSelesaiTanam: cleanDate } : {}),
          ...(fieldKey === 'siapTanam' ? { realSiapTanam: cleanDate } : {}),
        };
        const nextRealMulai = fieldKey === 'prosesTanam' ? cleanDate : l.realMulaiTanam;
        const nextRealSelesai = fieldKey === 'selesaiTanam' ? cleanDate : l.realSelesaiTanam;
        const hasRealSelesai = isValidDate(nextRealSelesai);
        const hasRealMulai = isValidDate(nextRealMulai);

        const updatedLand = {
          ...l,
          [fieldKey]: cleanDate,
          ...(fieldKey === 'prosesTanam' ? { realMulaiTanam: cleanDate } : {}),
          ...(fieldKey === 'selesaiTanam' ? { realSelesaiTanam: cleanDate } : {}),
          aplikasiDetails: updatedDetails,
          progressTanam: hasRealSelesai ? 100 : (hasRealMulai ? 50 : 0),
        };
        return {
          ...updatedLand,
          aktivitasTerakhir: computeAktivitasTerakhir(updatedLand),
        };
      })
    );

    try {
      const bodyPayload: any = {
        aplikasiDetails: {
          [fieldKey]: cleanDate,
        },
      };

      const currentL = lands.find((l) => l.id === landId);
      if (fieldKey === 'prosesTanam') {
        bodyPayload.realMulaiTanam = cleanDate;
        bodyPayload.activities = [{ code: '23.PROSES_TNM', realisasiDate: cleanDate }];
        bodyPayload.progressTanam = cleanDate ? 50 : 0;
      } else if (fieldKey === 'selesaiTanam') {
        bodyPayload.realSelesaiTanam = cleanDate;
        bodyPayload.activities = [{ code: '24.SLS_TANAM', realisasiDate: cleanDate }];
        bodyPayload.progressTanam = cleanDate ? 100 : (isValidDate(currentL?.realMulaiTanam) ? 50 : 0);
      } else if (fieldKey === 'jalanSal') {
        bodyPayload.activities = [{ code: '22.JALAN_SAL', realisasiDate: cleanDate }];
      } else if (fieldKey === 'siapTanam') {
        bodyPayload.activities = [{ code: '22.SIAP_TANAM', realisasiDate: cleanDate }];
        bodyPayload.aplikasiDetails.realSiapTanam = cleanDate;
      }

      const res = await fetch(`/api/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan tanggal pengolahan');
      }
      const resData = await res.json();
      if (resData.success && resData.data) {
        setLands((prev) =>
          prev.map((l) =>
            l.id === landId
              ? {
                  ...l,
                  ...resData.data,
                  aktivitasTerakhir: resData.data.aktivitasTerakhir || l.aktivitasTerakhir,
                  aplikasiDetails: resData.data.aplikasiDetails || l.aplikasiDetails,
                  progressTanam: resData.data.progressTanam ?? l.progressTanam,
                }
              : l
          )
        );
      }
      onDataChanged?.();
    } catch (err: any) {
      console.error('Error updating pengolahan date:', err);
      alert(`Gagal memperbarui data pengolahan: ${err.message}`);
      fetchLands();
    }
  };



  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-visible glass-panel flex flex-col shadow-xs transition-colors">
      {/* Header Controls & Multi-Filter Bar (Bab 20 PRD) */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4 relative z-30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Data Lahan & Rencana vs Realisasi Aktivitas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Menampilkan {pagination.total.toLocaleString()} lokasi lahan terdaftar dengan rincian jadwal aktivitas awal
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {/* Search box inside table */}
            <div className="relative w-full sm:w-64 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Cari lokasi"
                value={search}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearch(val);
                  onSearchChange?.(val);
                  setPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    onSearchChange?.('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 flex items-center justify-center z-10"
                  title="Hapus pencarian"
                  aria-label="Hapus pencarian"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Download Excel Button */}
            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm"
              title="Download Data Lahan ke Excel (.xlsx)"
            >
              <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? 'Mengunduh...' : 'Download Excel'}</span>
            </button>
          </div>
        </div>

        {/* Box Filter Khusus Aktivitas & Bulan (Menyamping & Checklist) */}
        <div className="rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-cyan-50/40 dark:from-emerald-950/30 dark:via-slate-900/80 dark:to-cyan-950/20 p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Filter Aktivitas & Bulan Aktivitas
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih opsi aktivitas, jadwal (Rencana/Real), dan bulan aktivitas
              </p>
            </div>
          </div>

          {/* Baris Filter Menyamping (Horizontal Inline Row) */}
          <div className="flex items-center flex-wrap gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
            {/* 1. Aktivitas (Dropdown Checklist Menyamping dengan Pengelompokan BK, BJK, SN, Tanam) */}
            <MultiSelectDropdown
              label="Aktivitas"
              options={ACTIVITY_OPTIONS}
              groups={ACTIVITY_GROUPS}
              selected={selectedActivities}
              preserveOrder
              onChange={(val) => {
                setSelectedActivities(val);
                setPage(1);
              }}
              placeholder="Cari aktivitas..."
            />

            {/* 2. Rencana / Real (Dropdown) */}
            <ScheduleTypeDropdown
              value={activityType}
              onChange={(val) => {
                setActivityType(val);
                setPage(1);
              }}
            />

            {/* 3. Bulan Aktivitas (Dropdown Checklist Range Menyamping) */}
            <MultiSelectDropdown
              label="Bulan Aktivitas"
              isMonthFilter
              placeholder="Pilih rentang bulan..."
              options={filters.activityMonths && filters.activityMonths.length > 0 ? filters.activityMonths : DEFAULT_ACTIVITY_MONTHS}
              selected={selectedActivityMonths}
              align="left"
              onChange={(val) => {
                setSelectedActivityMonths(val);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Filter Pill Row with 5 Minimum Filters (Bab 20 PRD: Wilayah, Status, Bibit, Kelas, Bulan Tanam) */}
        <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 relative z-20">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Filter Lainnya:</span>
          </div>

          {/* 0. Tahun Filter (Default: 2026, Pilihan: 2021 sampai 2028) */}
          <MultiSelectDropdown
            label="Tahun"
            options={filters.years && filters.years.length > 0 ? filters.years : ['2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028']}
            selected={selectedYears}
            onChange={(val) => {
              setSelectedYears(val);
              setPage(1);
            }}
          />

          {/* 1. Wilayah Filter */}
          <MultiSelectDropdown
            label="Wilayah"
            options={
              filters.wilayahs && filters.wilayahs.length > 0
                ? filters.wilayahs
                : [
                    'ARS1',
                    'AW01',
                    'AW02',
                    'AW03',
                    'AW04',
                    'AW05',
                    'AW06',
                    'AW07',
                    'W01',
                    'W02',
                    'W03',
                    'W04',
                    'W05',
                    'W06',
                    'W07',
                  ]
            }
            selected={selectedWilayahs}
            onChange={(val) => {
              setSelectedWilayahs(val);
              setPage(1);
            }}
          />

          {/* 2. Status Filter */}
          <MultiSelectDropdown
            label="Status"
            options={availableStatusOptions}
            selected={selectedStatuses}
            onChange={(val) => {
              setSelectedStatuses(val);
              setPage(1);
            }}
          />

          {/* 3. Jenis Bibit Filter */}
          <MultiSelectDropdown
            label="Bibit"
            options={(filters.jenisBibit || []).filter((b) => b && b !== '0' && b !== '-')}
            selected={selectedJenisBibits}
            onChange={(val) => {
              setSelectedJenisBibits(val);
              setPage(1);
            }}
          />

          {/* 4. Kelas Bibit Filter */}
          <MultiSelectDropdown
            label="Kelas"
            options={(filters.kelasBibit || []).filter((k) => k && k !== '0' && k !== '-')}
            selected={selectedKelasBibits}
            align="right"
            onChange={(val) => {
              setSelectedKelasBibits(val);
              setPage(1);
            }}
          />

          {/* 5. Bulan Tanam Filter (Specialized: Bongkar, Bajak, SN, Tanam) */}
          <MultiSelectDropdown
            label="Bulan Tanam"
            isMonthFilter
            options={(filters.bulanTanam || []).filter(
              (m) => m && !m.endsWith('-14') && !m.includes('2014') && !m.includes('1900')
            )}
            selected={selectedBulanTanams}
            align="right"
            onChange={(val) => {
              setSelectedBulanTanams(val);
              setPage(1);
            }}
          />
        </div>

        {/* Baris Data Terpilih Diperlihatkan Lebih Rapi & Sejajar Kanan-Kiri */}
        {(selectedYears.length > 0 ||
          selectedWilayahs.length > 0 ||
          selectedStatuses.length > 0 ||
          selectedJenisBibits.length > 0 ||
          selectedKelasBibits.length > 0 ||
          selectedBulanTanams.length > 0 ||
          selectedActivities.length > 0 ||
          activityType !== 'all' ||
          selectedActivityMonths.length > 0) && (
          <div className="pt-2.5 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800/80 space-y-2 animate-in fade-in duration-150">
            {/* Header: Label Data Difilter di kiri & Reset sejajar di sebelah kanan */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 leading-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Data Difilter:</span>
                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                  ({selectedYears.length +
                    selectedWilayahs.length +
                    selectedStatuses.length +
                    selectedJenisBibits.length +
                    selectedKelasBibits.length +
                    selectedBulanTanams.length +
                    selectedActivities.length +
                    (activityType !== 'all' ? 1 : 0) +
                    selectedActivityMonths.length}{' '}
                  filter aktif)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedYears([]);
                  setSelectedWilayahs([]);
                  setSelectedStatuses([]);
                  setSelectedJenisBibits([]);
                  setSelectedKelasBibits([]);
                  setSelectedBulanTanams([]);
                  setSelectedActivities([]);
                  setActivityType('all');
                  setSelectedActivityMonths([]);
                  setSearch('');
                  onSearchChange?.('');
                  setPage(1);
                }}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 underline underline-offset-2 cursor-pointer transition-colors leading-none inline-flex items-center"
                title="Hapus semua filter"
              >
                Reset
              </button>
            </div>

            {/* Grid Badges: Pilihan data yang difilter */}
            <div className="flex items-center flex-wrap gap-1.5 w-full">
              {/* Activity badges */}
              {selectedActivities.map((act) => (
                <span
                  key={`act-${act}`}
                  onClick={() => {
                    const key = ACTIVITY_LABEL_TO_KEY[act] || act;
                    scrollToActivity(key);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-2xs cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
                  title={`Klik untuk scroll ke kolom ${act}`}
                >
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                    {getActivityGroupBadge(act) ? `Akt (${getActivityGroupBadge(act)}):` : 'Aktivitas:'}
                  </span>
                  <span className="font-semibold">{act}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedActivities((prev) => prev.filter((item) => item !== act));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                    title={`Hapus filter Aktivitas ${act}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Activity schedule type badge */}
              {activityType !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Jadwal:</span>
                  <span className="font-semibold">{activityType === 'rencana' ? 'Rencana' : 'Real'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActivityType('all');
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                    title="Hapus filter Jadwal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Activity Months badges */}
              {selectedActivityMonths.map((m) => (
                <span
                  key={`actmonth-${m}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 shadow-2xs"
                >
                  <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400">Bulan Akt:</span>
                  <span className="font-semibold">{m}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedActivityMonths((prev) => prev.filter((item) => item !== m));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-teal-700 dark:text-teal-300 transition-colors cursor-pointer"
                    title={`Hapus filter Bulan ${m}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Tahun badges */}
              {selectedYears.map((yr) => (
                <span
                  key={`yr-${yr}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-2xs transition-all hover:bg-amber-100 dark:hover:bg-amber-900/60"
                >
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Tahun:</span>
                  <span className="font-semibold">{yr}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYears((prev) => prev.filter((item) => item !== yr));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                    title={`Hapus filter Tahun ${yr}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Wilayah badges */}
              {selectedWilayahs.map((w) => (
                <span
                  key={`wil-${w}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-2xs transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                >
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Wilayah:</span>
                  <span className="font-semibold">{w}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWilayahs((prev) => prev.filter((item) => item !== w));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                    title={`Hapus filter Wilayah ${w}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Status badges */}
              {selectedStatuses.map((s) => (
                <span
                  key={`stat-${s}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 shadow-2xs transition-all hover:bg-cyan-100 dark:hover:bg-cyan-900/60"
                >
                  <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400">Status:</span>
                  <span className="font-semibold">{s}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStatuses((prev) => prev.filter((item) => item !== s));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-cyan-700 dark:text-cyan-300 transition-colors cursor-pointer"
                    title={`Hapus filter Status ${s}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Bibit badges */}
              {selectedJenisBibits.map((b) => (
                <span
                  key={`bib-${b}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 shadow-2xs transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                >
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Bibit:</span>
                  <span className="font-semibold">{b}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJenisBibits((prev) => prev.filter((item) => item !== b));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
                    title={`Hapus filter Bibit ${b}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Kelas badges */}
              {selectedKelasBibits.map((k) => (
                <span
                  key={`kls-${k}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 shadow-2xs transition-all hover:bg-purple-100 dark:hover:bg-purple-900/60"
                >
                  <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Kelas:</span>
                  <span className="font-semibold">{k}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKelasBibits((prev) => prev.filter((item) => item !== k));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-purple-700 dark:text-purple-300 transition-colors cursor-pointer"
                    title={`Hapus filter Kelas ${k}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Bulan Tanam badges */}
              {selectedBulanTanams.map((m) => (
                <span
                  key={`bln-${m}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-2xs transition-all hover:bg-amber-100 dark:hover:bg-amber-900/60"
                >
                  <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Bulan:</span>
                  <span className="font-semibold">{m}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBulanTanams((prev) => prev.filter((item) => item !== m));
                      setPage(1);
                    }}
                    className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                    title={`Hapus filter Bulan ${m}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

            </div>
          </div>
        )}
      </div>

      {/* Table Data with Grouped Header (Bab 18 & 19 PRD + Revisi Aplikasi) - Freeze Panes from Wilayah to Selesai Tanam */}
      <div
        ref={tableContainerRef}
        className="overflow-auto scroll-smooth max-h-[calc(100vh-325px)] min-h-[420px]"
      >
        <table className="min-w-full text-left text-xs border-separate border-spacing-0">
          <colgroup>
            <col className="w-[50px] min-w-[50px] max-w-[50px]" />
            <col className="w-[54px] min-w-[54px] max-w-[54px]" />
            <col className="w-[68px] min-w-[68px] max-w-[68px]" />
            <col className="w-[60px] min-w-[60px] max-w-[60px]" />
            <col className="w-[60px] min-w-[60px] max-w-[60px]" />
            <col className="w-[66px] min-w-[66px] max-w-[66px]" />
            <col className="w-[52px] min-w-[52px] max-w-[52px]" />
            <col className="w-[70px] min-w-[70px] max-w-[70px]" />
            <col className="w-[108px] min-w-[108px] max-w-[108px]" />
            <col className="w-[80px] min-w-[80px] max-w-[80px]" />
            <col className="w-[114px] min-w-[114px] max-w-[114px]" />
          </colgroup>
          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider shadow-sm">
            {/* Header Tier 1: Main Category Groups */}
            <tr className="text-[10px] bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400">
              {/* NO */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('id')}
                className="sticky left-0 z-30 w-[50px] min-w-[50px] max-w-[50px] overflow-hidden py-2 px-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 align-middle border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 text-center font-bold text-[10px]"
                title="Urutkan No"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>NO</span>
                  {renderSortArrows('id')}
                </div>
              </th>

              {/* WILAYAH */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('wilayah')}
                className="sticky left-[50px] z-30 w-[54px] min-w-[54px] max-w-[54px] overflow-hidden py-2 px-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 align-middle border-l border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 text-center font-bold text-[10px]"
                title="Urutkan Wilayah"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>WIL</span>
                  {renderSortArrows('wilayah')}
                </div>
              </th>

              {/* LOKASI */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('lokasi')}
                className="sticky left-[104px] z-30 w-[68px] min-w-[68px] max-w-[68px] overflow-hidden py-2 px-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 align-middle border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 text-center font-bold text-[10px]"
                title="Urutkan Lokasi"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>LOKASI</span>
                  {renderSortArrows('lokasi')}
                </div>
              </th>

              {/* Grouped Header: LUAS */}
              <th
                colSpan={2}
                className="sticky left-[172px] z-30 w-[120px] min-w-[120px] max-w-[120px] overflow-hidden py-1 px-1 text-center font-bold border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 text-[10px]"
              >
                LUAS
              </th>

              {/* STS */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('status')}
                className="sticky left-[292px] z-30 w-[66px] min-w-[66px] max-w-[66px] overflow-hidden py-2 px-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 text-center align-middle border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 font-bold text-[10px]"
                title="Urutkan Status"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>STS</span>
                  {renderSortArrows('status')}
                </div>
              </th>

              {/* Eks */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('eks')}
                className="sticky left-[358px] z-30 w-[52px] min-w-[52px] max-w-[52px] overflow-hidden py-2 px-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 text-center align-middle border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 font-bold normal-case text-[10px]"
                title="Urutkan Eks"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>Eks</span>
                  {renderSortArrows('eks')}
                </div>
              </th>

              {/* Sejarah PS */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('sejarah')}
                className="sticky left-[410px] z-30 w-[70px] min-w-[70px] max-w-[70px] overflow-hidden py-2 px-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 text-center align-middle border-l border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 font-bold normal-case text-[9.5px]"
                title="Urutkan Sejarah PS"
              >
                <div className="flex items-center justify-center gap-1">
                  <div className="flex flex-col items-center justify-center leading-tight text-center">
                    <span className="whitespace-nowrap">Sejarah</span>
                    <span className="whitespace-nowrap">PS</span>
                  </div>
                  {renderSortArrows('sejarah')}
                </div>
              </th>

              {/* Sampingnya: Bibit & Kelas, Bulan Tanam, Aktivitas Terakhir */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('jenisBibit')}
                className="sticky left-[480px] z-30 w-[108px] min-w-[108px] max-w-[108px] overflow-hidden py-2 px-1 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 align-middle border-r border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-center font-bold text-[9px] tracking-tight"
                title="Urutkan Bibit & Kelas"
              >
                <div className="flex items-center justify-center gap-1 leading-tight">
                  <span className="whitespace-nowrap">Bibit & Kelas</span>
                  {renderSortArrows('jenisBibit')}
                </div>
              </th>
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('bulanTanam')}
                className="sticky left-[588px] z-30 w-[80px] min-w-[80px] max-w-[80px] overflow-hidden py-2 px-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 align-middle border-r border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-center font-bold text-[9.5px]"
                title="Urutkan Bulan Tanam"
              >
                <div className="flex items-center justify-center gap-1">
                  <div className="flex flex-col items-center justify-center leading-tight text-center">
                    <span className="whitespace-nowrap">Bulan</span>
                    <span className="whitespace-nowrap">Tanam</span>
                  </div>
                  {renderSortArrows('bulanTanam')}
                </div>
              </th>
              <th
                rowSpan={hasAnyTier3Subcolumn ? 3 : 2}
                onClick={() => handleSort('aktivitasTerakhir')}
                className="sticky left-[668px] z-30 w-[114px] min-w-[114px] max-w-[114px] overflow-hidden py-2 px-1 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 border-r-2 border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 text-teal-700 dark:text-teal-400 align-middle text-center font-bold text-[9.5px] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.4)]"
                title="Urutkan Aktivitas Terakhir"
              >
                <div className="flex items-center justify-center gap-1">
                  <div className="flex flex-col items-center justify-center leading-tight text-center">
                    <span className="whitespace-nowrap">Aktivitas</span>
                    <span className="whitespace-nowrap">Terakhir</span>
                  </div>
                  {renderSortArrows('aktivitasTerakhir')}
                </div>
              </th>

              {/* Tier 1 Group: BONGKAR (Chopper s/d Kompos) */}
              {bongkarVisibleCount > 0 && (
                <th
                  colSpan={bongkarVisibleCount}
                  className={`py-1.5 px-2 text-center border-b border-slate-400 dark:border-slate-600 font-bold tracking-widest uppercase transition-colors ${
                    isAnyBongkarSelected
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-xs'
                      : 'bg-slate-200/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200'
                  } ${
                    bajakVisibleCount > 0 || snVisibleCount > 0 || tanamVisibleCount > 0 ? 'border-r-2' : ''
                  }`}
                >
                  Bongkar
                </th>
              )}

              {/* Tier 1 Group: BAJAK (Bajak Awal s/d Ridger) */}
              {bajakVisibleCount > 0 && (
                <th
                  colSpan={bajakVisibleCount}
                  className={`py-1.5 px-2 text-center border-b border-slate-400 dark:border-slate-600 font-bold tracking-widest uppercase transition-colors ${
                    isAnyBajakSelected
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-xs'
                      : 'bg-cyan-100 dark:bg-cyan-950/70 text-cyan-900 dark:text-cyan-300'
                  } ${
                    snVisibleCount > 0 || tanamVisibleCount > 0 ? 'border-r-2' : ''
                  }`}
                >
                  Bajak
                </th>
              )}

              {/* Tier 1 Group: SN (Jalan & Sal dan Siap Tanam) */}
              {snVisibleCount > 0 && (
                <th
                  colSpan={snVisibleCount}
                  className={`py-1.5 px-2 text-center border-b border-slate-400 dark:border-slate-600 font-bold tracking-widest uppercase transition-colors ${
                    isAnySnSelected
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-xs'
                      : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300'
                  } ${
                    tanamVisibleCount > 0 ? 'border-r-2' : ''
                  }`}
                >
                  SN
                </th>
              )}

              {/* Tier 1 Group: Tanam (Proses Tanam dan Selesai Tanam) */}
              {tanamVisibleCount > 0 && (
                <th
                  colSpan={tanamVisibleCount}
                  className={`py-1.5 px-2 text-center border-b border-slate-400 dark:border-slate-600 font-bold tracking-widest uppercase transition-colors ${
                    isAnyTanamSelected
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-xs'
                      : 'bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300'
                  }`}
                >
                  Tanam
                </th>
              )}
            </tr>

            {/* Header Tier 2: Sub-groups / Activity Names */}
            <tr className="text-[10px] bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400">
              {/* Subcolumns for LUAS: BRUTO & NETTO */}
              <th
                rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                onClick={() => handleSort('luasBruto')}
                className="sticky left-[172px] z-30 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden py-1.5 px-0.5 text-center cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 align-middle border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 font-bold text-[9px]"
                title="Urutkan Luas Bruto"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>BRUTO</span>
                  {renderSortArrows('luasBruto')}
                </div>
              </th>
              <th
                rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                onClick={() => handleSort('luasNetto')}
                className="sticky left-[232px] z-30 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden py-1.5 px-0.5 text-center cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 align-middle border-l border-r border-b border-cyan-300 dark:border-cyan-800 bg-cyan-100 dark:bg-cyan-950 text-cyan-950 dark:text-cyan-100 font-bold text-[9px]"
                title="Urutkan Luas Netto"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>NETTO</span>
                  {renderSortArrows('luasNetto')}
                </div>
              </th>

              {/* 10 Aktivitas Bongkar dari Chopper s/d Kompos */}
              {BONGKAR_ACTIVITIES
                .filter((act) => isColumnVisible(act.key))
                .map((act, idx, arr) => {
                  const isSelected = selectedActivityKeys.includes(act.key);
                  const isHighlighted = highlightedColumn === act.key;
                  const isLastBongkar = idx === arr.length - 1;
                  return (
                    <th
                      key={act.key}
                      id={`col-act-${act.key}`}
                      rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                      className={`py-2 px-2 text-center font-bold whitespace-nowrap align-middle uppercase text-[10px] border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ${act.width} ${
                        isLastBongkar && (bajakVisibleCount > 0 || snVisibleCount > 0 || tanamVisibleCount > 0)
                          ? 'border-r-2 border-slate-400 dark:border-slate-600'
                          : 'border-r border-slate-200 dark:border-slate-800'
                      } ${
                        isSelected
                          ? isHighlighted
                            ? 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 font-black shadow-xl ring-4 ring-emerald-400 ring-offset-2 z-30 scale-[1.02]'
                            : 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-black shadow-md ring-2 ring-emerald-400 ring-inset z-20'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                        )}
                        <span>{act.label}</span>
                      </div>
                    </th>
                  );
                })}

              {/* Kolom BAJAK (Bajak Awal s/d Ridger) */}
              {/* 1. BAJAK AWAL with subcolumns */}
              {bajakAwalVisibleCount > 0 && (
                <th
                  id="col-act-bajakAwal"
                  colSpan={bajakAwalVisibleCount}
                  className={`py-1.5 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap transition-all duration-300 ${
                    getActivityHeaderClass(
                      ['bajakAwal', 'bajakAwalMb5Btr', 'bajakAwalMb25', 'bajakAwalMph', 'bajakAwalNardi'],
                      'bg-cyan-50 dark:bg-cyan-950/40',
                      'text-cyan-900 dark:text-cyan-200'
                    )
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {['bajakAwal', 'bajakAwalMb5Btr', 'bajakAwalMb25', 'bajakAwalMph', 'bajakAwalNardi'].some((k) =>
                      selectedActivityKeys.includes(k)
                    ) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>BAJAK AWAL</span>
                  </div>
                </th>
              )}

              {/* 3. HR EKS MB */}
              {isColumnVisible('hrEksMb') && (
                <th
                  id="col-act-hrEksMb"
                  rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                  className={`py-2 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap align-middle w-[135px] min-w-[135px] transition-all duration-300 ${
                    getActivityHeaderClass(['hrEksMb'], 'bg-slate-100 dark:bg-slate-900', 'text-slate-800 dark:text-slate-300')
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {selectedActivityKeys.includes('hrEksMb') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>HR EKS MB</span>
                  </div>
                </th>
              )}

              {/* 4. SUBSOILER with subcolumns */}
              {subsoilerVisibleCount > 0 && (
                <th
                  id="col-act-subsoiler"
                  colSpan={subsoilerVisibleCount}
                  className={`py-1.5 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap transition-all duration-300 ${
                    getActivityHeaderClass(
                      ['subsoiler', 'subsoilerSs1', 'subsoilerSs2'],
                      'bg-cyan-50 dark:bg-cyan-950',
                      'text-cyan-900 dark:text-cyan-200'
                    )
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {['subsoiler', 'subsoilerSs1', 'subsoilerSs2'].some((k) => selectedActivityKeys.includes(k)) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>SUBSOILER</span>
                  </div>
                </th>
              )}

              {/* 5. FINISHING ROTARY with subcolumns */}
              {finishingRotaryVisibleCount > 0 && (
                <th
                  id="col-act-finishingRotary"
                  colSpan={finishingRotaryVisibleCount}
                  className={`py-1.5 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap transition-all duration-300 ${
                    getActivityHeaderClass(
                      ['finishingRotary', 'finishingRotaryFh1', 'finishingRotaryFh2', 'rotaryFh2'],
                      'bg-slate-100 dark:bg-slate-900',
                      'text-cyan-900 dark:text-cyan-200'
                    )
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {['finishingRotary', 'finishingRotaryFh1', 'finishingRotaryFh2', 'rotaryFh2'].some((k) =>
                      selectedActivityKeys.includes(k)
                    ) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>FINISHING ROTARY</span>
                  </div>
                </th>
              )}

              {/* 11. Ridger (Garis Batas Akhir Bajak) */}
              {isColumnVisible('ridger') && (
                <th
                  id="col-act-ridger"
                  rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                  className={`py-2 px-2 text-center border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap align-middle w-[140px] min-w-[140px] transition-all duration-300 ${
                    snVisibleCount > 0 || tanamVisibleCount > 0
                      ? 'border-r-2 border-slate-400 dark:border-slate-600'
                      : 'border-r'
                  } ${
                    getActivityHeaderClass(['ridger'], 'bg-slate-100 dark:bg-slate-900', 'text-slate-800 dark:text-slate-300')
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {selectedActivityKeys.includes('ridger') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>Ridger</span>
                  </div>
                </th>
              )}

              {/* Kolom SN (Jalan & Sal s/d Siap Tanam) */}
              {isColumnVisible('jalanSal') && (
                <th
                  id="col-act-jalanSal"
                  rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                  className={`py-2 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap align-middle uppercase text-[10px] w-[140px] min-w-[140px] transition-all duration-300 ${
                    getActivityHeaderClass(['jalanSal'], 'bg-slate-100 dark:bg-slate-900', 'text-slate-800 dark:text-slate-300')
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {selectedActivityKeys.includes('jalanSal') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>JALAN & SAL</span>
                  </div>
                </th>
              )}
              {isColumnVisible('siapTanam') && (
                <th
                  id="col-act-siapTanam"
                  rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                  className={`py-2 px-2 text-center border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap align-middle uppercase text-[10px] w-[130px] min-w-[130px] transition-all duration-300 ${
                    tanamVisibleCount > 0 ? 'border-r-2 border-slate-400 dark:border-slate-600' : 'border-r'
                  } ${
                    getActivityHeaderClass(['siapTanam'], 'bg-slate-100 dark:bg-slate-900', 'text-slate-800 dark:text-slate-300')
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {selectedActivityKeys.includes('siapTanam') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>SIAP TANAM</span>
                  </div>
                </th>
              )}

              {/* Kolom Tanam (Proses Tanam s/d Selesai Tanam) */}
              {isColumnVisible('prosesTanam') && (
                <th
                  id="col-act-prosesTanam"
                  rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                  className={`py-2 px-2 text-center border-r border-b border-slate-200 dark:border-slate-800 font-bold whitespace-nowrap align-middle uppercase text-[10px] w-[135px] min-w-[135px] transition-all duration-300 ${
                    getActivityHeaderClass(['prosesTanam'], 'bg-slate-100 dark:bg-slate-900', 'text-slate-800 dark:text-slate-300')
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {selectedActivityKeys.includes('prosesTanam') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>PROSES TANAM</span>
                  </div>
                </th>
              )}
              {isColumnVisible('selesaiTanam') && (
                <th
                  id="col-act-selesaiTanam"
                  rowSpan={hasAnyTier3Subcolumn ? 2 : 1}
                  className={`py-2 px-2 text-center border-r border-b border-slate-400 dark:border-slate-600 font-bold whitespace-nowrap align-middle uppercase text-[10px] w-[135px] min-w-[135px] transition-all duration-300 ${
                    getActivityHeaderClass(['selesaiTanam'], 'bg-slate-100 dark:bg-slate-900', 'text-slate-800 dark:text-slate-200')
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {selectedActivityKeys.includes('selesaiTanam') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 animate-pulse shrink-0" />
                    )}
                    <span>SELESAI TANAM</span>
                  </div>
                </th>
              )}
            </tr>

            {/* Header Tier 3: Subcolumns (Bajak Subcolumn names) */}
            {hasAnyTier3Subcolumn && (
              <tr className="text-[9px] bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400">
                {/* Under BAJAK AWAL: MB 5 BTR, MB 2.5, MPH, Nardi */}
                {isColumnVisible('bajakAwalMb5Btr') && (
                  <th id="col-act-bajakAwalMb5Btr" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['bajakAwalMb5Btr', 'bajakAwal'])}`}>MB 5 BTR</th>
                )}
                {isColumnVisible('bajakAwalMb25') && (
                  <th id="col-act-bajakAwalMb25" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['bajakAwalMb25', 'bajakAwal'])}`}>MB 2.5</th>
                )}
                {isColumnVisible('bajakAwalMph') && (
                  <th id="col-act-bajakAwalMph" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['bajakAwalMph', 'bajakAwal'])}`}>MPH</th>
                )}
                {isColumnVisible('bajakAwalNardi') && (
                  <th id="col-act-bajakAwalNardi" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['bajakAwalNardi', 'bajakAwal'])}`}>Nardi</th>
                )}

                {/* Under SUBSOILER: SS1, SS2 */}
                {isColumnVisible('subsoilerSs1') && (
                  <th id="col-act-subsoilerSs1" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['subsoilerSs1', 'subsoiler'])}`}>SS1</th>
                )}
                {isColumnVisible('subsoilerSs2') && (
                  <th id="col-act-subsoilerSs2" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['subsoilerSs2', 'subsoiler'])}`}>SS2</th>
                )}

                {/* Under FINISHING ROTARY: Rotary FH1, Rotary FH2 */}
                {isColumnVisible('finishingRotaryFh1') && (
                  <th id="col-act-finishingRotaryFh1" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['finishingRotaryFh1', 'finishingRotary'])}`}>Rotary FH1</th>
                )}
                {isColumnVisible('finishingRotaryFh2') && (
                  <th id="col-act-finishingRotaryFh2" className={`py-1 px-1.5 text-center font-medium border-r border-b border-slate-200 dark:border-slate-800/80 whitespace-nowrap w-[135px] min-w-[135px] transition-all duration-300 ${getTier3HeaderClass(['finishingRotaryFh2', 'rotaryFh2', 'finishingRotary'])}`}>Rotary FH2</th>
                )}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
            {loading && lands.length === 0 ? (
              <tr>
                <td colSpan={totalVisibleCols} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Memuat data tabel...</span>
                  </div>
                </td>
              </tr>
            ) : lands.length === 0 ? (
              <tr>
                <td colSpan={totalVisibleCols} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  Tidak ada data lahan yang sesuai dengan kriteria filter.
                </td>
              </tr>
            ) : (
              lands.map((land, idx) => {
                const rowNumber =
                  sortBy === 'id' && sortOrder === 'desc' && pagination.total > 0
                    ? pagination.total - ((page - 1) * limit + idx)
                    : (page - 1) * limit + idx + 1;
                return (
                  <tr
                    key={land.id}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* 0. NO */}
                    <td className="sticky left-0 z-10 w-[50px] min-w-[50px] max-w-[50px] overflow-hidden py-1 px-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500 border-r border-b border-slate-200 dark:border-slate-800/60 text-center align-middle bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                      {rowNumber}
                    </td>

                    {/* 1. Wilayah */}
                    <td className="sticky left-[50px] z-10 w-[54px] min-w-[54px] max-w-[54px] overflow-hidden py-1 px-0.5 font-semibold text-slate-800 dark:text-slate-200 border-l border-r border-b border-slate-200 dark:border-slate-800/60 text-center align-middle bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                      <InlineCell
                        value={land.wilayah}
                        type="select"
                        align="center"
                        options={filters.wilayahs && filters.wilayahs.length > 0 ? filters.wilayahs : ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07']}
                        onSave={(val) => handleUpdateField(land.id, 'wilayah', val)}
                        displayFormatter={(val) => (
                          <span className="bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded text-[9.5px] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold inline-block text-center">
                            {val || '-'}
                          </span>
                        )}
                      />
                    </td>

                    {/* 2. Lokasi (Read-only, fitur edit dihilangkan) */}
                    <td className="sticky left-[104px] z-10 w-[68px] min-w-[68px] max-w-[68px] overflow-hidden py-1 px-0.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wide border-r border-b border-slate-200 dark:border-slate-800/60 text-center align-middle bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors text-[10.5px]">
                      <span className="truncate block" title={land.lokasi}>
                        {land.lokasi || '-'}
                      </span>
                    </td>

                    {/* 3. Bruto */}
                    <td className="sticky left-[172px] z-10 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden py-1 px-0.5 text-center align-middle font-mono text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors text-[10.5px]">
                      <InlineCell
                        value={land.luasBruto}
                        type="number"
                        step="0.01"
                        align="center"
                        textClassName="font-mono text-slate-700 dark:text-slate-300 text-[10.5px] text-center"
                        displayFormatter={(val) => (typeof val === 'number' && val > 0 ? val.toFixed(2) : '-')}
                        onSave={(val) => handleUpdateField(land.id, 'luasBruto', val)}
                      />
                    </td>

                    {/* 4. Netto */}
                    <td className="sticky left-[232px] z-10 w-[60px] min-w-[60px] max-w-[60px] overflow-hidden py-1 px-0.5 text-center align-middle font-bold font-mono text-slate-900 dark:text-slate-100 border-l border-r border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors text-[10.5px]">
                      <InlineCell
                        value={land.luasNetto}
                        type="number"
                        step="0.01"
                        align="center"
                        textClassName="font-bold font-mono text-slate-900 dark:text-slate-100 text-[10.5px] text-center"
                        displayFormatter={(val) => (typeof val === 'number' && val > 0 ? val.toFixed(2) : '-')}
                        onSave={(val) => handleUpdateField(land.id, 'luasNetto', val)}
                      />
                    </td>

                    {/* 5. STS */}
                    <td className="sticky left-[292px] z-10 w-[66px] min-w-[66px] max-w-[66px] overflow-hidden py-1 px-0.5 border-r border-b border-slate-200 dark:border-slate-800/60 text-center align-middle bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                      <InlineCell
                        value={land.status ? land.status.replace(/\d+/g, '').trim() : ''}
                        type="select"
                        align="center"
                        className="!p-0"
                        options={availableStatusOptions}
                        displayFormatter={(val) =>
                          val ? (
                            <span className="bg-cyan-50 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight inline-block text-center whitespace-nowrap">
                              {val}
                            </span>
                          ) : (
                            '-'
                          )
                        }
                        onSave={(val) => handleUpdateField(land.id, 'status', val)}
                      />
                    </td>

                    {/* 6. Eks */}
                    <td className="sticky left-[358px] z-10 w-[52px] min-w-[52px] max-w-[52px] overflow-hidden py-1 px-0.5 text-center align-middle text-slate-700 dark:text-slate-300 border-r border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors text-[10.5px]">
                      <InlineCell
                        value={land.eks}
                        align="center"
                        textClassName="text-slate-700 dark:text-slate-300 text-[10px] text-center"
                        onSave={(val) => handleUpdateField(land.id, 'eks', val)}
                      />
                    </td>

                    {/* 7. Sejarah PS */}
                    <td className="sticky left-[410px] z-10 w-[70px] min-w-[70px] max-w-[70px] overflow-hidden py-1 px-0.5 text-center align-middle text-slate-700 dark:text-slate-300 font-mono text-[9.5px] border-l border-r border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                      <InlineCell
                        value={land.sejarah}
                        align="center"
                        textClassName="text-slate-700 dark:text-slate-300 font-mono text-[9.5px] leading-tight whitespace-normal text-center break-words"
                        onSave={(val) => handleUpdateField(land.id, 'sejarah', val)}
                      />
                    </td>

                    {/* 8. Bibit & Kelas (Single Edit) */}
                    <td className="sticky left-[480px] z-10 w-[108px] min-w-[108px] max-w-[108px] overflow-hidden py-1 px-1 border-r border-b border-slate-200 dark:border-slate-800/60 text-center align-middle bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                      <InlineCell
                        value={land.jenisBibit && land.jenisBibit !== '0' ? `${land.jenisBibit}${land.kelasBibit && land.kelasBibit !== '0' ? ` (${land.kelasBibit})` : ''}` : ''}
                        placeholder="Contoh: TC (Std)"
                        align="center"
                        textClassName="font-medium text-slate-800 dark:text-slate-200 text-[9.5px] leading-tight whitespace-normal text-center"
                        onSave={(val) => handleUpdateBibitKelas(land.id, val ? String(val) : null)}
                        displayFormatter={() =>
                          land.jenisBibit && land.jenisBibit !== '0' ? (
                            <div className="flex flex-col items-center justify-center leading-tight text-center py-0.5" title={`${land.jenisBibit} (${land.kelasBibit && land.kelasBibit !== '0' ? land.kelasBibit : 'Std'})`}>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-[9.5px]">
                                {land.jenisBibit}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 text-[8.5px] font-medium">
                                ({land.kelasBibit && land.kelasBibit !== '0' ? land.kelasBibit : 'Std'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic text-[9.5px]">-</span>
                          )
                        }
                      />
                    </td>

                    {/* 9. Bulan Tanam (Date Picker Month Only) */}
                    <td className="sticky left-[588px] z-10 w-[80px] min-w-[80px] max-w-[80px] overflow-hidden py-1 px-0.5 text-slate-700 dark:text-slate-300 font-mono text-[9.5px] border-r border-b border-slate-200 dark:border-slate-800/60 text-center align-middle bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                      <div onClick={(e) => e.stopPropagation()} className="flex justify-center items-center">
                        <TableDatePicker
                          value={land.bulanTanam}
                          isMonthOnly
                          onChange={(val) => handleUpdateField(land.id, 'bulanTanam', val)}
                        />
                      </div>
                    </td>
                    
                    {/* 10. Aktivitas Terakhir (Freeze Pane batas akhir - Status Read-only) */}
                    <td
                      className="sticky left-[668px] z-10 w-[114px] min-w-[114px] max-w-[114px] overflow-hidden py-1 px-1 border-r-2 border-b border-slate-300 dark:border-slate-700 text-center align-middle bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.4)]"
                    >
                      {land.aktivitasTerakhir ? (
                        <span
                          className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 px-1.5 py-0.5 rounded leading-tight text-[9px] inline-flex flex-col items-center justify-center text-center whitespace-normal max-w-full break-words shadow-xs"
                        >
                          {land.aktivitasTerakhir}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[9.5px] italic">
                          -
                        </span>
                      )}
                    </td>

                    {/* 10 Activities Rencana vs Real (Chopper up to Kompos) */}
                    {BONGKAR_ACTIVITIES.filter((act) => isColumnVisible(act.key)).map((act, idx, arr) => {
                      const actKey = act.key;
                      const rawAct = land[actKey];
                      const actData = (typeof rawAct === 'object' && rawAct !== null)
                        ? rawAct
                        : {
                            rencana: (typeof rawAct === 'string' ? rawAct : null) || land.aplikasiDetails?.[actKey] || null,
                            real: land.aplikasiDetails?.[`real${actKey.charAt(0).toUpperCase() + actKey.slice(1)}`] || null,
                          };
                      const isSelected = selectedActivityKeys.includes(actKey);
                      const isRencanaMatch = selectedActivityMonths.length > 0 && matchActivityMonth(actData.rencana, selectedActivityMonths);
                      const isRealMatch = selectedActivityMonths.length > 0 && matchActivityMonth(actData.real, selectedActivityMonths);

                      const isLastVisibleBongkar = idx === arr.length - 1;
                      const borderClass = isLastVisibleBongkar && (bajakVisibleCount > 0 || snVisibleCount > 0 || tanamVisibleCount > 0)
                        ? 'border-r-2 border-slate-400 dark:border-slate-600'
                        : 'border-r border-slate-200 dark:border-slate-800';

                      return (
                        <td
                          key={actKey}
                          onClick={(e) => e.stopPropagation()}
                          className={`py-1.5 px-2.5 text-center font-mono text-[10px] ${borderClass} border-b border-slate-200 dark:border-slate-800 whitespace-nowrap transition-colors ${act.width} ${
                            isSelected
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-x-2 border-emerald-500 dark:border-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.12)]'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col text-[10px] leading-tight space-y-1">
                            {/* Baris 1: Rencana & Tanggal */}
                            <div className={`flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors ${
                              activityType === 'real' ? 'opacity-75 hover:opacity-100' : ''
                            } ${
                              isRencanaMatch
                                ? 'bg-emerald-300 dark:bg-emerald-700 text-emerald-950 dark:text-white font-bold ring-1.5 ring-emerald-500 shadow-xs'
                                : activityType === 'rencana'
                                ? actData.rencana && actData.rencana !== '-'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-400 dark:border-emerald-500 ring-1.5 ring-emerald-500/40 shadow-xs'
                                  : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-slate-500 dark:text-slate-400 border border-dashed border-emerald-300/60 dark:border-emerald-800/60'
                                : isSelected
                                ? 'bg-emerald-100/90 dark:bg-emerald-900/50 font-semibold border border-emerald-300/60 dark:border-emerald-700/60'
                                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                            }`}>
                              <span className={`text-[9px] font-sans transition-colors ${
                                activityType === 'rencana'
                                  ? 'text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider'
                                  : 'text-slate-500 dark:text-slate-400 font-medium'
                              }`}>
                                Rencana
                              </span>
                              <TableDatePicker
                                value={actData.rencana}
                                onChange={(newDate) => handleUpdateActivityDate(land.id, actKey, 'rencana', newDate)}
                              />
                            </div>

                            {/* Garis Pemisah Antara Rencana dan Real */}
                            <div className="w-full border-t border-slate-200 dark:border-slate-800/80 my-0.5" />

                            {/* Baris 2: Real & Tanggal */}
                            <div className={`flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors ${
                              activityType === 'rencana' ? 'opacity-75 hover:opacity-100' : ''
                            } ${
                              isRealMatch
                                ? 'bg-emerald-300 dark:bg-emerald-700 text-emerald-950 dark:text-white font-bold ring-1.5 ring-emerald-500 shadow-xs'
                                : activityType === 'real'
                                ? actData.real && actData.real !== '-'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-400 dark:border-emerald-500 ring-1.5 ring-emerald-500/40 shadow-xs'
                                  : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-slate-500 dark:text-slate-400 border border-dashed border-emerald-300/60 dark:border-emerald-800/60'
                                : isSelected
                                ? 'bg-emerald-100/90 dark:bg-emerald-900/50 font-semibold border border-emerald-300/60 dark:border-emerald-700/60'
                                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                            }`}>
                              <span className={`text-[9px] font-sans transition-colors ${
                                activityType === 'real'
                                  ? 'text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider'
                                  : actData.real && actData.real !== '-'
                                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                  : 'text-slate-500 dark:text-slate-400 font-medium'
                              }`}>
                                Real
                              </span>
                              <TableDatePicker
                                isReal
                                value={actData.real}
                                onChange={(newDate) => handleUpdateActivityDate(land.id, actKey, 'real', newDate)}
                              />
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* 14 Kolom Detail Pengolahan (Bajak Awal s/d Selesai Tanam) */}
                    {APLIKASI_FIELDS.filter((field) => isColumnVisible(field.key)).map((field) => {
                      const isBajakBoundary = field.key === 'ridger' && (snVisibleCount > 0 || tanamVisibleCount > 0);
                      const isSnBoundary = field.key === 'siapTanam' && tanamVisibleCount > 0;
                      const borderClass = isBajakBoundary || isSnBoundary
                        ? 'border-r-2 border-slate-400 dark:border-slate-600'
                        : 'border-r border-slate-200 dark:border-slate-800/60';

                      const isSelected = selectedActivityKeys.includes(field.key) ||
                        (selectedActivityKeys.includes('bajakAwal') && ['bajakAwalMb5Btr', 'bajakAwalMb25', 'bajakAwalMph', 'bajakAwalNardi'].includes(field.key)) ||
                        (selectedActivityKeys.includes('subsoiler') && ['subsoilerSs1', 'subsoilerSs2'].includes(field.key)) ||
                        (selectedActivityKeys.includes('finishingRotary') && ['finishingRotaryFh1', 'finishingRotaryFh2'].includes(field.key)) ||
                        (selectedActivityKeys.includes('rotaryFh2') && field.key === 'finishingRotaryFh2');

                      if (DUAL_DATE_FIELDS.has(field.key)) {
                        const actData = getFieldRencanaReal(land, field.key);
                        const isRencanaMatch = selectedActivityMonths.length > 0 && matchActivityMonth(actData.rencana, selectedActivityMonths);
                        const isRealMatch = selectedActivityMonths.length > 0 && matchActivityMonth(actData.real, selectedActivityMonths);

                        const hasRencValue = actData.rencana && actData.rencana !== '-' && actData.rencana !== '0';
                        const hasRealValue = actData.real && actData.real !== '-' && actData.real !== '0';

                        return (
                          <td
                            key={field.key}
                            onClick={(e) => e.stopPropagation()}
                            className={`py-1.5 px-2 text-center font-mono text-[10px] ${borderClass} border-b border-slate-200 dark:border-slate-800 whitespace-nowrap transition-colors ${field.width} ${
                              isSelected
                                ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-x-2 border-emerald-500 dark:border-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.12)]'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col text-[10px] leading-tight space-y-1">
                              {/* Baris 1: Rencana & Tanggal */}
                              <div className={`flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors ${
                                activityType === 'real' ? 'opacity-75 hover:opacity-100' : ''
                              } ${
                                isRencanaMatch
                                  ? 'bg-emerald-300 dark:bg-emerald-700 text-emerald-950 dark:text-white font-bold ring-1.5 ring-emerald-500 shadow-xs'
                                  : activityType === 'rencana'
                                  ? hasRencValue
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-400 dark:border-emerald-500 ring-1.5 ring-emerald-500/40 shadow-xs'
                                    : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-slate-500 dark:text-slate-400 border border-dashed border-emerald-300/60 dark:border-emerald-800/60'
                                  : isSelected
                                  ? 'bg-emerald-100/90 dark:bg-emerald-900/50 font-semibold border border-emerald-300/60 dark:border-emerald-700/60'
                                  : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                              }`}>
                                <span className={`text-[9px] font-sans transition-colors ${
                                  activityType === 'rencana'
                                    ? 'text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider'
                                    : 'text-slate-500 dark:text-slate-400 font-medium'
                                }`}>
                                  Rencana
                                </span>
                                <TableDatePicker
                                  value={actData.rencana}
                                  onChange={(newDate) => handleUpdatePengolahanRencReal(land.id, field.key, 'rencana', newDate)}
                                />
                              </div>

                              {/* Garis Pemisah Antara Rencana dan Real */}
                              <div className="w-full border-t border-slate-200 dark:border-slate-800/80 my-0.5" />

                              {/* Baris 2: Real & Tanggal */}
                              <div className={`flex items-center justify-between gap-1.5 py-0.5 px-1 rounded transition-colors ${
                                activityType === 'rencana' ? 'opacity-75 hover:opacity-100' : ''
                              } ${
                                isRealMatch
                                  ? 'bg-emerald-300 dark:bg-emerald-700 text-emerald-950 dark:text-white font-bold ring-1.5 ring-emerald-500 shadow-xs'
                                  : activityType === 'real'
                                  ? hasRealValue
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-400 dark:border-emerald-500 ring-1.5 ring-emerald-500/40 shadow-xs'
                                    : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-slate-500 dark:text-slate-400 border border-dashed border-emerald-300/60 dark:border-emerald-800/60'
                                  : isSelected
                                  ? 'bg-emerald-100/90 dark:bg-emerald-900/50 font-semibold border border-emerald-300/60 dark:border-emerald-700/60'
                                  : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                              }`}>
                                <span className={`text-[9px] font-sans transition-colors ${
                                  activityType === 'real'
                                    ? 'text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider'
                                    : hasRealValue
                                    ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                    : 'text-slate-500 dark:text-slate-400 font-medium'
                                }`}>
                                  Real
                                </span>
                                <TableDatePicker
                                  isReal
                                  value={actData.real}
                                  onChange={(newDate) => handleUpdatePengolahanRencReal(land.id, field.key, 'real', newDate)}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      }

                      const val = land[field.key] || land.aplikasiDetails?.[field.key];
                      const isFieldMonthMatch = selectedActivityMonths.length > 0 && matchActivityMonth(val, selectedActivityMonths);
                      const isActTypeHighlighted = (activityType === 'rencana' || activityType === 'real') && (field.key === 'prosesTanam' || field.key === 'selesaiTanam') && val && val !== '-';

                      return (
                        <td
                          key={field.key}
                          onClick={(e) => e.stopPropagation()}
                          className={`py-2 px-2 text-center font-mono text-[10px] ${borderClass} border-b border-slate-200 dark:border-slate-800/60 whitespace-nowrap transition-colors ${field.width} ${
                            isSelected
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-x-2 border-emerald-500 dark:border-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.12)]'
                              : ''
                          }`}
                        >
                          <div className={`flex items-center justify-center rounded px-1 py-0.5 transition-colors ${
                            isFieldMonthMatch
                              ? 'bg-emerald-300 dark:bg-emerald-700 text-emerald-950 dark:text-white ring-2 ring-emerald-500 font-bold shadow-xs'
                              : isActTypeHighlighted
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 font-bold border border-emerald-400 dark:border-emerald-500 ring-1.5 ring-emerald-500/40 shadow-xs'
                              : isSelected
                              ? 'bg-emerald-100/90 dark:bg-emerald-900/50 font-semibold border border-emerald-300/60 dark:border-emerald-700/60'
                              : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                          }`}>
                            <TableDatePicker
                              value={val}
                              onChange={(newDate) => handleUpdatePengolahan(land.id, field.key, newDate)}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Tampilkan per halaman:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="15">15</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
          <span className="ml-2">
            Halaman {page} dari {pagination.totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
