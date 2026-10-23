'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  XCircle,
  Sprout,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface AddPlantingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableWilayahs?: string[];
}

const DEFAULT_WILAYAHS = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'];
const JENIS_BIBIT_OPTIONS = ['Crown', 'Sucker'];
const KELAS_BIBIT_OPTIONS = ['Standar', 'Besar', 'Sedang', 'Kecil', 'Extra Kecil'];

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function parseDateInput(str: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!str || str.trim() === '') return null;
  const s = str.trim();
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
  const dashParts = s.split('-');
  if (dashParts.length === 3) {
    const d = parseInt(dashParts[0], 10);
    const m = parseInt(dashParts[1], 10) - 1;
    let y = parseInt(dashParts[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && m >= 0 && m <= 11) {
      return { day: d, month: m, year: y };
    }
  }
  return null;
}

export default function AddPlantingModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPlantingModalProps) {
  const [lokasi, setLokasi] = useState('');
  const [luas, setLuas] = useState('');
  const [jenisBibit, setJenisBibit] = useState('');
  const [kelasBibit, setKelasBibit] = useState('');
  const [awalTanam, setAwalTanam] = useState('');

  // DatePicker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Dropdown state for Jenis Bibit & Kelas Bibit
  const [openDropdown, setOpenDropdown] = useState<'jenis' | 'kelas' | null>(null);
  const jenisRef = useRef<HTMLDivElement>(null);
  const kelasRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close DatePicker & custom dropdowns on click outside
  useEffect(() => {
    if (!isDatePickerOpen && !openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isDatePickerOpen && datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
      if (
        openDropdown === 'jenis' &&
        jenisRef.current &&
        !jenisRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === 'kelas' &&
        kelasRef.current &&
        !kelasRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen, openDropdown]);

  // Sync calendar view month when awalTanam has value
  useEffect(() => {
    const parsed = parseDateInput(awalTanam);
    if (parsed) {
      setCalMonth(parsed.month);
      setCalYear(parsed.year);
    }
  }, [awalTanam]);

  if (!isOpen) return null;

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (dayNum: number) => {
    const dd = String(dayNum).padStart(2, '0');
    const mm = String(calMonth + 1).padStart(2, '0');
    setAwalTanam(`${dd}/${mm}/${calYear}`);
    setIsDatePickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanLokasi = lokasi.trim().toUpperCase();
    if (!cleanLokasi) {
      setError('Lokasi wajib diisi.');
      return;
    }

    const numLuas = parseFloat(luas);
    if (isNaN(numLuas) || numLuas <= 0) {
      setError('Luas harus berupa angka lebih dari 0 Ha.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/planting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lokasi: cleanLokasi,
          luas: numLuas,
          jenisBibit: jenisBibit || null,
          kelasBibit: kelasBibit || null,
          awalTanam: awalTanam.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menambahkan lokasi.');
      }

      // Reset form
      setLokasi('');
      setLuas('');
      setJenisBibit('');
      setKelasBibit('');
      setAwalTanam('');
      setOpenDropdown(null);
      setIsDatePickerOpen(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const parsedCurrent = parseDateInput(awalTanam);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-visible animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 p-5 text-white flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-200 shrink-0">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Tambah Data</h3>
              <p className="text-xs text-emerald-200/90">Monitoring Planting – Real Tanam Nanas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Lokasi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Lokasi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder=""
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    lokasi ? 'pr-9' : ''
                  }`}
                />
                {lokasi && (
                  <button
                    type="button"
                    onClick={() => setLokasi('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-0.5 rounded-full cursor-pointer transition-colors"
                    title="Hapus lokasi"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Luas (Ha) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Luas (Ha) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder=""
                value={luas}
                onChange={(e) => setLuas(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 3. Awal Tanam (Dengan DatePicker) */}
            <div className="relative sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Awal Tanam
              </label>
              <div
                onClick={() => {
                  setIsDatePickerOpen(!isDatePickerOpen);
                  setOpenDropdown(null);
                }}
                className="relative cursor-pointer"
              >
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  readOnly
                  placeholder=""
                  value={awalTanam}
                  className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                />
                {awalTanam && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAwalTanam('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* DatePicker Popover */}
              {isDatePickerOpen && (
                <div
                  ref={datePickerRef}
                  className="absolute left-0 top-full mt-1.5 z-[100] p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-[260px] animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header Month / Year Navigation */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {INDONESIAN_MONTHS[calMonth]} {calYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day Names */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1.5">
                    {DAYS_SHORT.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                      <span key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const isSelected =
                        parsedCurrent &&
                        parsedCurrent.day === dayNum &&
                        parsedCurrent.month === calMonth &&
                        parsedCurrent.year === calYear;
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => handleSelectDate(dayNum)}
                          className={`h-7 w-7 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : 'hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer Quick Action */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setAwalTanam('');
                        setIsDatePickerOpen(false);
                      }}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer font-medium"
                    >
                      Kosongkan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const dd = String(today.getDate()).padStart(2, '0');
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        setAwalTanam(`${dd}/${mm}/${today.getFullYear()}`);
                        setIsDatePickerOpen(false);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Hari Ini
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Jenis Bibit */}
            <div className="relative" ref={jenisRef}>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Jenis Bibit
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown(openDropdown === 'jenis' ? null : 'jenis');
                    setIsDatePickerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer flex items-center justify-between min-h-[38px] text-left transition-all"
                >
                  <span className={jenisBibit ? 'font-medium' : 'text-transparent select-none'}>
                    {jenisBibit || '\u00A0'}
                  </span>
                  <div>
                    {jenisBibit ? (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJenisBibit('');
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-500 rounded-full cursor-pointer transition-colors inline-flex items-center"
                        title="Hapus pilihan"
                      >
                        <XCircle className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                      </span>
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ease-in-out ${
                          openDropdown === 'jenis' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                        }`}
                      />
                    )}
                  </div>
                </button>

                {/* Dropdown Popover */}
                {openDropdown === 'jenis' && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="space-y-0.5">
                      {JENIS_BIBIT_OPTIONS.map((j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => {
                            setJenisBibit(j);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-2 text-xs rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center justify-between ${
                            jenisBibit === j
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{j}</span>
                          {jenisBibit === j && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Kelas Bibit */}
            <div className="relative" ref={kelasRef}>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Kelas Bibit
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdown(openDropdown === 'kelas' ? null : 'kelas');
                    setIsDatePickerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer flex items-center justify-between min-h-[38px] text-left transition-all"
                >
                  <span className={kelasBibit ? 'font-medium' : 'text-transparent select-none'}>
                    {kelasBibit || '\u00A0'}
                  </span>
                  <div>
                    {kelasBibit ? (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setKelasBibit('');
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-500 rounded-full cursor-pointer transition-colors inline-flex items-center"
                        title="Hapus pilihan"
                      >
                        <XCircle className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                      </span>
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ease-in-out ${
                          openDropdown === 'kelas' ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'rotate-0'
                        }`}
                      />
                    )}
                  </div>
                </button>

                {/* Dropdown Popover */}
                {openDropdown === 'kelas' && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto">
                    <div className="space-y-0.5">
                      {KELAS_BIBIT_OPTIONS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setKelasBibit(k);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-2 text-xs rounded-lg text-left font-medium transition-colors cursor-pointer flex items-center justify-between ${
                            kelasBibit === k
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{k}</span>
                          {kelasBibit === k && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
